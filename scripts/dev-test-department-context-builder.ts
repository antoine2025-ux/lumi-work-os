// scripts/dev-test-department-context-builder.ts
// Quick sanity check for buildDepartmentContext

import { buildDepartmentContext } from "../src/lib/context/org/buildDepartmentContext";

const ctx = buildDepartmentContext({
  workspaceId: "ws_123",
  departmentId: "dept_abc",
  departmentName: "Engineering",
  departmentDescription: "All product & platform engineering",
  departmentColor: "#3b82f6",
  departmentOrder: 1,
  departmentIsActive: true,
  teamsCount: 4,
  positionsCount: 12,
  filledPositionsCount: 10,
  peopleCount: 14,
  healthStatusLabel: "ok",
  healthNotes: "Department has active teams and people, structure looks reasonable.",
  tags: ["engineering", "core"],
});

console.log("✅ DepartmentContextObject built successfully!");
console.log("");

console.log("Type:", ctx.type);
console.log("Context ID:", ctx.contextId);
console.log("Workspace ID:", ctx.workspaceId);
console.log("Title:", ctx.title);
console.log("");

console.log("Department:");
console.log("  ID:", ctx.data.department.id);
console.log("  Name:", ctx.data.department.name);
console.log("  Description:", ctx.data.department.description);
console.log("  Color:", ctx.data.department.color);
console.log("  Order:", ctx.data.department.order);
console.log("  Is Active:", ctx.data.department.isActive);
console.log("");

console.log("Structure:");
console.log("  Teams:", ctx.data.structure.teamsCount);
console.log("  Positions:", ctx.data.structure.positionsCount);
console.log("  Filled Positions:", ctx.data.structure.filledPositionsCount);
console.log("  People:", ctx.data.structure.peopleCount);
console.log("");

console.log("Structure Signals:");
console.log("  Has Teams:", ctx.data.structureSignals.hasTeams);
console.log("  Has Positions:", ctx.data.structureSignals.hasPositions);
console.log("  Has People:", ctx.data.structureSignals.hasPeople);
console.log("  Has Org Chart Nodes:", ctx.data.structureSignals.hasOrgChartNodes);
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
  ctx.type === "department",
  ctx.contextId === "dept_abc",
  ctx.workspaceId === "ws_123",
  ctx.data.department.name === "Engineering",
  ctx.data.structure.teamsCount === 4,
  ctx.data.structure.positionsCount === 12,
  ctx.data.structure.filledPositionsCount === 10,
  ctx.data.structure.peopleCount === 14,
  ctx.data.structureSignals.hasTeams === true,
  ctx.data.structureSignals.hasPositions === true,
  ctx.data.structureSignals.hasPeople === true,
  ctx.data.structureSignals.hasOrgChartNodes === true,
  ctx.data.healthSummary.statusLabel === "ok",
  ctx.data.tags.includes("department"),
  ctx.data.tags.includes("department_id:dept_abc"),
  ctx.data.tags.includes("teams:4"),
  ctx.data.tags.includes("positions:12"),
  ctx.data.tags.includes("filled_positions:10"),
  ctx.data.tags.includes("people:14"),
  ctx.data.tags.includes("engineering"),
  ctx.data.tags.includes("core"),
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

