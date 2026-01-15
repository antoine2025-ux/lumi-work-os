#!/usr/bin/env node
/**
 * Org Context Doc Guard
 * 
 * Fails if context endpoint/builder code changed but contract docs/changelog weren't updated.
 * This prevents accidental contract drift.
 */

const { execSync } = require("child_process");

function diffFiles() {
  try {
    const out = execSync("git diff --name-only origin/main...HEAD", { encoding: "utf8" }).trim();
    return out ? out.split("\n").filter(Boolean) : [];
  } catch (error) {
    // If origin/main doesn't exist or we're not in a git repo, check against HEAD
    // This allows local development
    try {
      const out = execSync("git diff --name-only HEAD~1...HEAD", { encoding: "utf8" }).trim();
      return out ? out.split("\n").filter(Boolean) : [];
    } catch (e) {
      console.warn("Warning: Could not determine git diff. Skipping doc guard.");
      return [];
    }
  }
}

function changed(files, prefixOrExact) {
  return files.some((f) => f === prefixOrExact || f.startsWith(prefixOrExact));
}

function main() {
  const files = diffFiles();

  // Context "sources of truth"
  const contextChanged =
    changed(files, "src/app/api/org/loopbrain/context/route.ts") ||
    changed(files, "src/server/org/loopbrainContext/");

  if (!contextChanged) {
    console.log("✓ Org context doc guard: no context changes detected.");
    return;
  }

  console.log("⚠ Org context code changed. Checking for required doc updates...");

  // Required doc updates when context changes
  const contractDocChanged =
    changed(files, "docs/org/LOOPBRAIN_INGESTION_CONTRACT_V1.md") ||
    changed(files, "docs/org/LOOPBRAIN_INGESTION_EXAMPLES_V1.md");

  const changelogChanged = changed(files, "docs/org/LOOPBRAIN_CONTEXT_CHANGELOG.md");
  const contractTestChanged = changed(files, "scripts/org-loopbrain-contract.js");

  if (!contractDocChanged || !changelogChanged) {
    console.error("❌ Org context doc guard FAILED.");
    console.error("");
    console.error("Context code changed, but contract docs/changelog were not updated in this PR.");
    console.error("");
    console.error("Required updates:");
    console.error("  - docs/org/LOOPBRAIN_CONTEXT_CHANGELOG.md (add changelog entry)");
    console.error("  - docs/org/LOOPBRAIN_INGESTION_CONTRACT_V1.md (if schema/invariants changed)");
    console.error("  - docs/org/LOOPBRAIN_INGESTION_EXAMPLES_V1.md (if schema changed)");
    console.error("");
    console.error("Optional (if schema/invariants changed):");
    console.error("  - scripts/org-loopbrain-contract.js (update contract test)");
    console.error("");
    process.exit(1);
  }

  console.log("✓ Org context doc guard passed (context changes documented).");
  if (!contractTestChanged) {
    console.log("⚠ Note: contract test script unchanged. Ensure org:loopbrain:contract still covers the change.");
  }
}

main();

