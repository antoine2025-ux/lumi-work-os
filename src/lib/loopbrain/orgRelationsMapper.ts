import type { ContextRelation } from "./contextTypes";
import { personId, teamId, departmentId, roleId } from "./orgIds";

/**
 * Input type for building person relations.
 * Contains all Org entities needed to determine a person's relations.
 */
export type OrgPersonRelationsInput = {
  userId: string;
  positionId: string | null;
  positionTitle: string | null;
  managerPositionId: string | null;
  managerUserId: string | null;
  managerPositionTitle: string | null;
  teamId: string | null;
  teamName: string | null;
  departmentId: string | null;
  departmentName: string | null;
};

/**
 * Build canonical Org relations for a person ContextObject, following the
 * Loopwell Org ContextObject spec:
 *
 * - reports_to (if manager exists)
 * - member_of_team (if team exists)
 * - member_of_department (if department exists)
 * - has_role (if position exists)
 */
export function buildPersonOrgRelations(
  input: OrgPersonRelationsInput
): ContextRelation[] {
  const {
    userId,
    positionId,
    managerUserId,
    managerPositionTitle,
    teamId: teamDbId,
    teamName,
    departmentId: deptDbId,
    departmentName,
  } = input;

  const relations: ContextRelation[] = [];

  const personIdStr = personId(userId);

  // reports_to → manager (if manager exists)
  if (managerUserId) {
    relations.push({
      type: "reports_to",
      sourceId: personIdStr,
      targetId: personId(managerUserId),
      label: managerPositionTitle ?? "Manager",
    });
  }

  // member_of_team (if team exists)
  if (teamDbId) {
    relations.push({
      type: "member_of_team",
      sourceId: personIdStr,
      targetId: teamId(teamDbId),
      label: teamName ?? "Team",
    });
  }

  // member_of_department (if department exists)
  if (deptDbId) {
    relations.push({
      type: "member_of_department",
      sourceId: personIdStr,
      targetId: departmentId(deptDbId),
      label: departmentName ?? "Department",
    });
  }

  // has_role (if position exists)
  if (positionId) {
    relations.push({
      type: "has_role",
      sourceId: personIdStr,
      targetId: roleId(positionId),
      label: input.positionTitle ?? "Role",
    });
  }

  return relations;
}

// ---------------------------------------------------------------------------
// Team-level relations
// ---------------------------------------------------------------------------

/**
 * Input type for building team relations.
 * Contains all Org entities needed to determine a team's relations.
 */
export type OrgTeamRelationsInput = {
  teamId: string;
  departmentId: string | null;
  departmentName: string | null;
  memberUserIds: string[]; // User IDs of people in this team
};

/**
 * Build canonical Org relations for a team ContextObject:
 *
 * - has_person (team → people in the team)
 * - member_of_department (team → department)
 */
export function buildTeamOrgRelations(
  input: OrgTeamRelationsInput
): ContextRelation[] {
  const { teamId: teamDbId, departmentId: deptDbId, departmentName, memberUserIds } = input;

  const relations: ContextRelation[] = [];

  const teamIdStr = teamId(teamDbId);

  // has_person (team → people)
  for (const userId of memberUserIds) {
    relations.push({
      type: "has_person",
      sourceId: teamIdStr,
      targetId: personId(userId),
      label: "Team member",
    });
  }

  // member_of_department (team → department)
  if (deptDbId) {
    relations.push({
      type: "member_of_department",
      sourceId: teamIdStr,
      targetId: departmentId(deptDbId),
      label: departmentName ?? "Department",
    });
  }

  return relations;
}

// ---------------------------------------------------------------------------
// Department-level relations
// ---------------------------------------------------------------------------

/**
 * Input type for building department relations.
 * Contains all Org entities needed to determine a department's relations.
 */
export type OrgDepartmentRelationsInput = {
  departmentId: string;
  teamIds: string[]; // Team IDs in this department
  teamNames?: Map<string, string>; // Optional: team ID -> name mapping
  peopleUserIds?: string[]; // Optional: direct has_person mapping
};

/**
 * Build canonical Org relations for a department ContextObject:
 *
 * - has_team (department → teams)
 * - has_person (department → people, optional)
 */
export function buildDepartmentOrgRelations(
  input: OrgDepartmentRelationsInput
): ContextRelation[] {
  const { departmentId: deptDbId, teamIds, teamNames, peopleUserIds = [] } = input;

  const relations: ContextRelation[] = [];

  const departmentIdStr = departmentId(deptDbId);

  // has_team (department → teams)
  for (const teamDbId of teamIds) {
    relations.push({
      type: "has_team",
      sourceId: departmentIdStr,
      targetId: teamId(teamDbId),
      label: teamNames?.get(teamDbId) ?? "Team",
    });
  }

  // Optional: has_person (department → people)
  for (const userId of peopleUserIds) {
    relations.push({
      type: "has_person",
      sourceId: departmentIdStr,
      targetId: personId(userId),
      label: "Department member",
    });
  }

  return relations;
}

