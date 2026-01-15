#!/usr/bin/env node
/**
 * Org Module Pattern Scanner
 * 
 * Enforces Engineering Ground Rules by scanning for forbidden patterns.
 * 
 * Usage:
 *   npm run org:scan
 * 
 * This script will exit with code 1 if forbidden patterns are found.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INCLUDE_DIRS = [
  "src/app",
  "src/server",
  "prisma",
  "scripts",
  "docs",
];

const FORBIDDEN_PATTERNS = [
  { 
    name: "orgId identifier (use workspaceId instead)", 
    re: /\borgId\b/,
    exclude: [
      // Allow in schema.prisma (has orgId fields that need Phase 1 migration)
      /schema\.prisma$/,
      // Allow in seed files (legacy data setup, will be migrated in Phase 1)
      /prisma\/seed/,
      // Allow in documentation files
      /\.md$/,
      // Allow in this scan script itself (it's checking for this pattern)
      /org-scan\.js$/,
    ]
  },
  { 
    name: "requireActiveOrgId (use requireOrgContext or requireActiveWorkspaceId)", 
    re: /\brequireActiveOrgId\b/,
    exclude: [
      // Allow in documentation files (they explain what NOT to do)
      /\.md$/,
      // Allow in scan script itself (it's scanning for this pattern)
      /org-scan\.js$/,
    ]
  },
  { 
    name: "OrgMembership model usage (use WorkspaceMember instead)", 
    re: /\bOrgMembership\b/,
    exclude: [/\.md$/, /schema\.prisma$/], // Allow in schema and docs
  },
  { 
    name: "Org model usage (deprecated, use Workspace)", 
    re: /\bOrg\b/,
    exclude: [
      /\.md$/,
      /schema\.prisma$/,
      // Allow "Org" in context like "OrgModule", "OrgDepartment", etc.
      /Org[A-Z]/,
      /org[A-Z]/,
      /org-/,
      /org_/,
    ],
  },
  { 
    name: "legacy SavedView usage (use OrgSavedView instead)", 
    re: /\bSavedView\b/,
    exclude: [
      /OrgSavedView/,
      /orgSavedView/,
      /\.md$/,
      /schema\.prisma$/,
    ],
  },
  { 
    name: "Server Actions (\"use server\") in Org paths", 
    re: /"use server"|\'use server\'/,
    // Only check in org-related paths
    includeOnly: [/org/, /\/api\/org/],
  },
];

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next" || e.name === "dist" || e.name === ".git") continue;
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

function shouldInclude(filePath) {
  const rel = path.relative(ROOT, filePath);
  return INCLUDE_DIRS.some((d) => rel.startsWith(d + path.sep));
}

function isTextFile(filePath) {
  return /\.(ts|tsx|js|jsx|json|md|prisma)$/.test(filePath);
}

const allFiles = walk(ROOT).filter(shouldInclude).filter(isTextFile);

let failed = false;
const hits = [];

for (const file of allFiles) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, "utf8");

  for (const pattern of FORBIDDEN_PATTERNS) {
    // Skip if file matches exclude patterns
    if (pattern.exclude && pattern.exclude.some(re => re.test(file))) {
      continue;
    }

    // Only check if file matches includeOnly patterns (if specified)
    if (pattern.includeOnly && !pattern.includeOnly.some(re => re.test(file))) {
      continue;
    }

    // Skip documentation files entirely for these patterns (they explain what NOT to do)
    if (pattern.exclude && pattern.exclude.some(re => re.test(file))) {
      continue;
    }

    if (pattern.re.test(content)) {
      // For .md files, allow mentions in forbidden/not allowed contexts
      if (file.endsWith('.md')) {
        const isForbiddenContext = content.includes('Forbidden') || 
                                   content.includes('forbidden') ||
                                   content.includes('❌') ||
                                   content.includes('do not') ||
                                   content.includes('Do NOT') ||
                                   content.includes('do NOT') ||
                                   content.includes('deprecated') ||
                                   content.includes('legacy');
        if (isForbiddenContext) {
          continue; // Documentation explaining what not to do
        }
      }

      // Check if match is in a comment (basic check)
      const lines = content.split('\n');
      let lineNum = 1;
      for (const line of lines) {
        if (pattern.re.test(line)) {
          // Allow if it's clearly a comment explaining legacy/deprecated
          const trimmed = line.trim();
          const isComment = trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
          const isDocComment = trimmed.includes('deprecated') || trimmed.includes('legacy') || trimmed.includes('TODO: remove') || trimmed.includes('Forbidden');
          
          if (!isComment || !isDocComment) {
            hits.push({ rel, name: pattern.name, line: lineNum });
            failed = true;
          }
        }
        lineNum++;
      }
    }
  }
}

if (failed) {
  console.error("\n❌ ORG SCAN FAILED: Forbidden patterns found:");
  console.error("=".repeat(80));
  const grouped = {};
  for (const h of hits) {
    if (!grouped[h.name]) grouped[h.name] = [];
    grouped[h.name].push(h);
  }
  for (const [patternName, files] of Object.entries(grouped)) {
    console.error(`\n${patternName}:`);
    for (const h of files) {
      console.error(`  - ${h.rel}${h.line ? `:${h.line}` : ''}`);
    }
  }
  console.error("\n" + "=".repeat(80));
  console.error("\nPlease fix these violations before proceeding.");
  console.error("See docs/ORG_ENGINEERING_GROUND_RULES.md for details.\n");
  process.exit(1);
} else {
  console.log("✅ ORG SCAN PASSED: No forbidden patterns found in scanned paths.");
  console.log("See docs/ORG_ENGINEERING_GROUND_RULES.md for enforced rules.\n");
}

