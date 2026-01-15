/**
 * Org Guard Script
 * 
 * Enforces forbidden patterns in Org codebase.
 * Fails the build if any violations are found.
 * 
 * Rules:
 * - NO orgId anywhere in Org paths
 * - NO Server Actions ('use server') in Org paths
 * - NO Prisma imports in UI layer (src/app/org, src/components/org)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const SCAN_DIRS = [
  "src/app/org",
  "src/components/org",
  "src/app/api/org",
  "src/server/org",
];

const IGNORE_DIRS = new Set(["node_modules", ".next", "dist", "build", "coverage", ".git"]);
const TEXT_EXT_RE = /\.(ts|tsx|js|jsx)$/i;

const RULES = [
  { id: "NO_ORGID", msg: "Found forbidden identifier: orgId", re: /\borgId\b/ },
  { id: "NO_REQUIRE_ACTIVE_ORGID", msg: "Found forbidden function: requireActiveOrgId", re: /\brequireActiveOrgId\b/ },
  { id: "NO_SERVER_ACTIONS", msg: "Found forbidden Server Action directive: 'use server'", re: /(^|\n)\s*["']use server["'];?\s*(\n|$)/ },
  { id: "NO_ORGID_ROUTE_PATH", msg: "Found forbidden route path: /api/org/[orgId]", re: /\/api\/org\/\[orgId\]/ },
  { id: "NO_ORGID_ROUTE_STRING", msg: "Found forbidden route string: /api/org/[orgId]", re: /["']\/api\/org\/\[orgId\]/ },
];

// Prisma-in-UI is forbidden by ground rules:
const PRISMA_IN_UI = [
  { id: "NO_PRISMA_IN_UI", msg: "Prisma referenced in UI layer (org pages/components)", re: /\bprisma\b|\bPrismaClient\b/ },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function main() {
  const files = [];
  for (const d of SCAN_DIRS) files.push(...walk(path.join(ROOT, d)));

  const textFiles = files.filter((f) => TEXT_EXT_RE.test(f));
  const errors = [];

  // Check for forbidden route paths (directory structure)
  const orgIdRouteDir = path.join(ROOT, "src/app/api/org/[orgId]");
  if (fs.existsSync(orgIdRouteDir)) {
    errors.push({ 
      file: "src/app/api/org/[orgId]/", 
      rule: "NO_ORGID_ROUTE_PATH", 
      msg: "Forbidden route directory exists: src/app/api/org/[orgId]/ - remove all legacy orgId routes" 
    });
  }

  for (const f of textFiles) {
    const r = rel(f);
    
    // Skip files in the legacy orgId route directory (they should be deleted)
    if (r.startsWith("src/app/api/org/[orgId]/")) {
      errors.push({ 
        file: r, 
        rule: "NO_ORGID_ROUTE_PATH", 
        msg: "Legacy orgId route file still exists - delete it" 
      });
      continue;
    }
    
    const content = read(f);

    for (const rule of RULES) {
      if (rule.re.test(content)) errors.push({ file: r, rule: rule.id, msg: rule.msg });
    }

    // Prisma-in-UI only for UI paths
    if (r.startsWith("src/app/org/") || r.startsWith("src/components/org/")) {
      for (const rule of PRISMA_IN_UI) {
        if (rule.re.test(content)) errors.push({ file: r, rule: rule.id, msg: rule.msg });
      }
    }
  }

  if (errors.length) {
    console.error("Org guard failed. Fix the following violations:\n");
    for (const e of errors) console.error(`- [${e.rule}] ${e.msg} — ${e.file}`);
    process.exit(1);
  }

  console.log("Org guard passed.");
}

main();

