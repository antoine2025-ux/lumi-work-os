#!/usr/bin/env node

/**
 * Test harness for Loopbrain Q4 API
 * 
 * Usage:
 *   node scripts/test-q4.mjs --projectId <ID> --end <ISO_DATE>
 *   node scripts/test-q4.mjs --projectId <ID> --end <ISO_DATE> --start <ISO_DATE>
 *   node scripts/test-q4.mjs --projectId <ID> --durationDays <NUMBER>
 * 
 * Environment:
 *   BASE_URL - API base URL (default: http://localhost:3000)
 */

import process from "node:process";

const base = process.env.BASE_URL || "http://localhost:3000";

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1];
}

const projectId = arg("projectId", "");
const start = arg("start", new Date().toISOString());
const end = arg("end", "");
const durationDays = arg("durationDays", "");

if (!projectId) {
  console.error("❌ Missing --projectId");
  console.error("\nUsage:");
  console.error("  node scripts/test-q4.mjs --projectId <ID> --end <ISO_DATE>");
  console.error("  node scripts/test-q4.mjs --projectId <ID> --durationDays <NUMBER>");
  process.exit(1);
}

if (!end && !durationDays) {
  console.error("❌ Missing --end (ISO string) or --durationDays (number)");
  console.error("\nExample:");
  console.error('  node scripts/test-q4.mjs --projectId <ID> --end "2026-01-31T00:00:00.000Z"');
  console.error('  node scripts/test-q4.mjs --projectId <ID> --durationDays 30');
  process.exit(1);
}

let url = `${base}/api/loopbrain/org/q4?projectId=${encodeURIComponent(projectId)}&start=${encodeURIComponent(start)}`;

if (end) {
  url += `&end=${encodeURIComponent(end)}`;
} else {
  url += `&durationDays=${encodeURIComponent(durationDays)}`;
}

console.log("🔍 Calling:", url);
console.log("");

const res = await fetch(url);
const json = await res.json();

console.log("📊 Status:", res.status, res.statusText);
console.log("");

if (!res.ok) {
  console.error("❌ Error Response:");
  if (json.errors) {
    json.errors.forEach((err) => {
      console.error(`   [${err.code}] ${err.message}`);
    });
  } else {
    console.error(JSON.stringify(json, null, 2));
  }
  process.exit(1);
}

console.log("✅ Assessment:", json.assessment);
console.log("📈 Confidence:", json.confidence);
console.log("");

if (json.capacitySummary) {
  console.log("📋 Capacity Summary:");
  console.log(`   ${json.capacitySummary}`);
  console.log("");
}

if (json.assumptions && json.assumptions.length > 0) {
  console.log("💭 Assumptions:");
  json.assumptions.forEach((a) => {
    console.log(`   • ${a}`);
  });
  console.log("");
}

if (json.risks && json.risks.length > 0) {
  console.log("⚠️  Risks:");
  json.risks.forEach((r) => {
    console.log(`   • ${r}`);
  });
  console.log("");
}

if (json.constraints && json.constraints.length > 0) {
  console.log("🔒 Constraints:");
  json.constraints.forEach((c) => {
    console.log(`   • ${c}`);
  });
  console.log("");
}

if (json.timeframe) {
  console.log("📅 Timeframe:");
  console.log(`   Start: ${json.timeframe.start}`);
  console.log(`   End:   ${json.timeframe.end}`);
  console.log("");
}

console.log("📄 Full Response:");
console.log(JSON.stringify(json, null, 2));

