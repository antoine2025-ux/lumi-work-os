import { OrgContextObject, OrgRelation, nowIso } from "./context-object";
import { ContextObject, ContextRelation } from "@/lib/context/contextTypes";
import { validateContextObject } from "@/lib/context/contextValidation";

export type OrgDepartmentInput = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  workspaceId: string;
  updatedAt: Date;
};

export type OrgTeamInput = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  workspaceId: string;
  departmentId: string | null;
  updatedAt: Date;
};

export type OrgPositionInput = {
  id: string;
  title: string | null;
  level?: number | null;
  roleDescription?: string | null;
  isActive: boolean;
  workspaceId: string;
  teamId?: string | null;
  userId?: string | null;
  parentId?: string | null; // For reporting hierarchy
  parentUserId?: string | null; // Parent position's userId
  updatedAt: Date;
};

export type OrgPersonInput = {
  userId: string;
  name: string | null;
  email: string;
  workspaceId: string;
  workspaceRole: string;
  primaryPositionId?: string | null;
  primaryTeamId?: string | null;
  primaryDepartmentId?: string | null;
  updatedAt: Date;
};

/**
 * Build Org-level root context (one per workspace).
 * Returns a validated ContextObject compliant with Loopwell Org ContextObject Specification v2.1.
 */
export function buildOrgRootContext(params: {
  workspaceId: string;
  peopleCount: number;
  departmentsCount: number;
  teamsCount: number;
  positionsCount: number;
}): ContextObject {
  const { workspaceId, peopleCount, departmentsCount, teamsCount, positionsCount } = params;

  const base: ContextObject = {
    id: `org:${workspaceId}`,
    type: "org",
    title: "Organization",
    summary: `Org structure overview. People: ${peopleCount}. Departments: ${departmentsCount}. Teams: ${teamsCount}. Positions: ${positionsCount}.`,
    tags: [
      "org",
      `workspace:${workspaceId}`,
      `people:${peopleCount}`,
      `departments:${departmentsCount}`,
      `teams:${teamsCount}`,
      `positions:${positionsCount}`,
    ],
    relations: [],
    owner: null,
    status: "ACTIVE",
    updatedAt: nowIso(),
  };

  return validateContextObject(base);
}

export function buildDepartmentContext(
  dept: OrgDepartmentInput,
  options?: {
    peopleCount?: number;
    teamsCount?: number;
  }
): ContextObject {
  const peopleCount = options?.peopleCount ?? 0;
  const teamsCount = options?.teamsCount ?? 0;

  const summaryParts: string[] = [];
  summaryParts.push(`Department in workspace ${dept.workspaceId}.`);
  if (dept.description) {
    summaryParts.push(dept.description);
  }
  if (teamsCount > 0) summaryParts.push(`Teams: ${teamsCount}.`);
  if (peopleCount > 0) summaryParts.push(`People: ${peopleCount}.`);

  const base: ContextObject = {
    id: `department:${dept.workspaceId}:${dept.id}`,
    type: "department",
    title: dept.name,
    summary: summaryParts.join(" ").trim() || `Department: ${dept.name}`,
    tags: [
      "department",
      `workspace:${dept.workspaceId}`,
      `department:${dept.id}`,
      ...(dept.isActive ? ["status:active"] : ["status:inactive"]),
    ],
    relations: [],
    owner: null,
    status: dept.isActive ? "ACTIVE" : "INACTIVE",
    updatedAt: dept.updatedAt.toISOString(),
  };

  return validateContextObject(base);
}

export function buildTeamContext(
  team: OrgTeamInput,
  options?: {
    peopleCount?: number;
    positionsCount?: number;
  }
): ContextObject {
  const peopleCount = options?.peopleCount ?? 0;
  const positionsCount = options?.positionsCount ?? 0;

  const summaryParts: string[] = [];
  if (team.departmentId) {
    summaryParts.push(`Team in department ${team.departmentId}.`);
  } else {
    summaryParts.push(`Unassigned team.`);
  }
  if (team.description) {
    summaryParts.push(team.description);
  }
  if (peopleCount > 0) summaryParts.push(`People: ${peopleCount}.`);
  if (positionsCount > 0) summaryParts.push(`Positions: ${positionsCount}.`);

  const relations: ContextRelation[] = [];
  if (team.departmentId) {
    relations.push({
      type: "member_of_department",
      sourceId: `team:${team.workspaceId}:${team.id}`,
      targetId: `department:${team.workspaceId}:${team.departmentId}`,
      label: "Team belongs to department",
    });
  }

  const tags: string[] = [
    "team",
    `workspace:${team.workspaceId}`,
    `team:${team.id}`,
    ...(team.isActive ? ["status:active"] : ["status:inactive"]),
  ];
  if (team.departmentId) {
    tags.push(`department:${team.departmentId}`);
  }

  const base: ContextObject = {
    id: `team:${team.workspaceId}:${team.id}`,
    type: "team",
    title: team.name,
    summary: summaryParts.join(" ").trim() || `Team: ${team.name}`,
    tags,
    relations,
    owner: null,
    status: team.isActive ? "ACTIVE" : "INACTIVE",
    updatedAt: team.updatedAt.toISOString(),
  };

  return validateContextObject(base);
}

export function buildPositionContext(position: OrgPositionInput): ContextObject {
  const labelParts: string[] = [];
  labelParts.push(position.title || "Untitled Position");
  if (typeof position.level === "number") {
    labelParts.push(`L${position.level}`);
  }

  const summaryParts: string[] = [];
  summaryParts.push("Org position.");
  if (position.roleDescription) {
    summaryParts.push(position.roleDescription);
  }

  const tags: string[] = [
    "role",
    `workspace:${position.workspaceId}`,
    `position:${position.id}`,
  ];
  if (typeof position.level === "number") {
    tags.push(`level:${position.level}`);
  }
  if (position.teamId) {
    tags.push(`team:${position.teamId}`);
  }
  if (position.userId) {
    tags.push(`user:${position.userId}`);
  }
  tags.push(position.isActive ? "status:active" : "status:inactive");

  const relations: ContextRelation[] = [];

  if (position.teamId) {
    relations.push({
      type: "member_of_team",
      sourceId: `role:${position.workspaceId}:position:${position.id}`,
      targetId: `team:${position.workspaceId}:${position.teamId}`,
      label: "Role is part of team",
    });
  }

  if (position.userId) {
    relations.push({
      type: "owned_by",
      sourceId: `role:${position.workspaceId}:position:${position.id}`,
      targetId: `person:${position.workspaceId}:${position.userId}`,
      label: "Role is held by person",
    });
  }

  if (position.parentId && position.parentUserId) {
    relations.push({
      type: "reports_to",
      sourceId: `role:${position.workspaceId}:position:${position.id}`,
      targetId: `role:${position.workspaceId}:position:${position.parentId}`,
      label: "Role reports to role",
    });
  }

  const base: ContextObject = {
    id: `role:${position.workspaceId}:position:${position.id}`,
    type: "role",
    title: labelParts.join(" • "),
    summary: summaryParts.join(" ").trim() || `Role: ${position.title}`,
    tags,
    relations,
    owner: position.userId ? `person:${position.workspaceId}:${position.userId}` : null,
    status: position.isActive ? "ACTIVE" : "INACTIVE",
    updatedAt: position.updatedAt.toISOString(),
  };

  return validateContextObject(base);
}

export function buildPersonContext(person: OrgPersonInput): ContextObject {
  const title = person.name || person.email || "Unknown Person";
  const summaryParts: string[] = [
    `Person in workspace ${person.workspaceId}. Role: ${person.workspaceRole}.`,
  ];

  const tags: string[] = [
    "person",
    `workspace:${person.workspaceId}`,
    `user:${person.userId}`,
    `workspace_role:${person.workspaceRole}`,
  ];

  const relations: ContextRelation[] = [];

  if (person.primaryDepartmentId) {
    relations.push({
      type: "member_of_department",
      sourceId: `person:${person.workspaceId}:${person.userId}`,
      targetId: `department:${person.workspaceId}:${person.primaryDepartmentId}`,
      label: "Person belongs to department",
    });
    tags.push(`department:${person.primaryDepartmentId}`);
  }

  if (person.primaryTeamId) {
    relations.push({
      type: "member_of_team",
      sourceId: `person:${person.workspaceId}:${person.userId}`,
      targetId: `team:${person.workspaceId}:${person.primaryTeamId}`,
      label: "Person belongs to team",
    });
    tags.push(`team:${person.primaryTeamId}`);
  }

  if (person.primaryPositionId) {
    relations.push({
      type: "owns",
      sourceId: `person:${person.workspaceId}:${person.userId}`,
      targetId: `role:${person.workspaceId}:position:${person.primaryPositionId}`,
      label: "Person holds role",
    });
    tags.push(`position:${person.primaryPositionId}`);
  }

  const base: ContextObject = {
    id: `person:${person.workspaceId}:${person.userId}`,
    type: "person",
    title,
    summary: summaryParts.join(" ").trim() || `Person: ${title}`,
    tags,
    relations,
    owner: `person:${person.workspaceId}:${person.userId}`,
    status: "ACTIVE",
    updatedAt: person.updatedAt.toISOString(),
  };

  return validateContextObject(base);
}

