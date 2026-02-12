// src/lib/context/org/buildRoleContext.ts

import type { RoleContextData, RoleContextObject } from "./roleContextTypes";

/**
 * Minimal input required to construct a RoleContextObject.
 * A loader will gather these values from Prisma later.
 */
export interface RoleContextInput {
  workspaceId: string;

  // Core OrgPosition identity
  roleId: string; // OrgPosition.id
  title: string;
  level?: number | null;
  description?: string | null;
  isActive?: boolean;

  // RoleCard enrichment (optional)
  roleCardId?: string | null;
  jobFamily?: string | null;
  roleCardDescription?: string | null;

  // Org placement
  teamId?: string | null;
  teamName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  parentRoleId?: string | null;
  childRoleIds?: string[];

  // Reporting expectations
  expectedTeamSize?: number | null;
  actualTeamSize?: number | null;

  // Holder information
  primaryHolderId?: string | null; // single "owning" user if known
  primaryHolderName?: string | null;
  activeHolderIds?: string[];

  // Responsibilities / decision rights / skills
  responsibilitiesSummary?: string | null;
  responsibilities?: string[];
  decisionRights?: string[];
  keyMetrics?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];

  // Risk signals
  riskLevelHint?: RoleContextData["risk"]["riskLevel"];
  riskReasonsHint?: string[];

  // Optional tags
  tags?: string[];
}

/**
 * Pure builder to construct a RoleContextObject from RoleContextInput.
 * No DB access, no side effects.
 */
export function buildRoleContext(
  input: RoleContextInput
): RoleContextObject {
  const {
    workspaceId,
    roleId,
    title,
    level = null,
    description = null,
    isActive = true,
    roleCardId = null,
    jobFamily = null,
    roleCardDescription = null,
    teamId = null,
    teamName = null,
    departmentId = null,
    departmentName = null,
    parentRoleId = null,
    childRoleIds = [],
    expectedTeamSize = null,
    actualTeamSize = null,
    primaryHolderId = null,
    primaryHolderName = null,
    activeHolderIds = [],
    responsibilitiesSummary = null,
    responsibilities = [],
    decisionRights = [],
    keyMetrics = [],
    requiredSkills = [],
    preferredSkills = [],
    riskLevelHint = "unknown",
    riskReasonsHint = [],
    tags = [],
  } = input;

  // Holder / vacancy + single-point logic
  const activeHolderCount = activeHolderIds.length;
  const isVacant = activeHolderCount === 0;
  const isSinglePoint = activeHolderCount === 1;

  // Basic risk heuristics (refined later by org health engine)
  let riskLevel: RoleContextData["risk"]["riskLevel"] =
    riskLevelHint || "unknown";
  const riskReasons: string[] = [...riskReasonsHint];

  if (isVacant) {
    riskLevel = "medium";
    riskReasons.push("Role is currently vacant.");
  } else if (isSinglePoint && (expectedTeamSize ?? 0) > 1) {
    riskLevel = riskLevel === "high" ? "high" : "medium";
    riskReasons.push(
      "Single-point holder for a role with expected team size > 1."
    );
  }

  if (
    expectedTeamSize &&
    actualTeamSize &&
    actualTeamSize > expectedTeamSize * 1.5
  ) {
    riskLevel = "high";
    riskReasons.push("Actual team size significantly exceeds expected.");
  }

  const roleDescriptionFinal =
    description || roleCardDescription || null;

  const data: RoleContextData = {
    role: {
      id: roleId,
      workspaceId,
      title,
      level,
      description: roleDescriptionFinal,
      jobFamily,
      roleCardId,
      isActive,
    },
    orgPlacement: {
      teamId,
      teamName,
      departmentId,
      departmentName,
      parentRoleId,
      childRoleIds,
    },
    reporting: {
      reportsToRoleId: parentRoleId,
      expectedTeamSize,
      actualTeamSize,
      spanOfControlHint: expectedTeamSize
        ? `Expected team size ≈ ${expectedTeamSize}`
        : null,
    },
    holders: {
      primaryHolderId,
      primaryHolderName,
      activeHolderIds,
      isVacant,
      isSinglePoint,
    },
    responsibilities: {
      summary: responsibilitiesSummary,
      responsibilities,
      decisionRights,
      keyMetrics,
      requiredSkills,
      preferredSkills,
    },
    risk: {
      riskLevel,
      reasons: riskReasons,
    },
    tags: [
      "role",
      `role_id:${roleId}`,
      isActive ? "active:true" : "active:false",
      title ? `role_title:${title}` : "role_title:unknown",
      teamId ? `team_id:${teamId}` : "team:unknown",
      departmentId ? `department_id:${departmentId}` : "department:unknown",
      jobFamily ? `job_family:${jobFamily}` : "job_family:unknown",
      isVacant ? "vacant:true" : "vacant:false",
      isSinglePoint ? "single_point:true" : "single_point:false",
      primaryHolderId ? `holder_id:${primaryHolderId}` : "holder:none",
      primaryHolderName ? `holder:${primaryHolderName}` : null,
      ...tags,
    ].filter(Boolean) as string[],
    meta: {},
  };

  const context: RoleContextObject = {
    contextId: roleId,
    workspaceId,
    type: "role",
    title: `${title} – Role Context`,
    summary:
      "Role-level definition of responsibilities, reporting, and ownership within the organization.",
    data,
    capturedAt: new Date().toISOString(),
  };

  return context;
}

