// src/lib/org/context/roleContextTypes.ts

export type RoleSourceType = "roleCard" | "orgPosition";

/**
 * Unified RoleContext
 * This is the canonical, pre-ContextObject representation of a role.
 * It merges RoleCard and OrgPosition into a single shape that we can map
 * into Loopbrain ContextItem(s) later.
 */
export type RoleContext = {
  id: string; // canonical role ID, e.g. role:{workspaceId}:position:{orgPositionId}
  sourceType: RoleSourceType;
  workspaceId: string;

  // Human-facing info
  title: string;
  level?: string | number | null;
  jobFamily?: string | null;
  roleDescription?: string | null;

  // Responsibility graph
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  keyMetrics: string[];

  // Org graph placement
  teamId?: string | null;        // OrgTeam.id
  departmentId?: string | null;   // OrgDepartment.id
  reportsToRoleId?: string | null; // optional parent role

  // Ownership / assignment
  userId?: string | null; // OrgPosition.userId linkage

  // Meta
  createdAt: Date;
  updatedAt: Date;
};

