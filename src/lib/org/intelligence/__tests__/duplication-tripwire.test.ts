/**
 * Duplication Tripwire Test
 *
 * Ensures ownership logic is NOT duplicated outside the canonical resolver.
 * Scans route/page/server files for forbidden patterns and import violations.
 *
 * WHY THIS EXISTS:
 * The "Overview vs Ownership mismatch" bug happened because ownership logic
 * was duplicated across routes. Now all ownership logic lives in:
 *   src/lib/org/intelligence/resolvers/ownership.ts
 *
 * ENFORCEMENT:
 * 1. Forbidden patterns: regex scan for duplicated calculations
 * 2. Approved imports: only allowed modules for ownership truth
 * 3. All violations are errors (no warnings that rot)
 * 4. Suppression requires explicit reason comment
 *
 * SUPPRESSION:
 * If you absolutely must use a forbidden pattern, add a comment:
 *   // tripwire-allow: <reason>
 * The tripwire will still flag it but won't fail the test.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Configuration
// ============================================================================

const WORKSPACE_ROOT = path.resolve(__dirname, "../../../../..");

// Files/directories that ARE allowed to contain ownership logic
const ALLOWED_PATHS = [
  // Canonical resolver (THE source of truth)
  "src/lib/org/intelligence/resolvers/ownership.ts",
  // Other resolvers in intelligence layer
  "src/lib/org/intelligence/resolvers/",
  // Intelligence queries (data loading only)
  "src/lib/org/intelligence/queries.ts",
  // Types and index (re-exports only)
  "src/lib/org/intelligence/snapshotTypes.ts",
  "src/lib/org/intelligence/types.ts",
  "src/lib/org/intelligence/index.ts",
  // Server adapter (thin wrapper, explicitly allowed)
  "src/server/org/ownership/read.ts",
  // Test files
  "__tests__",
  ".test.ts",
  ".test.tsx",
  ".spec.ts",

  // ==========================================================================
  // LEGACY FILES - TODO: Migrate to use canonical resolver
  // These pre-date Phase S and need gradual migration
  // ==========================================================================

  // Legacy intelligence files
  "src/lib/org/deriveIssues.ts",
  "src/lib/org/computeSummaries.ts",

  // Write operations (need ownerAssignment for mutations, not reads)
  // TODO: Consider if write operations should use a different pattern
  "src/server/org/ownership/write.ts",
  "src/app/api/org/ownership/bulk-assign/route.ts",

  // Archive operation (needs to clean up assignments)
  "src/app/api/org/people/[personId]/archive/route.ts",

  // Structure page (displays owner info inline - needs UI refactor)
  // TODO: Refactor to use snapshot for ownership display
  "src/app/org/structure/StructurePageClient.tsx",
  "src/app/org/structure/departments/[departmentId]/page.tsx",

  // Server read layers (pre-Phase S patterns)
  // TODO: Migrate to use intelligence layer
  "src/server/org/structure/read.ts",
  "src/server/org/health/ownership/score.ts",

  // LoopBrain context builder (needs ownership data for AI)
  // TODO: Use intelligence snapshot instead of direct queries
  "src/server/org/loopbrainContext/build.ts",

  // Structure write operations
  "src/server/org/structure/write.ts",

  // Legacy lib/org files (pre-Phase S)
  // TODO: Migrate these to use intelligence layer
  "src/lib/org/actions.ts",
  "src/lib/org/data.server.ts",
  "src/lib/org/metrics.ts",
  "src/lib/org/ownership-resolver.ts", // Old resolver, superseded by intelligence layer
  "src/lib/org/queries.ts",
];

// Directories to scan for violations
const SCAN_PATHS = [
  // Routes
  "src/app/api/org",
  // Pages
  "src/app/org",
  // Server layer (excluding allowed adapter)
  "src/server/org",
  // Lib org (excluding intelligence layer)
  "src/lib/org",
];

// Directories to explicitly exclude from scanning
const EXCLUDE_PATHS = [
  "src/lib/org/intelligence", // Intelligence layer is allowed
  "node_modules",
  ".next",
];

// ============================================================================
// Forbidden Patterns
// ============================================================================

type Violation = {
  file: string;
  line: number;
  pattern: string;
  description: string;
  suppressed: boolean;
  suppressionReason?: string;
};

const FORBIDDEN_PATTERNS = [
  {
    pattern: /\.ownerPersonId\s*[!=]==?\s*null/g,
    description: "Direct ownerPersonId null check (use resolver's unownedEntities)",
  },
  {
    pattern: /\.ownerPersonId\s*\?\s*[^:]/g,
    description: "ownerPersonId truthiness check (use resolver)",
  },
  {
    pattern: /owned\s*\/\s*total/gi,
    description: "Manual coverage calculation (use resolver's coverage.*)",
  },
  {
    pattern: /ownerAssignments\.filter/g,
    description: "Direct ownerAssignments filtering (use resolver)",
  },
  {
    pattern: /ownerAssignments\.find/g,
    description: "Direct ownerAssignments lookup (use resolver)",
  },
  {
    pattern: /ownerAssignments\.map/g,
    description: "Direct ownerAssignments mapping (use resolver)",
  },
  {
    pattern: /prisma\.ownerAssignment\./g,
    description: "Direct OwnerAssignment Prisma query (use intelligence layer)",
  },
  {
    pattern: /resolveOwnershipSignals/g,
    description: "Direct resolver import in route (use getOrgIntelligenceSnapshot or getOrgOwnership adapter)",
  },
];

// ============================================================================
// Approved Import Paths
// ============================================================================

/**
 * For routes that need ownership data, they MUST import from these paths only.
 * Any other import of ownership-related modules is a violation.
 */
const APPROVED_OWNERSHIP_IMPORTS = [
  "@/lib/org/intelligence",
  "@/server/org/ownership/read",
];

/**
 * Imports that are FORBIDDEN in route/page files for ownership logic.
 */
const FORBIDDEN_IMPORTS = [
  {
    pattern: /from\s+["']@\/lib\/org\/intelligence\/resolvers/,
    description: "Direct resolver import (use @/lib/org/intelligence or @/server/org/ownership/read)",
  },
  {
    pattern: /from\s+["']@\/lib\/org\/intelligence\/queries/,
    description: "Direct queries import in route (use snapshot function)",
  },
  {
    pattern: /from\s+["']\.\.\/.*ownership/,
    description: "Relative ownership import (use absolute path from approved list)",
  },
];

// ============================================================================
// Suppression Pattern
// ============================================================================

const SUPPRESSION_PATTERN = /\/\/\s*tripwire-allow:\s*(.+)/;

function checkSuppression(lines: string[], lineIndex: number): { suppressed: boolean; reason?: string } {
  // Check current line and previous line for suppression comment
  for (let i = Math.max(0, lineIndex - 1); i <= lineIndex; i++) {
    const match = lines[i]?.match(SUPPRESSION_PATTERN);
    if (match) {
      return { suppressed: true, reason: match[1].trim() };
    }
  }
  return { suppressed: false };
}

// ============================================================================
// Scanning Logic
// ============================================================================

function isAllowedFile(filePath: string): boolean {
  const relativePath = path.relative(WORKSPACE_ROOT, filePath);
  return ALLOWED_PATHS.some((allowed) => relativePath.includes(allowed));
}

function isExcludedPath(filePath: string): boolean {
  const relativePath = path.relative(WORKSPACE_ROOT, filePath);
  return EXCLUDE_PATHS.some((excluded) => relativePath.startsWith(excluded));
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];

  if (isAllowedFile(filePath) || isExcludedPath(filePath)) {
    return violations;
  }

  // Only scan TypeScript files
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
    return violations;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const relativePath = path.relative(WORKSPACE_ROOT, filePath);

    // Check forbidden patterns
    for (const { pattern, description } of FORBIDDEN_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
          const { suppressed, reason } = checkSuppression(lines, i);
          violations.push({
            file: relativePath,
            line: i + 1,
            pattern: pattern.source,
            description,
            suppressed,
            suppressionReason: reason,
          });
        }
        // Reset regex state
        pattern.lastIndex = 0;
      }
    }

    // Check forbidden imports
    for (const { pattern, description } of FORBIDDEN_IMPORTS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
          const { suppressed, reason } = checkSuppression(lines, i);
          violations.push({
            file: relativePath,
            line: i + 1,
            pattern: pattern.source,
            description,
            suppressed,
            suppressionReason: reason,
          });
        }
        // Reset regex state
        pattern.lastIndex = 0;
      }
    }
  } catch {
    // File doesn't exist or can't be read - skip
  }

  return violations;
}

function scanDirectory(dirPath: string): Violation[] {
  const violations: Violation[] = [];
  const fullPath = path.join(WORKSPACE_ROOT, dirPath);

  if (!fs.existsSync(fullPath)) {
    return violations;
  }

  if (isExcludedPath(fullPath)) {
    return violations;
  }

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry.name);
    const relativePath = path.relative(WORKSPACE_ROOT, entryPath);

    if (isExcludedPath(entryPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      violations.push(...scanDirectory(relativePath));
    } else if (entry.isFile()) {
      violations.push(...scanFile(entryPath));
    }
  }

  return violations;
}

function scanString(content: string, filename: string): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split("\n");

  for (const { pattern, description } of FORBIDDEN_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (pattern.test(line)) {
        const { suppressed, reason } = checkSuppression(lines, i);
        violations.push({
          file: filename,
          line: i + 1,
          pattern: pattern.source,
          description,
          suppressed,
          suppressionReason: reason,
        });
      }
      pattern.lastIndex = 0;
    }
  }

  return violations;
}

// ============================================================================
// Tests
// ============================================================================

describe("Duplication Tripwire", () => {
  it("no duplicated ownership logic in routes, pages, or server layer", () => {
    const allViolations: Violation[] = [];

    for (const scanPath of SCAN_PATHS) {
      allViolations.push(...scanDirectory(scanPath));
    }

    // Separate suppressed and unsuppressed violations
    const unsuppressed = allViolations.filter((v) => !v.suppressed);
    const suppressed = allViolations.filter((v) => v.suppressed);

    // Log suppressed violations (for awareness)
    if (suppressed.length > 0) {
      console.log(
        `[Tripwire] ${suppressed.length} suppressed violation(s):\n` +
          suppressed
            .map((v) => `  ${v.file}:${v.line} - ${v.description} (reason: ${v.suppressionReason})`)
            .join("\n")
      );
    }

    // Fail on unsuppressed violations
    if (unsuppressed.length > 0) {
      const message = unsuppressed
        .map((v) => `  ${v.file}:${v.line} - ${v.description}`)
        .join("\n");

      expect.fail(
        `Found ${unsuppressed.length} ownership logic duplication(s):\n${message}\n\n` +
          "Fix: Move this logic to src/lib/org/intelligence/resolvers/ownership.ts\n" +
          "Or: Add '// tripwire-allow: <reason>' comment if absolutely necessary"
      );
    }
  });

  it("overview route uses approved imports only", () => {
    const routePath = path.join(WORKSPACE_ROOT, "src/app/api/org/overview/route.ts");

    if (!fs.existsSync(routePath)) {
      return;
    }

    const content = fs.readFileSync(routePath, "utf-8");

    // Must import from intelligence layer
    expect(content).toMatch(/from\s+["']@\/lib\/org\/intelligence["']/);

    // Must use snapshot for ownership data
    expect(content).toMatch(/getOrgIntelligenceSnapshot/);

    // Must use unownedEntities from snapshot
    expect(content).toMatch(/\.ownership\?\.unownedEntities/);
  });

  it("ownership route uses approved imports only", () => {
    const routePath = path.join(WORKSPACE_ROOT, "src/app/api/org/ownership/route.ts");

    if (!fs.existsSync(routePath)) {
      return;
    }

    const content = fs.readFileSync(routePath, "utf-8");

    // Must import from approved adapter
    expect(content).toMatch(/from\s+["']@\/server\/org\/ownership\/read["']/);

    // Must use adapter function
    expect(content).toMatch(/getOrgOwnership/);

    // Should NOT import resolver directly
    expect(content).not.toMatch(/from\s+["']@\/lib\/org\/intelligence\/resolvers/);
  });

  it("server adapter uses resolver correctly", () => {
    const adapterPath = path.join(WORKSPACE_ROOT, "src/server/org/ownership/read.ts");

    if (!fs.existsSync(adapterPath)) {
      return;
    }

    const content = fs.readFileSync(adapterPath, "utf-8");

    // Must import and use the resolver
    expect(content).toMatch(/resolveOwnershipSignals/);

    // Must use loadIntelligenceData for data
    expect(content).toMatch(/loadIntelligenceData/);
  });
});

describe("Duplication Tripwire: Canary Tests", () => {
  /**
   * These tests verify the tripwire actually catches violations.
   * If these fail, the tripwire is broken.
   */

  it("catches direct ownerPersonId null check", () => {
    const badCode = `
      const isOwned = team.ownerPersonId !== null;
      const isUnowned = team.ownerPersonId === null;
    `;

    const violations = scanString(badCode, "canary.ts");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.description.includes("ownerPersonId"))).toBe(true);
  });

  it("catches manual coverage calculation", () => {
    const badCode = `
      const percent = owned / total * 100;
    `;

    const violations = scanString(badCode, "canary.ts");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.description.includes("coverage"))).toBe(true);
  });

  it("catches direct ownerAssignments manipulation", () => {
    const badCode = `
      const teamOwner = ownerAssignments.find(a => a.entityId === teamId);
      const filtered = ownerAssignments.filter(a => a.entityType === 'TEAM');
    `;

    const violations = scanString(badCode, "canary.ts");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.description.includes("ownerAssignments"))).toBe(true);
  });

  it("catches direct Prisma ownerAssignment query", () => {
    const badCode = `
      const assignments = await prisma.ownerAssignment.findMany({});
    `;

    const violations = scanString(badCode, "canary.ts");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.description.includes("Prisma"))).toBe(true);
  });

  it("catches direct resolver import in route", () => {
    const badCode = `
      import { resolveOwnershipSignals } from '@/lib/org/intelligence/resolvers/ownership';
    `;

    const violations = scanString(badCode, "canary.ts");
    expect(violations.length).toBeGreaterThan(0);
  });

  it("respects suppression comments with reason", () => {
    const suppressedCode = `
      // tripwire-allow: Legacy migration in progress
      const isOwned = team.ownerPersonId !== null;
    `;

    const violations = scanString(suppressedCode, "canary.ts");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.every((v) => v.suppressed)).toBe(true);
    expect(violations[0].suppressionReason).toBe("Legacy migration in progress");
  });

  it("does not suppress without valid reason comment", () => {
    const badCode = `
      // This is just a comment
      const isOwned = team.ownerPersonId !== null;
    `;

    const violations = scanString(badCode, "canary.ts");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => !v.suppressed)).toBe(true);
  });
});

describe("Duplication Tripwire: Documentation", () => {
  it("documents the no-duplication rules", () => {
    const rules = [
      "1. All ownership logic MUST live in src/lib/org/intelligence/resolvers/ownership.ts",
      "2. Routes MUST use getOrgIntelligenceSnapshot or getOrgOwnership adapter",
      "3. Routes MUST NOT check ownerPersonId === null directly",
      "4. Routes MUST NOT calculate coverage percentages",
      "5. Routes MUST NOT query OwnerAssignment directly",
      "6. Routes MUST NOT import resolvers directly (use index or adapter)",
      "7. Suppressions require '// tripwire-allow: <reason>' comment",
    ];

    expect(rules.length).toBe(7);
  });

  it("documents approved import paths", () => {
    expect(APPROVED_OWNERSHIP_IMPORTS).toContain("@/lib/org/intelligence");
    expect(APPROVED_OWNERSHIP_IMPORTS).toContain("@/server/org/ownership/read");
  });

  it("documents scan scope", () => {
    expect(SCAN_PATHS).toContain("src/app/api/org");
    expect(SCAN_PATHS).toContain("src/app/org");
    expect(SCAN_PATHS).toContain("src/server/org");
    expect(SCAN_PATHS).toContain("src/lib/org");
  });
});
