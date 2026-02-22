/**
 * Org Bundle Expander
 * 
 * Provides relation-based expansion logic for Org ContextObjects.
 * Expands bundles by following relations to include related entities.
 */

import type { ContextObject } from "./contextTypes";
import type { OrgQuestionContext, OrgQuestionType } from "./org-question-types";

/**
 * Expand ContextObjects by following relations from seed IDs.
 * 
 * @param byId - Map of all available ContextObjects by ID
 * @param seedIds - Starting point IDs to expand from
 * @param relationTypes - Types of relations to follow
 * @param maxDepth - Maximum depth to traverse (default: 2)
 * @returns Set of expanded ContextObject IDs
 */
export function expandContextByRelations(
  byId: Record<string, ContextObject>,
  seedIds: string[],
  relationTypes: string[],
  maxDepth: number = 2
): Set<string> {
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [];

  // Initialize queue with seed IDs
  for (const id of seedIds) {
    if (byId[id]) {
      visited.add(id);
      queue.push({ id, depth: 0 });
    }
  }

  // BFS traversal following relations
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    const obj = byId[id];
    if (!obj || !Array.isArray(obj.relations)) continue;

    // Follow relations
    for (const rel of obj.relations) {
      if (!relationTypes.includes(rel.type)) continue;

      const nextId = rel.targetId;
      if (!nextId || visited.has(nextId)) continue;

      // Only include if the target exists in our map
      if (byId[nextId]) {
        visited.add(nextId);
        queue.push({ id: nextId, depth: depth + 1 });
      }
    }
  }

  return visited;
}

/**
 * Reverse expand: Find all ContextObjects that point TO the seed IDs.
 * Useful for finding "who reports to X" or "which teams have person X".
 * 
 * @param allObjects - All ContextObjects to search through
 * @param seedIds - Target IDs to find sources for
 * @param relationTypes - Types of relations to follow in reverse
 * @returns Set of ContextObject IDs that have relations pointing to seedIds
 */
export function reverseExpandContextByRelations(
  allObjects: ContextObject[],
  seedIds: string[],
  relationTypes: string[]
): Set<string> {
  const seedSet = new Set(seedIds);
  const found = new Set<string>();

  for (const obj of allObjects) {
    if (!Array.isArray(obj.relations)) continue;

    for (const rel of obj.relations) {
      if (
        relationTypes.includes(rel.type) &&
        seedSet.has(rel.targetId)
      ) {
        found.add(obj.id);
      }
    }
  }

  return found;
}

/**
 * Person-centric expansion strategy.
 * Expands from a person to include:
 * - Their manager (via reports_to)
 * - Their direct reports (reverse reports_to)
 * - Their team (via member_of_team)
 * - Their department (via member_of_department)
 */
export function expandPersonContext(
  byId: Record<string, ContextObject>,
  personId: string,
  allObjects: ContextObject[]
): Set<string> {
  const expanded = new Set<string>([personId]);

  // Forward expansion: manager, team, department
  const forwardIds = expandContextByRelations(
    byId,
    [personId],
    ["reports_to", "member_of_team", "member_of_department"],
    2
  );
  forwardIds.forEach(id => expanded.add(id));

  // Reverse expansion: direct reports
  const reportsIds = reverseExpandContextByRelations(
    allObjects,
    [personId],
    ["reports_to"]
  );
  reportsIds.forEach(id => expanded.add(id));

  return expanded;
}

/**
 * Team-centric expansion strategy.
 * Expands from a team to include:
 * - Team members (via has_person)
 * - Department (via member_of_department)
 * - Team members' managers (via reports_to from members)
 */
export function expandTeamContext(
  byId: Record<string, ContextObject>,
  teamId: string,
  _allObjects: ContextObject[]
): Set<string> {
  const expanded = new Set<string>([teamId]);

  // Forward expansion: department, members
  const forwardIds = expandContextByRelations(
    byId,
    [teamId],
    ["member_of_department", "has_person"],
    2
  );
  forwardIds.forEach(id => expanded.add(id));

  // Expand from members to get their managers
  const memberIds = Array.from(forwardIds).filter(id => {
    const obj = byId[id];
    return obj?.type === "person";
  });

  if (memberIds.length > 0) {
    const managerIds = expandContextByRelations(
      byId,
      memberIds,
      ["reports_to"],
      1
    );
    managerIds.forEach(id => expanded.add(id));
  }

  return expanded;
}

/**
 * Department-centric expansion strategy.
 * Expands from a department to include:
 * - All teams (via has_team)
 * - All people (via has_person)
 * - Team members (via has_person from teams)
 */
export function expandDepartmentContext(
  byId: Record<string, ContextObject>,
  departmentId: string,
  _allObjects: ContextObject[]
): Set<string> {
  const expanded = new Set<string>([departmentId]);

  // Forward expansion: teams, people
  const forwardIds = expandContextByRelations(
    byId,
    [departmentId],
    ["has_team", "has_person"],
    2
  );
  forwardIds.forEach(id => expanded.add(id));

  // Expand from teams to get their members
  const teamIds = Array.from(forwardIds).filter(id => {
    const obj = byId[id];
    return obj?.type === "team";
  });

  if (teamIds.length > 0) {
    const teamMemberIds = expandContextByRelations(
      byId,
      teamIds,
      ["has_person"],
      1
    );
    teamMemberIds.forEach(id => expanded.add(id));
  }

  return expanded;
}

/**
 * Role-centric expansion strategy.
 * Expands from a role to include:
 * - The person holding the role (via owned_by/owner)
 * - The team the role belongs to (via member_of_team)
 * - The department the role belongs to (via member_of_department)
 * - Parent role (via reports_to)
 * - Related roles in the same team/department
 */
export function expandRoleContext(
  byId: Record<string, ContextObject>,
  roleId: string,
  allObjects: ContextObject[]
): Set<string> {
  const expanded = new Set<string>([roleId]);

  // Forward expansion: team, department, owner (person)
  const forwardIds = expandContextByRelations(
    byId,
    [roleId],
    ["member_of_team", "member_of_department", "owned_by", "reports_to"],
    2
  );
  forwardIds.forEach(id => expanded.add(id));

  // Also check owner field directly
  const role = byId[roleId];
  if (role && typeof role.owner === "string" && role.owner.startsWith("person:")) {
    const ownerId = role.owner;
    if (byId[ownerId]) {
      expanded.add(ownerId);
      // Expand from owner to get their manager and team
      const ownerExpanded = expandContextByRelations(
        byId,
        [ownerId],
        ["reports_to", "member_of_team"],
        1
      );
      ownerExpanded.forEach(id => expanded.add(id));
    }
  }

  // Reverse expansion: find other roles in the same team/department
  const teamIds = Array.from(forwardIds).filter(id => {
    const obj = byId[id];
    return obj?.type === "team";
  });

  const departmentIds = Array.from(forwardIds).filter(id => {
    const obj = byId[id];
    return obj?.type === "department";
  });

  // Find roles in the same team
  for (const teamId of teamIds) {
    const teamRoles = reverseExpandContextByRelations(
      allObjects,
      [teamId],
      ["member_of_team"]
    );
    teamRoles.forEach(id => {
      if (byId[id]?.type === "role" && id !== roleId) {
        expanded.add(id);
      }
    });
  }

  // Find roles in the same department
  for (const deptId of departmentIds) {
    const deptRoles = reverseExpandContextByRelations(
      allObjects,
      [deptId],
      ["member_of_department"]
    );
    deptRoles.forEach(id => {
      if (byId[id]?.type === "role" && id !== roleId) {
        expanded.add(id);
      }
    });
  }

  return expanded;
}

/**
 * Health analysis expansion strategy.
 * Expands to include ALL teams and people for org-wide analysis.
 * Used for questions like "Are there any single-person teams?"
 */
export function expandHealthAnalysisContext(
  byId: Record<string, ContextObject>,
  allObjects: ContextObject[]
): Set<string> {
  const expanded = new Set<string>();

  // Include all teams
  const teamIds = allObjects
    .filter(obj => obj.type === "team")
    .map(obj => obj.id);
  teamIds.forEach(id => expanded.add(id));

  // Include all people
  const peopleIds = allObjects
    .filter(obj => obj.type === "person")
    .map(obj => obj.id);
  peopleIds.forEach(id => expanded.add(id));

  // Expand teams to get their members
  if (teamIds.length > 0) {
    const memberIds = expandContextByRelations(
      byId,
      teamIds,
      ["has_person"],
      1
    );
    memberIds.forEach(id => expanded.add(id));
  }

  return expanded;
}

/**
 * Expand Org bundle by question type.
 * Uses type-specific expansion strategies based on OrgQuestionType.
 */
export function expandOrgBundleByType(params: {
  orgQuestion: OrgQuestionContext | null | undefined;
  primary: ContextObject | null;
  byId: Record<string, ContextObject>;
  allObjects: ContextObject[];
}): { related: ContextObject[] } {
  const { orgQuestion, primary, byId, allObjects } = params;

  if (!primary) {
    return { related: [] };
  }

  const primaryId = primary.id;
  const type = orgQuestion?.type ?? inferTypeFromPrimary(primary);

  let expandedIds = new Set<string>();

  switch (type) {
    case "org.person": {
      // Person-focused: manager, reports, team, department
      expandedIds = expandPersonContext(byId, primaryId, allObjects);
      break;
    }

    case "org.team": {
      // Team-centric: members + department + managers
      expandedIds = expandTeamContext(byId, primaryId, allObjects);
      break;
    }

    case "org.department": {
      // Department-centric: teams + people + positions
      expandedIds = expandDepartmentContext(byId, primaryId, allObjects);
      break;
    }

    case "org.role": {
      // Role-centric: owner (person), team, department, parent role, related roles
      expandedIds = expandRoleContext(byId, primaryId, allObjects);
      break;
    }

    case "org.org":
    default: {
      // Org-wide: high fan-out, but keep depth limited
      expandedIds = expandHealthAnalysisContext(byId, allObjects);
      break;
    }
  }

  // Remove primary from related list
  expandedIds.delete(primaryId);

  const related: ContextObject[] = Array.from(expandedIds)
    .map((id) => byId[id])
    .filter((obj): obj is ContextObject => Boolean(obj));

  return { related };
}

/**
 * Infer question type from primary ContextObject.
 */
function inferTypeFromPrimary(
  primary: ContextObject | null
): OrgQuestionType {
  if (!primary) return "org.org";
  if (primary.type === "person") return "org.person";
  if (primary.type === "team") return "org.team";
  if (primary.type === "department") return "org.department";
  if (primary.type === "role") return "org.role";
  return "org.org";
}

