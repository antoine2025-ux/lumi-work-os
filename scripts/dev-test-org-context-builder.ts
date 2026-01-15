// scripts/dev-test-org-context-builder.ts
// Quick sanity check for buildOrgContext

import { buildOrgContext } from "../src/lib/context/org/buildOrgContext";

const ctx = buildOrgContext({
  workspaceId: "ws_123",
  workspaceName: "Loopwell",
  workspaceSlug: "loopwell",
  workspaceDescription: "Demo workspace",
  departmentsCount: 2,
  teamsCount: 5,
  positionsCount: 12,
  filledPositionsCount: 9,
  peopleCount: 11,
  hasRoleCards: true,
  healthStatusLabel: "incomplete",
  healthNotes: "Teams/positions exist but coverage is partial.",
  tags: ["org", "demo", "incomplete-structure"],
});

console.log("✅ OrgContextObject built successfully!");
console.log("\nType:", ctx.type);
console.log("Context ID:", ctx.contextId);
console.log("Workspace ID:", ctx.workspaceId);
console.log("Title:", ctx.title);
console.log("\nMetrics:");
console.log("  Departments:", ctx.data.metrics.departmentsCount);
console.log("  Teams:", ctx.data.metrics.teamsCount);
console.log("  Positions:", ctx.data.metrics.positionsCount);
console.log("  Filled Positions:", ctx.data.metrics.filledPositionsCount);
console.log("  People:", ctx.data.metrics.peopleCount);
console.log("\nStructure Signals:");
console.log("  Has Departments:", ctx.data.structureSignals.hasDepartments);
console.log("  Has Teams:", ctx.data.structureSignals.hasTeams);
console.log("  Has Positions:", ctx.data.structureSignals.hasPositions);
console.log("  Has Org Chart:", ctx.data.structureSignals.hasOrgChart);
console.log("  Has Role Cards:", ctx.data.structureSignals.hasRoleCards);
console.log("\nHealth Summary:");
console.log("  Status Label:", ctx.data.healthSummary.statusLabel);
console.log("  Notes:", ctx.data.healthSummary.notes);
console.log("\nTags:", ctx.data.tags);
console.log("\nCaptured At:", ctx.capturedAt);

// Verify expected values
const checks = [
  ctx.type === "org",
  ctx.data.metrics.departmentsCount === 2,
  ctx.data.metrics.teamsCount === 5,
  ctx.data.metrics.positionsCount === 12,
  ctx.data.structureSignals.hasDepartments === true,
  ctx.data.structureSignals.hasTeams === true,
  ctx.data.structureSignals.hasPositions === true,
  ctx.data.structureSignals.hasOrgChart === true,
  ctx.data.structureSignals.hasRoleCards === true,
  ctx.data.healthSummary.statusLabel === "incomplete",
  ctx.data.tags.length === 3,
  typeof ctx.capturedAt === "string" && ctx.capturedAt.length > 0,
];

if (checks.every((check) => check === true)) {
  console.log("\n✅ All checks passed!");
} else {
  console.error("\n❌ Some checks failed!");
  process.exit(1);
}

console.log("\n📄 Full JSON output:");
console.log(JSON.stringify(ctx, null, 2));

