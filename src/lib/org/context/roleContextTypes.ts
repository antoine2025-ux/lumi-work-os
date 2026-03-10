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

  // Manager-authored person-specific context (from RoleCard)
  roleInOrg?: string | null;    // e.g. "Epic Owner for Platform Migration"
  focusArea?: string | null;    // e.g. "Leading auth migration + API redesign"
  managerNotes?: string | null; // Free-form manager context

  // Linked JobDescription template (shared across positions)
  jobDescriptionTitle?: string | null;   // JD template title
  jobDescriptionSummary?: string | null; // JD template summary
  jobDescriptionLevel?: string | null;   // JD template level (may differ from roleCard.level)

  // Meta
  createdAt: Date;
  updatedAt: Date;
};

