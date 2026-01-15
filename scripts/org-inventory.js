const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Only scan these source areas (fast + relevant)
const SCAN_DIRS = [
  "src/app/org",
  "src/app/api/org",
  "src/components/org",
  "src/server/org",
  "prisma",
  "docs",
];

const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".git",
]);

const TEXT_EXT_RE = /\.(ts|tsx|js|jsx|json|md|prisma)$/i;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replaceAll("\\", "/");
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function lineHits(content, re) {
  const lines = content.split("\n");
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) hits.push(i + 1);
  }
  return hits;
}

function safeMkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function isApiRouteFile(r) {
  return r.startsWith("src/app/api/org/") && r.endsWith("/route.ts");
}

function isOrgPageFile(r) {
  return r.startsWith("src/app/org/") && r.endsWith("/page.tsx");
}

function isOrgLayoutFile(r) {
  return r.startsWith("src/app/org/") && r.endsWith("/layout.tsx");
}

function routeFromAppFile(r) {
  // src/app/org/people/page.tsx -> /org/people
  // src/app/org/page.tsx -> /org
  const noPrefix = r.replace(/^src\/app\//, "");
  const noFile = noPrefix.replace(/\/(page|layout)\.tsx$/, "");
  return "/" + noFile;
}

// ---------- Pattern Sets (Ground-Rules Oriented) ----------
const forbidden = [
  { id: "FORBIDDEN_ORGID", label: "Forbidden: orgId identifier", re: /\borgId\b/ },
  { id: "FORBIDDEN_REQUIRE_ACTIVE_ORGID", label: "Forbidden: requireActiveOrgId", re: /\brequireActiveOrgId\b/ },
  { id: "FORBIDDEN_SERVER_ACTIONS", label: "Forbidden: Server Actions ('use server')", re: /(^|\n)\s*["']use server["'];?\s*(\n|$)/ },
  { id: "FORBIDDEN_DEPRECATED_ORG_MODEL", label: "Forbidden: deprecated Org model usage", re: /\bOrg\b/ },
  { id: "FORBIDDEN_DEPRECATED_ORGMEMBERSHIP", label: "Forbidden: deprecated OrgMembership usage", re: /\bOrgMembership\b/ },
  { id: "FORBIDDEN_DEPRECATED_SAVEDVIEW", label: "Forbidden: legacy SavedView usage", re: /\bSavedView\b/ },
];

// "Hardcoded / placeholder" heuristics (we want a kill list, not perfect parsing)
const hardcodeSignals = [
  { id: "HC_MOCK_WORDS", label: "Hardcode signal: mock/stub/placeholder keywords", re: /\b(mock|stub|placeholder|hardcoded|fake|sample|demo)\b/i },
  { id: "HC_TODO_FIXME", label: "Hardcode signal: TODO/FIXME", re: /\b(TODO|FIXME)\b/ },
  // Common "seed arrays" in org UIs
  { id: "HC_PEOPLE_ARRAY", label: "Hardcode signal: people array literal", re: /\b(const|let)\s+\w*(people|Persons|People)\w*\s*=\s*\[/ },
  { id: "HC_TEAMS_ARRAY", label: "Hardcode signal: teams array literal", re: /\b(const|let)\s+\w*(teams|Teams)\w*\s*=\s*\[/ },
  { id: "HC_DEPTS_ARRAY", label: "Hardcode signal: departments array literal", re: /\b(const|let)\s+\w*(departments|Depts|Departments)\w*\s*=\s*\[/ },
  { id: "HC_OWNERSHIP_ARRAY", label: "Hardcode signal: ownership array literal", re: /\b(const|let)\s+\w*(ownership|Owners|Owner)\w*\s*=\s*\[/ },
];

// Architecture violations
const archSignals = [
  // Prisma usage in UI paths is forbidden by ground rules
  { id: "ARCH_PRISMA_IN_UI", label: "Violation: Prisma referenced in UI/org components", re: /\bprisma\b|\bPrismaClient\b/ },
  // UI importing server modules is a common smell
  { id: "ARCH_SERVER_IMPORT_IN_UI", label: "Violation: UI imports from src/server/*", re: /from\s+["']@\/server\/[^"']+["']/ },
];

// Auth/scoping checks for API routes (static checks)
const apiAuthRequired = [
  { id: "API_AUTH_GETUNIFIEDAUTH", label: "Missing required: getUnifiedAuth(request)", re: /\bgetUnifiedAuth\s*\(/ },
  { id: "API_AUTH_ASSERTACCESS", label: "Missing required: assertAccess(...)", re: /\bassertAccess\s*\(/ },
  { id: "API_AUTH_SETWORKSPACE", label: "Missing required: setWorkspaceContext(workspaceId)", re: /\bsetWorkspaceContext\s*\(/ },
];

const workspaceIdFromRequestForbidden = [
  { id: "WS_FROM_PARAMS", label: "Forbidden: workspaceId read from params", re: /\bparams\.workspaceId\b/ },
  { id: "WS_FROM_SEARCHPARAMS", label: "Forbidden: workspaceId read from searchParams", re: /\bsearchParams\.get\(\s*["']workspaceId["']\s*\)/ },
  { id: "WS_FROM_QUERY", label: "Forbidden: workspaceId read from query", re: /\bquery\.workspaceId\b/ },
  { id: "WS_FROM_BODY", label: "Forbidden: workspaceId read from body/json", re: /\bworkspaceId\b.*=\s*.*request\.json\(\)|\bworkspaceId\b.*:\s*.*request\.json\(\)|\bbody\.workspaceId\b/ },
];

// Detect whether a page seems API-backed vs hardcoded (very rough)
function pageDataSource(content) {
  const usesApi =
    /fetch\(\s*["'`]\/api\/org\//.test(content) ||
    /\/api\/org\//.test(content) ||
    /\buseSWR\b/.test(content) ||
    /\baxios\b/.test(content);

  const looksHardcoded =
    hardcodeSignals.some((s) => s.re.test(content)) ||
    /\bconst\s+\w+\s*=\s*\[\s*{/.test(content);

  if (usesApi && !looksHardcoded) return "API-backed (likely)";
  if (usesApi && looksHardcoded) return "Mixed (API + hardcoded signals)";
  if (!usesApi && looksHardcoded) return "Hardcoded / placeholder (likely)";
  return "Unknown (needs manual review)";
}

function main() {
  const files = [];
  for (const d of SCAN_DIRS) {
    const abs = path.join(ROOT, d);
    files.push(...walk(abs));
  }

  const textFiles = files
    .filter((p) => TEXT_EXT_RE.test(p))
    .map((p) => ({ abs: p, rel: rel(p) }));

  const findings = {
    meta: {
      generatedAt: new Date().toISOString(),
      scannedDirs: SCAN_DIRS,
      fileCount: textFiles.length,
    },
    pages: [],
    apiRoutes: [],
    violations: [],
    hardcode: [],
    notes: [],
  };

  // Build page list + route list
  for (const f of textFiles) {
    if (isOrgPageFile(f.rel)) findings.pages.push({ file: f.rel, route: routeFromAppFile(f.rel) });
  }

  // Analyze files
  for (const f of textFiles) {
    const content = readText(f.abs);

    // Forbidden patterns (global)
    for (const rule of forbidden) {
      if (rule.re.test(content)) {
        findings.violations.push({
          kind: rule.id,
          label: rule.label,
          file: f.rel,
          lines: lineHits(content, rule.re).slice(0, 50),
        });
      }
    }

    // Hardcode signals (org-only-ish)
    if (
      f.rel.startsWith("src/app/org/") ||
      f.rel.startsWith("src/components/org/") ||
      f.rel.startsWith("src/server/org/")
    ) {
      for (const sig of hardcodeSignals) {
        if (sig.re.test(content)) {
          findings.hardcode.push({
            kind: sig.id,
            label: sig.label,
            file: f.rel,
            lines: lineHits(content, sig.re).slice(0, 50),
          });
        }
      }
    }

    // Architecture checks (Prisma in UI)
    const isUiPath =
      f.rel.startsWith("src/app/org/") ||
      f.rel.startsWith("src/components/org/");

    if (isUiPath) {
      for (const sig of archSignals) {
        if (sig.re.test(content)) {
          findings.violations.push({
            kind: sig.id,
            label: sig.label,
            file: f.rel,
            lines: lineHits(content, sig.re).slice(0, 50),
          });
        }
      }
    }

    // API route checks
    if (isApiRouteFile(f.rel)) {
      const route = "/" + f.rel
        .replace(/^src\/app\/api\//, "api/")
        .replace(/\/route\.ts$/, "");

      const missing = [];
      for (const req of apiAuthRequired) {
        if (!req.re.test(content)) missing.push(req.label);
      }

      const wsForbiddenHits = [];
      for (const forb of workspaceIdFromRequestForbidden) {
        if (forb.re.test(content)) wsForbiddenHits.push(forb.label);
      }

      findings.apiRoutes.push({
        file: f.rel,
        route,
        auth: {
          missing,
          hasAllRequired: missing.length === 0,
        },
        workspaceIdIntake: {
          forbiddenReads: wsForbiddenHits,
          ok: wsForbiddenHits.length === 0,
        },
      });
    }
  }

  // Enrich pages with a rough "data source" label
  const pageIndex = new Map(findings.pages.map((p) => [p.file, p]));
  for (const f of textFiles) {
    if (pageIndex.has(f.rel)) {
      const content = readText(f.abs);
      pageIndex.get(f.rel).dataSource = pageDataSource(content);
    }
  }

  // Produce markdown report
  const reportDir = path.join(ROOT, "docs", "org");
  safeMkdirp(reportDir);
  const mdPath = path.join(reportDir, "current-state-report.md");
  const jsonPath = path.join(reportDir, "current-state-report.json");

  const md = [];
  md.push("# Org Current State Report (Phase 1 – Step 1.1)");
  md.push("");
  md.push(`Generated: ${findings.meta.generatedAt}`);
  md.push("");
  md.push("## Executive Summary");
  md.push("");
  md.push(`- Files scanned: ${findings.meta.fileCount}`);
  md.push(`- Org pages detected: ${findings.pages.length}`);
  md.push(`- Org API routes detected: ${findings.apiRoutes.length}`);
  md.push(`- Violations detected: ${findings.violations.length}`);
  md.push(`- Hardcode/placeholder signals: ${findings.hardcode.length}`);
  md.push("");
  md.push("## MVP Questions Coverage (Trimmed UI Intent)");
  md.push("");
  md.push("Current MVP intent covers:");
  md.push("- Who is in the org?");
  md.push("- Where do they sit?");
  md.push("- Who owns what?");
  md.push("- Who reports to whom?");
  md.push("");
  md.push("Missing from original core set (must be addressed for MVP-ready):");
  md.push("- Who is available / overloaded? (minimal, honest inputs + states)");
  md.push("");
  md.push("## Org Pages Inventory");
  md.push("");
  md.push("| Route | File | Data Source (heuristic) |");
  md.push("|------|------|--------------------------|");
  for (const p of findings.pages.sort((a, b) => a.route.localeCompare(b.route))) {
    md.push(`| ${p.route} | ${p.file} | ${p.dataSource || "Unknown"} |`);
  }
  md.push("");
  md.push("## Org API Routes Inventory");
  md.push("");
  md.push("| Route | File | Auth Pattern OK | workspaceId Intake OK | Missing Auth Pieces | Forbidden workspaceId Reads |");
  md.push("|------|------|------------------|------------------------|----------------------|----------------------------|");
  for (const r of findings.apiRoutes.sort((a, b) => a.route.localeCompare(b.route))) {
    md.push(
      `| ${r.route} | ${r.file} | ${r.auth.hasAllRequired ? "Yes" : "No"} | ${r.workspaceIdIntake.ok ? "Yes" : "No"} | ${r.auth.missing.length ? r.auth.missing.join("; ") : "-"} | ${r.workspaceIdIntake.forbiddenReads.length ? r.workspaceIdIntake.forbiddenReads.join("; ") : "-"} |`
    );
  }
  md.push("");
  md.push("## Ground Rules Violations (Must Fix)");
  md.push("");
  if (findings.violations.length === 0) {
    md.push("- None detected by static scan (still do a manual spot-check).");
  } else {
    for (const v of findings.violations) {
      md.push(`- ${v.label} — ${v.file}${v.lines?.length ? ` (lines: ${v.lines.join(", ")})` : ""}`);
    }
  }
  md.push("");
  md.push("## Hardcoded / Placeholder Signals (Kill List Candidates)");
  md.push("");
  if (findings.hardcode.length === 0) {
    md.push("- None detected by heuristics (still do a manual review).");
  } else {
    for (const h of findings.hardcode) {
      md.push(`- ${h.label} — ${h.file}${h.lines?.length ? ` (lines: ${h.lines.join(", ")})` : ""}`);
    }
  }
  md.push("");
  md.push("## Recommended Next Actions");
  md.push("");
  md.push("1) Phase 1.2 — Schema truth: confirm required tables exist; add migrations where missing (no defensive fallbacks).");
  md.push("2) Phase 1.3/1.4 — API route backbone: ensure all /api/org routes follow getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma.");
  md.push("3) Phase 1.5 — UI wiring: remove remaining hardcoded data; UI reads via /api/org only.");
  md.push("4) Phase 2 — Add minimal availability inputs/states to satisfy the missing MVP question.");
  md.push("");

  fs.writeFileSync(mdPath, md.join("\n"), "utf8");
  fs.writeFileSync(jsonPath, JSON.stringify(findings, null, 2), "utf8");

  console.log("Org inventory complete.");
  console.log(`- Markdown report: ${rel(mdPath)}`);
  console.log(`- JSON report: ${rel(jsonPath)}`);
}

main();

