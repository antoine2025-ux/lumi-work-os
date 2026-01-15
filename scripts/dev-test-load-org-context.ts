// scripts/dev-test-load-org-context.ts
// Quick sanity check for loadOrgContext

import { prisma } from "../src/lib/db";
import { loadOrgContext } from "../src/lib/context/org/loadOrgContext";

async function test() {
  // Get the first workspace from the database for testing
  const workspace = await prisma.workspace.findFirst({
    select: {
      id: true,
      name: true,
    },
  });

  if (!workspace) {
    console.error("❌ No workspace found in database");
    process.exit(1);
  }

  console.log(`📋 Testing with workspace: ${workspace.name} (${workspace.id})`);
  console.log("");

  const ctx = await loadOrgContext(workspace.id);

  console.log("✅ OrgContextObject loaded successfully!");
  console.log("");
  console.log("Type:", ctx.type);
  console.log("Context ID:", ctx.contextId);
  console.log("Workspace ID:", ctx.workspaceId);
  console.log("Title:", ctx.title);
  console.log("");

  console.log("Metrics:");
  console.log("  Departments:", ctx.data.metrics.departmentsCount);
  console.log("  Teams:", ctx.data.metrics.teamsCount);
  console.log("  Positions:", ctx.data.metrics.positionsCount);
  console.log("  Filled Positions:", ctx.data.metrics.filledPositionsCount);
  console.log("  People:", ctx.data.metrics.peopleCount);
  console.log("");

  console.log("Structure Signals:");
  console.log("  Has Departments:", ctx.data.structureSignals.hasDepartments);
  console.log("  Has Teams:", ctx.data.structureSignals.hasTeams);
  console.log("  Has Positions:", ctx.data.structureSignals.hasPositions);
  console.log("  Has Org Chart:", ctx.data.structureSignals.hasOrgChart);
  console.log("  Has Role Cards:", ctx.data.structureSignals.hasRoleCards);
  console.log("");

  console.log("Health Summary:");
  console.log("  Status Label:", ctx.data.healthSummary.statusLabel);
  console.log("  Notes:", ctx.data.healthSummary.notes);
  console.log("");

  console.log("Tags:", ctx.data.tags);
  console.log("");
  console.log("Captured At:", ctx.capturedAt);
  console.log("");

  // Verify expected values
  const checks = [
    ctx.type === "org",
    ctx.contextId === workspace.id,
    ctx.workspaceId === workspace.id,
    typeof ctx.data.metrics.departmentsCount === "number",
    typeof ctx.data.metrics.teamsCount === "number",
    typeof ctx.data.metrics.positionsCount === "number",
    typeof ctx.data.metrics.filledPositionsCount === "number",
    typeof ctx.data.metrics.peopleCount === "number",
    typeof ctx.data.structureSignals.hasDepartments === "boolean",
    typeof ctx.data.structureSignals.hasTeams === "boolean",
    typeof ctx.data.structureSignals.hasPositions === "boolean",
    typeof ctx.data.structureSignals.hasOrgChart === "boolean",
    typeof ctx.data.structureSignals.hasRoleCards === "boolean",
    ["unknown", "incomplete", "ok", "healthy", "risky"].includes(
      ctx.data.healthSummary.statusLabel
    ),
    Array.isArray(ctx.data.tags),
    typeof ctx.capturedAt === "string" && ctx.capturedAt.length > 0,
  ];

  if (checks.every((check) => check === true)) {
    console.log("✅ All checks passed!");
  } else {
    console.error("❌ Some checks failed!");
    process.exit(1);
  }

  console.log("");
  console.log("📄 Full JSON output:");
  console.log(JSON.stringify(ctx, null, 2));
}

test()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

