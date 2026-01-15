// scripts/dev-test-team-context-builder.ts
// Quick sanity check for buildTeamContext

import { buildTeamContext } from "../src/lib/context/org/buildTeamContext";

const ctx = buildTeamContext({
  workspaceId: "ws_123",
  teamId: "team_abc",
  teamName: "Platform Team",
  teamDescription: "Owns core platform infrastructure.",
  teamColor: "#0ea5e9",
  teamOrder: 1,
  teamIsActive: true,
  departmentId: "dept_eng",
  departmentName: "Engineering",
  positionsCount: 5,
  filledPositionsCount: 4,
  peopleCount: 4,
  projectsCount: 3,
  activeTasksCount: 18,
  blockedTasksCount: 2,
  healthStatusLabel: "ok",
  healthNotes: "Healthy team size and manageable workload.",
  tags: ["platform", "core"],
});

console.log("✅ TeamContextObject built successfully!");
console.log("");

console.log("Type:", ctx.type);
console.log("Context ID:", ctx.contextId);
console.log("Workspace ID:", ctx.workspaceId);
console.log("Title:", ctx.title);
console.log("");

console.log("Team:");
console.log("  ID:", ctx.data.team.id);
console.log("  Name:", ctx.data.team.name);
console.log("  Description:", ctx.data.team.description);
console.log("  Color:", ctx.data.team.color);
console.log("  Order:", ctx.data.team.order);
console.log("  Is Active:", ctx.data.team.isActive);
console.log("  Department ID:", ctx.data.team.departmentId);
console.log("");

console.log("Department:");
console.log("  ID:", ctx.data.department.id);
console.log("  Name:", ctx.data.department.name);
console.log("");

console.log("Structure:");
console.log("  Positions:", ctx.data.structure.positionsCount);
console.log("  Filled Positions:", ctx.data.structure.filledPositionsCount);
console.log("  People:", ctx.data.structure.peopleCount);
console.log("");

console.log("Workload:");
console.log("  Projects:", ctx.data.workload.projectsCount);
console.log("  Active Tasks:", ctx.data.workload.activeTasksCount);
console.log("  Blocked Tasks:", ctx.data.workload.blockedTasksCount);
console.log("");

console.log("Structure Signals:");
console.log("  Has Positions:", ctx.data.structureSignals.hasPositions);
console.log("  Has People:", ctx.data.structureSignals.hasPeople);
console.log("  Is Single Person Team:", ctx.data.structureSignals.isSinglePersonTeam);
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
  ctx.type === "team",
  ctx.contextId === "team_abc",
  ctx.workspaceId === "ws_123",
  ctx.data.team.name === "Platform Team",
  ctx.data.structure.positionsCount === 5,
  ctx.data.structure.filledPositionsCount === 4,
  ctx.data.structure.peopleCount === 4,
  ctx.data.workload.projectsCount === 3,
  ctx.data.workload.activeTasksCount === 18,
  ctx.data.workload.blockedTasksCount === 2,
  ctx.data.structureSignals.hasPositions === true,
  ctx.data.structureSignals.hasPeople === true,
  ctx.data.structureSignals.isSinglePersonTeam === false,
  ctx.data.healthSummary.statusLabel === "ok",
  ctx.data.tags.includes("team"),
  ctx.data.tags.includes("team_id:team_abc"),
  ctx.data.tags.includes("department_id:dept_eng"),
  ctx.data.tags.includes("positions:5"),
  ctx.data.tags.includes("filled_positions:4"),
  ctx.data.tags.includes("people:4"),
  ctx.data.tags.includes("projects:3"),
  ctx.data.tags.includes("active_tasks:18"),
  ctx.data.tags.includes("blocked_tasks:2"),
  ctx.data.tags.includes("single_person_team:false"),
  ctx.data.tags.includes("platform"),
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

