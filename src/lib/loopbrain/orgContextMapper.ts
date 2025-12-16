import type { ContextObject, ContextRelation } from "./contextTypes";
import { orgId, departmentId, teamId, roleId, personId } from "./orgIds";
import {
  buildPersonOrgRelations,
  buildTeamOrgRelations,
  buildDepartmentOrgRelations,
  type OrgPersonRelationsInput,
  type OrgTeamRelationsInput,
  type OrgDepartmentRelationsInput,
} from "./orgRelationsMapper";

/**
 * NOTE:
 * This file defines Org → ContextObject mapping functions.
 * L3 Step 2: Department mapping is implemented.
 * L3 Step 3: Team mapping is implemented.
 * L3 Step 4: Position mapping is implemented.
 * L3 Step 5: Person mapping is implemented.
 */

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type OrgDepartmentSource = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  updatedAt: Date;
  // counts and related stats can be threaded in as needed later
  teamCount?: number;
};

export type OrgTeamSource = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  departmentId: string | null;
  departmentName?: string | null;
  updatedAt: Date;
  memberCount?: number; // optional, used for summary/tags when available
  memberUserIds?: string[]; // User IDs of people in this team (for relation building)
};

export type OrgPositionSource = {
  id: string;
  workspaceId: string;
  title: string;
  level: number | null;
  isActive: boolean;
  teamId: string | null;
  teamName?: string | null;
  departmentId: string | null;
  departmentName?: string | null;
  userId: string | null;
  userName?: string | null;
  parentId?: string | null; // For reporting hierarchy
  parentTitle?: string | null; // Optional: parent position title
  parentUserId?: string | null; // Optional: parent position's userId
  updatedAt: Date;
  roleDescription?: string | null;
  responsibilities?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
};

export type OrgPersonSource = {
  id: string; // userId
  name: string | null;
  email: string;
  updatedAt: Date;
  primaryPosition?: OrgPositionSource | null;
};

/**
 * Utility: build a base ContextObject with shared semantics.
 * Individual mappers will fill in tags + relations.
 */
export function createBaseContextObject(
  id: string,
  type: ContextObject["type"],
  title: string,
  summary: string,
  status: ContextObject["status"],
  updatedAt: Date,
  owner: string | null = null
): ContextObject {
  return {
    id,
    type,
    title,
    summary,
    tags: [],
    relations: [],
    owner,
    status,
    updatedAt: updatedAt.toISOString(),
  };
}

/**
 * Org → ContextObject Mappers
 * ---------------------------
 * L3 Step 2: Department mapping is implemented.
 * L3 Step 3: Team mapping is implemented.
 * L3 Step 4: Position mapping is implemented.
 * L3 Step 5: Person mapping is implemented.
 */

export function mapDepartmentToContextObject(
  dept: OrgDepartmentSource,
  relations?: ContextRelation[]
): ContextObject {
  const id = departmentId(dept.id);
  const status: ContextObject["status"] = dept.isActive ? "ACTIVE" : "INACTIVE";

  const title = dept.name;
  const teamCount = typeof dept.teamCount === "number" ? dept.teamCount : undefined;

  const summaryLines: string[] = [];
  summaryLines.push(`${dept.name} department in the workspace org structure.`);
  if (dept.description) {
    summaryLines.push(dept.description);
  }
  if (typeof teamCount === "number") {
    summaryLines.push(`Contains approximately ${teamCount} team(s).`);
  }

  const summary = summaryLines.join(" ").trim();

  const tags: string[] = [];
  tags.push("org:department");
  tags.push(`workspace:${dept.workspaceId}`);
  tags.push(`department:${slugifyName(dept.name)}`);
  if (typeof teamCount === "number") {
    tags.push(`teams:${teamCount}`);
  }

  const base = createBaseContextObject(
    id,
    "department",
    title,
    summary,
    status,
    dept.updatedAt,
    null
  );

  return {
    ...base,
    tags,
    relations: relations ?? base.relations,
  };
}

export function mapTeamToContextObject(
  team: OrgTeamSource,
  relations?: ContextRelation[]
): ContextObject {
  const id = teamId(team.id);
  const status: ContextObject["status"] = team.isActive ? "ACTIVE" : "INACTIVE";

  const title = team.name;

  const summaryLines: string[] = [];
  const departmentPart = team.departmentName
    ? ` in the ${team.departmentName} department`
    : "";

  summaryLines.push(`${team.name} team${departmentPart}.`);

  if (team.description) {
    summaryLines.push(team.description);
  }

  if (typeof team.memberCount === "number") {
    summaryLines.push(`Currently has approximately ${team.memberCount} member(s).`);
  }

  const summary = summaryLines.join(" ").trim();

  const tags: string[] = [];
  tags.push("org:team");
  tags.push(`workspace:${team.workspaceId}`);
  tags.push(`team:${slugifyName(team.name)}`);

  if (team.departmentId) {
    tags.push(`departmentId:${team.departmentId}`);
  }
  if (team.departmentName) {
    tags.push(`department:${slugifyName(team.departmentName)}`);
  }
  if (typeof team.memberCount === "number") {
    tags.push(`members:${team.memberCount}`);
  }

  const base = createBaseContextObject(
    id,
    "team",
    title,
    summary,
    status,
    team.updatedAt,
    null
  );

  return {
    ...base,
    tags,
    relations: relations ?? base.relations,
  };
}

export function mapPositionToContextObject(
  position: OrgPositionSource
): ContextObject {
  const id = roleId(position.id);
  const status: ContextObject["status"] = position.isActive ? "ACTIVE" : "INACTIVE";

  const title = position.title;

  const parts: string[] = [];

  // Line 1: role + level
  if (position.level != null) {
    parts.push(`${position.title} (L${position.level}).`);
  } else {
    parts.push(`${position.title}.`);
  }

  // Line 2: team + department
  if (position.teamName && position.departmentName) {
    parts.push(
      `Role in the ${position.teamName} team within the ${position.departmentName} department.`
    );
  } else if (position.teamName) {
    parts.push(`Role in the ${position.teamName} team.`);
  } else if (position.departmentName) {
    parts.push(`Role in the ${position.departmentName} department.`);
  }

  // Line 3: brief description if any
  if (position.roleDescription) {
    parts.push(position.roleDescription);
  }

  const summary = parts.join(" ").trim();

  const tags: string[] = [];
  tags.push("org:role");
  tags.push(`workspace:${position.workspaceId}`);
  tags.push(`role:${slugifyName(position.title)}`);

  if (position.level != null) {
    tags.push(`level:L${position.level}`);
  }
  if (position.teamId) {
    tags.push(`teamId:${position.teamId}`);
  }
  if (position.teamName) {
    tags.push(`team:${slugifyName(position.teamName)}`);
  }
  if (position.departmentId) {
    tags.push(`departmentId:${position.departmentId}`);
  }
  if (position.departmentName) {
    tags.push(`department:${slugifyName(position.departmentName)}`);
  }

  if (position.userId) {
    tags.push("status:filled");
  } else {
    tags.push("status:vacant");
  }

  const owner = position.userId ? personId(position.userId) : null;

  const base = createBaseContextObject(
    id,
    "role",
    title,
    summary || position.title,
    status,
    position.updatedAt,
    owner
  );

  // Build relations for position
  const relations: ContextRelation[] = [];

  // member_of_team (position → team)
  if (position.teamId) {
    relations.push({
      type: "member_of_team",
      sourceId: id,
      targetId: teamId(position.teamId),
      label: position.teamName ?? "Team",
    });
  }

  // has_person (position → person, if position is filled)
  if (position.userId) {
    relations.push({
      type: "has_person",
      sourceId: id,
      targetId: personId(position.userId),
      label: position.userName ?? "Position holder",
    });
  }

  return {
    ...base,
    tags,
    relations,
  };
}

export function mapPersonToContextObject(
  person: OrgPersonSource
): ContextObject {
  const id = personId(person.id);
  const status: ContextObject["status"] = "ACTIVE"; // v1: treat workspace members as active

  const displayName = person.name || person.email;

  const position = person.primaryPosition ?? null;

  const roleTitle = position?.title ?? null;
  const teamName = position?.teamName ?? null;
  const departmentName = position?.departmentName ?? null;

  const title = displayName;

  const summaryParts: string[] = [];

  // Line 1: name + role
  if (roleTitle && teamName && departmentName) {
    summaryParts.push(
      `${displayName} is ${roleTitle} in the ${teamName} team within the ${departmentName} department.`
    );
  } else if (roleTitle && teamName) {
    summaryParts.push(
      `${displayName} is ${roleTitle} in the ${teamName} team.`
    );
  } else if (roleTitle) {
    summaryParts.push(`${displayName} is ${roleTitle}.`);
  } else {
    summaryParts.push(`${displayName} is a member of this workspace.`);
  }

  // Line 2: Optional note about missing assignment
  if (!position) {
    summaryParts.push(
      "No primary Org position is currently assigned to this person."
    );
  }

  const summary = summaryParts.join(" ").trim();

  const tags: string[] = [];
  tags.push("org:person");
  tags.push(`person:${slugifyName(displayName)}`);
  tags.push(`email:${person.email.toLowerCase()}`);

  if (position) {
    tags.push(`role:${slugifyName(position.title)}`);
    if (position.level != null) {
      tags.push(`level:L${position.level}`);
    }
    if (position.teamId) {
      tags.push(`teamId:${position.teamId}`);
    }
    if (position.teamName) {
      tags.push(`team:${slugifyName(position.teamName)}`);
    }
    if (position.departmentId) {
      tags.push(`departmentId:${position.departmentId}`);
    }
    if (position.departmentName) {
      tags.push(`department:${slugifyName(position.departmentName)}`);
    }
  } else {
    tags.push("role:unassigned");
  }

  const base = createBaseContextObject(
    id,
    "person",
    title,
    summary,
    status,
    person.updatedAt,
    id // person is their own owner
  );

  // Build Org relations for this person
  const relationsInput: OrgPersonRelationsInput = {
    userId: person.id,
    positionId: position?.id ?? null,
    positionTitle: position?.title ?? null,
    managerPositionId: position?.parentId ?? null,
    managerUserId: position?.parentUserId ?? null,
    managerPositionTitle: position?.parentTitle ?? null,
    teamId: position?.teamId ?? null,
    teamName: position?.teamName ?? null,
    departmentId: position?.departmentId ?? null,
    departmentName: position?.departmentName ?? null,
  };

  const orgRelations = buildPersonOrgRelations(relationsInput);

  // Merge Org relations with base relations (base.relations is empty for now, but kept for future extensibility)
  const relations: ContextRelation[] = [...base.relations, ...orgRelations];

  return {
    ...base,
    tags,
    relations,
  };
}

