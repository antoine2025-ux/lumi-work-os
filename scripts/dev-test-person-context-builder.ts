// scripts/dev-test-person-context-builder.ts
// Quick sanity check for buildPersonContext

import { buildPersonContext } from "../src/lib/context/org/buildPersonContext";

const ctx = buildPersonContext({
  workspaceId: "ws_123",
  userId: "user_abc",
  name: "Aleksei Skvortsov",
  email: "aleksei@example.com",
  image: null,
  isActive: true,
  joinedAt: "2023-01-15",
  positionId: "pos_1",
  positionTitle: "Head of Engineering",
  positionLevel: 5,
  teamId: "team_platform",
  teamName: "Platform",
  departmentId: "dept_engineering",
  departmentName: "Engineering",
  managerId: null,
  managerName: null,
  directReportIds: ["user_2", "user_3", "user_4"],
  totalReportsCount: 6,
  activeProjectsCount: 3,
  activeTasksCount: 18,
  blockedTasksCount: 2,
  recentlyUpdatedTasksCount: 10,
  responsibilitiesSummary:
    "Leads engineering organization, owns platform reliability and delivery.",
  responsibilities: [
    "Define engineering strategy",
    "Oversee platform roadmap",
    "Manage engineering managers",
  ],
  keyMetrics: ["Deployment frequency", "Incident count", "Team health"],
  peerIds: ["user_5", "user_6"],
  healthStatusLabel: "balanced",
  healthNotes: "Healthy span of control and workload.",
  tags: ["leader", "engineering"],
});

console.log("✅ PersonContextObject built successfully!");
console.log("");

console.log("Type:", ctx.type);
console.log("Context ID:", ctx.contextId);
console.log("Workspace ID:", ctx.workspaceId);
console.log("Title:", ctx.title);
console.log("");

console.log("Person:");
console.log("  ID:", ctx.data.person.id);
console.log("  Name:", ctx.data.person.name);
console.log("  Email:", ctx.data.person.email);
console.log("  Title:", ctx.data.person.title);
console.log("  Level:", ctx.data.person.level);
console.log("  Joined At:", ctx.data.person.joinedAt);
console.log("  Is Active:", ctx.data.person.isActive);
console.log("");

console.log("Position:");
console.log("  ID:", ctx.data.position.id);
console.log("  Title:", ctx.data.position.title);
console.log("  Level:", ctx.data.position.level);
console.log("  Team ID:", ctx.data.position.teamId);
console.log("  Department ID:", ctx.data.position.departmentId);
console.log("");

console.log("Manager:");
console.log("  ID:", ctx.data.manager.id);
console.log("  Name:", ctx.data.manager.name);
console.log("");

console.log("Team:");
console.log("  ID:", ctx.data.team.id);
console.log("  Name:", ctx.data.team.name);
console.log("");

console.log("Department:");
console.log("  ID:", ctx.data.department.id);
console.log("  Name:", ctx.data.department.name);
console.log("");

console.log("Reporting:");
console.log("  Direct Reports Count:", ctx.data.reporting.directReportsCount);
console.log("  Total Reports Count:", ctx.data.reporting.totalReportsCount);
console.log("  Span of Control Risk:", ctx.data.reporting.spanOfControlRisk);
console.log("");

console.log("Workload:");
console.log("  Active Projects:", ctx.data.workload.activeProjectsCount);
console.log("  Active Tasks:", ctx.data.workload.activeTasksCount);
console.log("  Blocked Tasks:", ctx.data.workload.blockedTasksCount);
console.log("  Recently Updated Tasks:", ctx.data.workload.recentlyUpdatedTasksCount);
console.log("");

console.log("Responsibilities:");
console.log("  Summary:", ctx.data.responsibilities.summary);
console.log("  Responsibilities:", ctx.data.responsibilities.responsibilities);
console.log("  Key Metrics:", ctx.data.responsibilities.keyMetrics);
console.log("");

console.log("Relationships:");
console.log("  Manager ID:", ctx.data.relationships.managerId);
console.log("  Direct Report IDs:", ctx.data.relationships.directReportIds);
console.log("  Peer IDs:", ctx.data.relationships.peerIds);
console.log("  Team ID:", ctx.data.relationships.teamId);
console.log("  Department ID:", ctx.data.relationships.departmentId);
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
  ctx.type === "person",
  ctx.contextId === "user_abc",
  ctx.workspaceId === "ws_123",
  ctx.data.person.name === "Aleksei Skvortsov",
  ctx.data.person.email === "aleksei@example.com",
  ctx.data.person.title === "Head of Engineering",
  ctx.data.person.level === 5,
  ctx.data.person.isActive === true,
  ctx.data.position.title === "Head of Engineering",
  ctx.data.position.level === 5,
  ctx.data.reporting.directReportsCount === 3,
  ctx.data.reporting.spanOfControlRisk === "low", // 3 <= 5, so "low"
  ctx.data.workload.activeProjectsCount === 3,
  ctx.data.workload.activeTasksCount === 18,
  ctx.data.workload.blockedTasksCount === 2,
  ctx.data.workload.recentlyUpdatedTasksCount === 10,
  ctx.data.relationships.directReportIds.length === 3,
  ctx.data.relationships.peerIds.length === 2,
  ctx.data.healthSummary.statusLabel === "balanced",
  ctx.data.tags.includes("person"),
  ctx.data.tags.includes("user_id:user_abc"),
  ctx.data.tags.includes("active:true"),
  ctx.data.tags.includes("role:Head of Engineering"),
  ctx.data.tags.includes("team_id:team_platform"),
  ctx.data.tags.includes("department_id:dept_engineering"),
  ctx.data.tags.includes("projects:3"),
  ctx.data.tags.includes("tasks_active:18"),
  ctx.data.tags.includes("tasks_blocked:2"),
  ctx.data.tags.includes("leader"),
  ctx.data.tags.includes("engineering"),
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

