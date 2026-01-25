/**
 * Duplication Tripwire Tests
 *
 * Scans the reasoning layer for forbidden patterns that would introduce
 * truth logic or violate Phase R purity constraints.
 *
 * FORBIDDEN PATTERNS:
 * - Resolver imports: @/lib/org/intelligence/resolvers
 * - Prisma usage: prisma.
 * - Truth logic: ownerPersonId, ownerAssignments
 * - Network calls: fetch(, axios, superagent, graphql-request
 *
 * ALLOWED IMPORTS:
 * - @/lib/org/intelligence (snapshot types, NOT resolvers)
 * - @/lib/org/reasoning (internal)
 *
 * See docs/org/reasoning-rules.md for rules.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Configuration
// ============================================================================

const SCAN_PATHS = [
  "src/lib/org/reasoning",
  "src/app/api/org/reasoning",
];

const FORBIDDEN_PATTERNS = [
  // Phase S resolver imports (should use snapshot only)
  { pattern: /@\/lib\/org\/intelligence\/resolvers/, name: "resolver-import" },
  { pattern: /from ["']\.\.\/intelligence\/resolvers/, name: "relative-resolver-import" },

  // Prisma usage (no DB access in reasoning layer)
  { pattern: /prisma\./, name: "prisma-usage" },
  { pattern: /from ["']@\/lib\/db["']/, name: "db-import" },

  // Truth logic patterns (should derive from snapshot)
  { pattern: /\.ownerPersonId\b/, name: "owner-person-id" },
  { pattern: /ownerAssignments/, name: "owner-assignments" },

  // Network calls (reasoning is pure, no I/O)
  { pattern: /\bfetch\s*\(/, name: "fetch-call" },
  { pattern: /\baxios\b/, name: "axios" },
  { pattern: /\bsuperagent\b/, name: "superagent" },
  { pattern: /graphql-request/, name: "graphql-request" },
];

// Files explicitly allowed (with TODO for migration)
const ALLOWED_PATHS: string[] = [
  // None yet - this is a clean layer
];

// ============================================================================
// Scanner
// ============================================================================

interface Violation {
  file: string;
  line: number;
  pattern: string;
  content: string;
}

function scanString(content: string): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip suppressed lines
    if (line.includes("tripwire-allow:")) {
      continue;
    }

    for (const { pattern, name } of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: "inline",
          line: i + 1,
          pattern: name,
          content: line.trim().slice(0, 100),
        });
      }
    }
  }

  return violations;
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip suppressed lines
      if (line.includes("tripwire-allow:")) {
        continue;
      }

      for (const { pattern, name } of FORBIDDEN_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({
            file: filePath,
            line: i + 1,
            pattern: name,
            content: line.trim().slice(0, 100),
          });
        }
      }
    }
  } catch {
    // File doesn't exist or can't be read
  }

  return violations;
}

function scanDirectory(dirPath: string): Violation[] {
  const violations: Violation[] = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Skip test files (we're testing the tripwire itself)
      if (entry.name.includes(".test.") || entry.name === "__tests__") {
        continue;
      }

      // Skip allowed paths
      if (ALLOWED_PATHS.some((p) => fullPath.includes(p))) {
        continue;
      }

      if (entry.isDirectory()) {
        violations.push(...scanDirectory(fullPath));
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        violations.push(...scanFile(fullPath));
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return violations;
}

// ============================================================================
// Tests
// ============================================================================

describe("Duplication Tripwire: Canary Tests", () => {
  it("catches resolver imports", () => {
    const bad = `import { resolveOwnershipSignals } from "@/lib/org/intelligence/resolvers"`;
    const violations = scanString(bad);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].pattern).toBe("resolver-import");
  });

  it("catches relative resolver imports", () => {
    const bad = `import { something } from "../intelligence/resolvers/ownership"`;
    const violations = scanString(bad);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].pattern).toBe("relative-resolver-import");
  });

  it("catches prisma usage", () => {
    const bad = `const data = await prisma.ownerAssignment.findMany({})`;
    const violations = scanString(bad);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.pattern === "prisma-usage")).toBe(true);
  });

  it("catches db import", () => {
    const bad = `import { prisma } from "@/lib/db"`;
    const violations = scanString(bad);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].pattern).toBe("db-import");
  });

  it("catches truth logic - ownerPersonId", () => {
    const bad = `const owned = team.ownerPersonId !== null`;
    const violations = scanString(bad);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].pattern).toBe("owner-person-id");
  });

  it("catches truth logic - ownerAssignments", () => {
    const bad = `const assignments = await ownerAssignments.findMany()`;
    const violations = scanString(bad);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].pattern).toBe("owner-assignments");
  });

  it("catches network calls - fetch", () => {
    const bad = `const data = await fetch("/api/something")`;
    const violations = scanString(bad);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].pattern).toBe("fetch-call");
  });

  it("catches network calls - axios", () => {
    const bad = `import axios from "axios"`;
    const violations = scanString(bad);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].pattern).toBe("axios");
  });

  it("catches network calls - superagent", () => {
    const bad = `import superagent from "superagent"`;
    const violations = scanString(bad);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].pattern).toBe("superagent");
  });

  it("catches network calls - graphql-request", () => {
    const bad = `import { request } from "graphql-request"`;
    const violations = scanString(bad);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].pattern).toBe("graphql-request");
  });

  it("allows suppressed lines", () => {
    const good = `const x = fetch("/api/test") // tripwire-allow: needed for docs`;
    const violations = scanString(good);

    expect(violations.length).toBe(0);
  });

  it("allows valid intelligence imports (snapshot types)", () => {
    const good = `import type { OrgIntelligenceSnapshotDTO } from "@/lib/org/intelligence"`;
    const violations = scanString(good);

    expect(violations.length).toBe(0);
  });

  it("allows internal reasoning imports", () => {
    const good = `import { computeOrgRecommendations } from "@/lib/org/reasoning"`;
    const violations = scanString(good);

    expect(violations.length).toBe(0);
  });
});

describe("Duplication Tripwire: Scan Reasoning Layer", () => {
  it("no forbidden patterns in src/lib/org/reasoning", () => {
    const violations = scanDirectory("src/lib/org/reasoning");

    if (violations.length > 0) {
      console.error("TRIPWIRE VIOLATIONS FOUND:");
      for (const v of violations) {
        console.error(`  ${v.file}:${v.line} [${v.pattern}] ${v.content}`);
      }
    }

    expect(violations).toHaveLength(0);
  });

  it("no forbidden patterns in src/app/api/org/reasoning", () => {
    const violations = scanDirectory("src/app/api/org/reasoning");

    if (violations.length > 0) {
      console.error("TRIPWIRE VIOLATIONS FOUND:");
      for (const v of violations) {
        console.error(`  ${v.file}:${v.line} [${v.pattern}] ${v.content}`);
      }
    }

    expect(violations).toHaveLength(0);
  });
});

describe("Duplication Tripwire: Scan Summary", () => {
  it("reports clean scan for all paths", () => {
    let totalViolations = 0;

    for (const scanPath of SCAN_PATHS) {
      const violations = scanDirectory(scanPath);
      totalViolations += violations.length;
    }

    expect(totalViolations).toBe(0);
  });
});
