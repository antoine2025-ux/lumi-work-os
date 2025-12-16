// scripts/dev-test-role-context-builder.ts
// Quick sanity check for buildRoleContext

import { buildRoleContext } from "../src/lib/context/org/buildRoleContext";

const ctx = buildRoleContext({
  workspaceId: "ws_123",
  roleId: "pos_head_eng",
  title: "Head of Engineering",
  level: 5,
  description: "Leads the engineering organization.",
  isActive: true,
  roleCardId: "rc_head_eng",
  jobFamily: "Engineering Leadership",
  roleCardDescription: "Owns engineering strategy, delivery, and team health.",
  teamId: "team_platform",
  teamName: "Platform",
  departmentId: "dept_engineering",
  departmentName: "Engineering",
  parentRoleId: "pos_cto",
  childRoleIds: ["pos_eng_manager_1", "pos_eng_manager_2"],
  expectedTeamSize: 20,
  actualTeamSize: 18,
  primaryHolderId: "user_aleksei",
  primaryHolderName: "Aleksei Skvortsov",
  activeHolderIds: ["user_aleksei"],
  responsibilitiesSummary:
    "Owns engineering strategy, execution, and team health.",
  responsibilities: [
    "Define engineering strategy",
    "Ensure platform reliability",
    "Mentor engineering managers",
  ],
  decisionRights: [
    "Final decision on engineering roadmap",
    "Approval of major architectural changes",
  ],
  keyMetrics: [
    "Deployment frequency",
    "Mean time to recovery",
    "Team satisfaction score",
  ],
  requiredSkills: ["Leadership", "System design", "People management"],
  preferredSkills: ["Fintech experience"],
  riskLevelHint: "medium",
  riskReasonsHint: ["Key leadership role."],
  tags: ["leadership", "eng_head"],
});

console.log("✅ RoleContextObject built successfully!");
console.log("");

console.log("Type:", ctx.type);
console.log("Context ID:", ctx.contextId);
console.log("Workspace ID:", ctx.workspaceId);
console.log("Title:", ctx.title);
console.log("");

console.log("Role:");
console.log("  ID:", ctx.data.role.id);
console.log("  Title:", ctx.data.role.title);
console.log("  Level:", ctx.data.role.level);
console.log("  Description:", ctx.data.role.description);
console.log("  Job Family:", ctx.data.role.jobFamily);
console.log("  Role Card ID:", ctx.data.role.roleCardId);
console.log("  Is Active:", ctx.data.role.isActive);
console.log("");

console.log("Org Placement:");
console.log("  Team ID:", ctx.data.orgPlacement.teamId);
console.log("  Team Name:", ctx.data.orgPlacement.teamName);
console.log("  Department ID:", ctx.data.orgPlacement.departmentId);
console.log("  Department Name:", ctx.data.orgPlacement.departmentName);
console.log("  Parent Role ID:", ctx.data.orgPlacement.parentRoleId);
console.log("  Child Role IDs:", ctx.data.orgPlacement.childRoleIds);
console.log("");

console.log("Reporting:");
console.log("  Reports To Role ID:", ctx.data.reporting.reportsToRoleId);
console.log("  Expected Team Size:", ctx.data.reporting.expectedTeamSize);
console.log("  Actual Team Size:", ctx.data.reporting.actualTeamSize);
console.log("  Span of Control Hint:", ctx.data.reporting.spanOfControlHint);
console.log("");

console.log("Holders:");
console.log("  Primary Holder ID:", ctx.data.holders.primaryHolderId);
console.log("  Primary Holder Name:", ctx.data.holders.primaryHolderName);
console.log("  Active Holder IDs:", ctx.data.holders.activeHolderIds);
console.log("  Is Vacant:", ctx.data.holders.isVacant);
console.log("  Is Single Point:", ctx.data.holders.isSinglePoint);
console.log("");

console.log("Responsibilities:");
console.log("  Summary:", ctx.data.responsibilities.summary);
console.log("  Responsibilities:", ctx.data.responsibilities.responsibilities);
console.log("  Decision Rights:", ctx.data.responsibilities.decisionRights);
console.log("  Key Metrics:", ctx.data.responsibilities.keyMetrics);
console.log("  Required Skills:", ctx.data.responsibilities.requiredSkills);
console.log("  Preferred Skills:", ctx.data.responsibilities.preferredSkills);
console.log("");

console.log("Risk:");
console.log("  Risk Level:", ctx.data.risk.riskLevel);
console.log("  Reasons:", ctx.data.risk.reasons);
console.log("");

console.log("Tags:", ctx.data.tags);
console.log("");
console.log("Captured At:", ctx.capturedAt);
console.log("");

// Verify expected values
const checks = [
  ctx.type === "role",
  ctx.contextId === "pos_head_eng",
  ctx.workspaceId === "ws_123",
  ctx.data.role.title === "Head of Engineering",
  ctx.data.role.level === 5,
  ctx.data.role.jobFamily === "Engineering Leadership",
  ctx.data.orgPlacement.teamName === "Platform",
  ctx.data.orgPlacement.departmentName === "Engineering",
  ctx.data.orgPlacement.parentRoleId === "pos_cto",
  ctx.data.orgPlacement.childRoleIds.length === 2,
  ctx.data.reporting.expectedTeamSize === 20,
  ctx.data.reporting.actualTeamSize === 18,
  ctx.data.holders.primaryHolderId === "user_aleksei",
  ctx.data.holders.primaryHolderName === "Aleksei Skvortsov",
  ctx.data.holders.activeHolderIds.length === 1,
  ctx.data.holders.isVacant === false,
  ctx.data.holders.isSinglePoint === true,
  ctx.data.responsibilities.responsibilities.length === 3,
  ctx.data.responsibilities.decisionRights.length === 2,
  ctx.data.responsibilities.keyMetrics.length === 3,
  ctx.data.risk.riskLevel === "medium" || ctx.data.risk.riskLevel === "high",
  ctx.data.tags.includes("role"),
  ctx.data.tags.includes("role_id:pos_head_eng"),
  ctx.data.tags.includes("active:true"),
  ctx.data.tags.includes("role_title:Head of Engineering"),
  ctx.data.tags.includes("team_id:team_platform"),
  ctx.data.tags.includes("department_id:dept_engineering"),
  ctx.data.tags.includes("job_family:Engineering Leadership"),
  ctx.data.tags.includes("vacant:false"),
  ctx.data.tags.includes("single_point:true"),
  ctx.data.tags.includes("leadership"),
  ctx.data.tags.includes("eng_head"),
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

