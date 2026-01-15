#!/usr/bin/env node

/**
 * Loopbrain Test Sweep
 * 
 * Calls all Q1–Q9 endpoints for fixture projects and prints a summarized report.
 * 
 * Usage:
 *   node scripts/sweep-loopbrain.mjs
 *   BASE_URL=http://localhost:3000 node scripts/sweep-loopbrain.mjs
 * 
 * Requires:
 *   - loopbrain-fixtures.json (created by seed script)
 *   - Running dev server (or set BASE_URL)
 */

import process from "node:process";
import fs from "node:fs";
import path from "node:path";

const base = process.env.BASE_URL || "http://localhost:3000";

// Load fixture IDs
const fixturePath = path.join(process.cwd(), "loopbrain-fixtures.json");
let fixtures;
try {
  const fixtureData = fs.readFileSync(fixturePath, "utf-8");
  fixtures = JSON.parse(fixtureData);
} catch (error) {
  console.error("❌ Could not load loopbrain-fixtures.json");
  console.error("   Run: SEED_LOOPBRAIN_FIXTURES=true npm run seed");
  process.exit(1);
}

// Fixed timeframe for Q4/Q9
const timeframeStart = "2025-12-16T00:00:00.000Z";
const timeframeEnd = "2026-01-31T00:00:00.000Z";

// Test results
const results = [];
let hasErrors = false;

function printSection(title) {
  console.log("");
  console.log("=".repeat(60));
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

function printResult(endpoint, projectName, status, data) {
  const statusIcon = status === 200 ? "✅" : status >= 400 && status < 500 ? "⚠️" : "❌";
  console.log(`${statusIcon} ${endpoint} (${projectName})`);
  console.log(`   Status: ${status}`);

  if (status === 200 && data) {
    // Extract key fields based on question type
    if (data.questionId === "Q1") {
      console.log(`   Owner: ${data.owner?.type || "unset"}`);
      console.log(`   Confidence: ${data.confidence}`);
    } else if (data.questionId === "Q2") {
      console.log(`   Decision: ${data.decision?.type || "unset"}`);
      console.log(`   Escalation: ${data.escalation?.type || "unset"}`);
      console.log(`   Confidence: ${data.confidence}`);
    } else if (data.questionId === "Q3") {
      console.log(`   Candidates: ${data.viableCandidates?.length || 0}`);
      console.log(`   Mode: ${data.mode}`);
      console.log(`   Confidence: ${data.confidence}`);
    } else if (data.questionId === "Q4") {
      console.log(`   Assessment: ${data.assessment || data.feasibility}`);
      console.log(`   Confidence: ${data.confidence}`);
    } else if (data.questionId === "Q5") {
      console.log(`   Status: ${data.currentStatus}`);
      console.log(`   Return Date: ${data.returnDate || "N/A"}`);
      console.log(`   Confidence: ${data.confidence}`);
    } else if (data.questionId === "Q6") {
      console.log(`   Candidates: ${data.candidates?.length || 0}`);
      console.log(`   Confidence: ${data.confidence}`);
    } else if (data.questionId === "Q7") {
      console.log(`   Owner Alignment: ${data.ownerAlignment?.status || "N/A"}`);
      console.log(`   Decision Alignment: ${data.decisionAlignment?.status || "N/A"}`);
      console.log(`   Confidence: ${data.confidence}`);
    } else if (data.questionId === "Q8") {
      console.log(`   Status: ${data.status}`);
      console.log(`   Missing: ${data.missing?.join(", ") || "none"}`);
      console.log(`   Confidence: ${data.confidence}`);
    } else if (data.questionId === "Q9") {
      console.log(`   Decision: ${data.decision?.action || "unknown"}`);
      console.log(`   Options: ${data.options?.length || 0}`);
      console.log(`   Confidence: ${data.confidence}`);
    }

    if (data.constraints && data.constraints.length > 0) {
      console.log(`   Constraints: ${data.constraints.length}`);
    }
    if (data.risks && data.risks.length > 0) {
      console.log(`   Risks: ${data.risks.length}`);
    }
    if (data.errors && data.errors.length > 0) {
      console.log(`   Errors: ${data.errors.map((e) => e.message).join(", ")}`);
      hasErrors = true;
    }
  } else if (data?.errors) {
    console.log(`   Errors: ${data.errors.map((e) => e.message).join(", ")}`);
    hasErrors = true;
  }

  results.push({ endpoint, projectName, status, data });
}

async function callEndpoint(url, endpoint, projectName) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    printResult(endpoint, projectName, res.status, data);
    if (res.status >= 500) {
      hasErrors = true;
    }
    return { status: res.status, data };
  } catch (error) {
    console.log(`❌ ${endpoint} (${projectName})`);
    console.log(`   Error: ${error.message}`);
    hasErrors = true;
    return { status: 0, error: error.message };
  }
}

async function runSweep() {
  console.log("🔍 Loopbrain Test Sweep");
  console.log(`   Base URL: ${base}`);
  console.log(`   Fixtures: ${fixturePath}`);

  // Q1: Who owns this?
  printSection("Q1: Who owns this?");
  for (const [name, projectId] of Object.entries(fixtures.projects)) {
    await callEndpoint(
      `${base}/api/loopbrain/q1?projectId=${projectId}`,
      "Q1",
      name
    );
  }

  // Q2: Who decides this?
  printSection("Q2: Who decides this?");
  for (const [name, projectId] of Object.entries(fixtures.projects)) {
    await callEndpoint(
      `${base}/api/loopbrain/q2?projectId=${projectId}`,
      "Q2",
      name
    );
  }

  // Q3: Who should be working on this?
  printSection("Q3: Who should be working on this?");
  for (const [name, projectId] of Object.entries(fixtures.projects)) {
    await callEndpoint(
      `${base}/api/loopbrain/org/q3?projectId=${projectId}`,
      "Q3",
      name
    );
  }

  // Q4: Do we have capacity in timeframe?
  printSection("Q4: Do we have capacity in timeframe?");
  for (const [name, projectId] of Object.entries(fixtures.projects)) {
    await callEndpoint(
      `${base}/api/loopbrain/org/q4?projectId=${projectId}&start=${timeframeStart}&end=${timeframeEnd}`,
      "Q4",
      name
    );
  }

  // Q5: Who is unavailable and when do they return?
  printSection("Q5: Who is unavailable and when do they return?");
  await callEndpoint(
    `${base}/api/loopbrain/q5?personId=${fixtures.people.danaId}`,
    "Q5",
    "Dana"
  );
  await callEndpoint(
    `${base}/api/loopbrain/q5?personId=${fixtures.people.chrisId}`,
    "Q5",
    "Chris"
  );

  // Q6: Who can cover?
  printSection("Q6: Who can cover?");
  for (const [name, projectId] of Object.entries(fixtures.projects)) {
    await callEndpoint(
      `${base}/api/loopbrain/q6?projectId=${projectId}`,
      "Q6",
      name
    );
  }

  // Q7: Is this aligned with role responsibilities?
  printSection("Q7: Is this aligned with role responsibilities?");
  for (const [name, projectId] of Object.entries(fixtures.projects)) {
    await callEndpoint(
      `${base}/api/loopbrain/q7?projectId=${projectId}`,
      "Q7",
      name
    );
  }

  // Q8: Is responsibility clear or fragmented?
  printSection("Q8: Is responsibility clear or fragmented?");
  for (const [name, projectId] of Object.entries(fixtures.projects)) {
    await callEndpoint(
      `${base}/api/loopbrain/q8?projectId=${projectId}`,
      "Q8",
      name
    );
  }

  // Q9: Should we proceed, reassign, delay, or request support?
  printSection("Q9: Should we proceed, reassign, delay, or request support?");
  for (const [name, projectId] of Object.entries(fixtures.projects)) {
    await callEndpoint(
      `${base}/api/loopbrain/q9?projectId=${projectId}&start=${timeframeStart}&end=${timeframeEnd}`,
      "Q9",
      name
    );
  }

  // Summary
  printSection("Summary");
  const totalCalls = results.length;
  const successCount = results.filter((r) => r.status === 200).length;
  const errorCount = results.filter((r) => r.status >= 500).length;
  const clientErrorCount = results.filter(
    (r) => r.status >= 400 && r.status < 500
  ).length;

  console.log(`Total calls: ${totalCalls}`);
  console.log(`✅ Success (200): ${successCount}`);
  console.log(`⚠️  Client errors (4xx): ${clientErrorCount}`);
  console.log(`❌ Server errors (5xx): ${errorCount}`);

  if (hasErrors || errorCount > 0) {
    console.log("");
    console.log("❌ Sweep completed with errors");
    process.exit(1);
  } else {
    console.log("");
    console.log("✅ Sweep completed successfully");
    process.exit(0);
  }
}

runSweep().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

