// src/lib/loopbrain/org/buildOrgLoopbrainContextBundle.ts

import type {
  OrgLoopbrainContextBundle,
  OrgLoopbrainContextObject,
  OrgLoopbrainRelation,
} from "./types";

import {
  loadCurrentWorkspaceOrgContextBundle,
} from "@/lib/context/org/loadCurrentWorkspaceOrgContextBundle";

import type {
  OrgContextBundle,
  ContextItemRecord,
} from "@/lib/context/org/loadOrgContextBundle";

import type { RoleContext } from "@/lib/org/context/roleContextTypes";

/**
 * Minimal shapes of context.data we expect for person/team/department/role.
 * These mirror the Org ContextObject v2.1-style structures we're storing.
 * We only type the fields we actually read.
 */

interface PersonContextData {
  person?: {
    id?: string;
    name?: string | null;
  };
  position?: {
    teamId?: string | null;
    departmentId?: string | null;
  };
  relationships?: {
    managerId?: string | null;
    directReportIds?: string[];
    teamId?: string | null;
    departmentId?: string | null;
  };
  team?: {
    id?: string | null;
    name?: string | null;
  };
  department?: {
    id?: string | null;
    name?: string | null;
  };
}

interface TeamContextData {
  team?: {
    id?: string;
    name?: string;
    departmentId?: string | null;
    memberIds?: string[];
  };
  orgPlacement?: {
    departmentId?: string | null;
    departmentName?: string | null;
  };
}


interface RoleContextData {
  role?: {
    id?: string;
    title?: string;
    isActive?: boolean;
  };
  orgPlacement?: {
    teamId?: string | null;
    teamName?: string | null;
    departmentId?: string | null;
    departmentName?: string | null;
  };
  holders?: {
    activeHolderIds?: string[];
  };
}

/**
 * Internal helper: map a ContextItemRecord -> OrgLoopbrainContextObject id.
 * Stable ID rules:
 *  - org           → "org"
 *  - department:X  → "department:" + contextId
 *  - team:X        → "team:" + contextId
 *  - role:X        → "role:" + contextId
 *  - person:X      → "person:" + contextId
 */
function makeOrgLoopbrainId(
  type: string,
  contextId: string
): string {
  switch (type) {
    case "org":
      return "org";
    case "department":
      return `department:${contextId}`;
    case "team":
      return `team:${contextId}`;
    case "role":
      return `role:${contextId}`;
    case "person":
      return `person:${contextId}`;
    default:
      return `${type}:${contextId}`;
  }
}

/**
 * Basic tag helper: derive semantic tags from ContextItem.
 * Later we can enrich this with data-based tags (team/department etc).
 */
function buildTagsForItem(
  item: ContextItemRecord
): string[] {
  const tags: string[] = [];

  tags.push("org_graph");
  tags.push(`type:${item.type}`);
  tags.push(`context_id:${item.contextId}`);

  if (item.type === "org") {
    tags.push("root:org");
  }

  return tags;
}

/**
 * Build base OrgLoopbrainContextObject from a ContextItemRecord.
 * Relations are attached in later passes.
 */
function buildNodeFromContextItem(
  item: ContextItemRecord
): OrgLoopbrainContextObject {
  const id = makeOrgLoopbrainId(item.type, item.contextId);
  const status: "ACTIVE" | "INACTIVE" | "ARCHIVED" = "ACTIVE";

  return {
    id,
    type: item.type as OrgLoopbrainContextObject["type"],
    title: item.title || id,
    summary:
      item.summary ||
      "Org context node derived from ContextItem in Loopwell's Context Store.",
    tags: buildTagsForItem(item),
    relations: [],
    owner: null,
    status,
    updatedAt: item.updatedAt.toISOString(),
  };
}

/**
 * Safe relation attachment helper.
 */
function addRelation(
  nodesById: Map<string, OrgLoopbrainContextObject>,
  relation: OrgLoopbrainRelation
) {
  const source = nodesById.get(relation.sourceId);
  const target = nodesById.get(relation.targetId);
  if (!source || !target) return;

  source.relations.push(relation);
}

/**
 * Attach basic org-level relations:
 *  - org → departments (has_department)
 *  - org → teams (has_team)
 *  - org → roles (has_role)
 *  - org → people (has_person)
 */
function attachBasicOrgRelations(
  bundle: OrgContextBundle,
  nodesById: Map<string, OrgLoopbrainContextObject>
) {
  const orgItem = bundle.org;
  if (!orgItem) return;

  const orgNodeId = makeOrgLoopbrainId("org", orgItem.contextId);
  const orgNode = nodesById.get(orgNodeId);
  if (!orgNode) return;

  for (const d of bundle.departments) {
    const targetId = makeOrgLoopbrainId("department", d.contextId);
    addRelation(nodesById, {
      type: "has_department",
      sourceId: orgNode.id,
      targetId,
      label: "Org has department",
    });
  }

  for (const t of bundle.teams) {
    const targetId = makeOrgLoopbrainId("team", t.contextId);
    addRelation(nodesById, {
      type: "has_team",
      sourceId: orgNode.id,
      targetId,
      label: "Org has team",
    });
  }

  for (const r of bundle.roles) {
    const targetId = makeOrgLoopbrainId("role", r.contextId);
    addRelation(nodesById, {
      type: "has_role",
      sourceId: orgNode.id,
      targetId,
      label: "Org has role",
    });
  }

  for (const p of bundle.people) {
    const targetId = makeOrgLoopbrainId("person", p.contextId);
    addRelation(nodesById, {
      type: "has_person",
      sourceId: orgNode.id,
      targetId,
      label: "Org has person",
    });
  }
}

/**
 * Attach PERSON ↔ TEAM ↔ DEPARTMENT and MANAGER ↔ REPORT relations
 * based on ContextItem.data payloads.
 */
function attachPersonTeamDepartmentRelations(
  bundle: OrgContextBundle,
  nodesById: Map<string, OrgLoopbrainContextObject>
) {
  // Build quick lookup by contextId for teams, departments, and people
  const teamCtxIdToNodeId = new Map<string, string>();
  const deptCtxIdToNodeId = new Map<string, string>();
  const personCtxIdToNodeId = new Map<string, string>();

  for (const t of bundle.teams) {
    const nodeId = makeOrgLoopbrainId("team", t.contextId);
    teamCtxIdToNodeId.set(t.contextId, nodeId);
  }
  for (const d of bundle.departments) {
    const nodeId = makeOrgLoopbrainId("department", d.contextId);
    deptCtxIdToNodeId.set(d.contextId, nodeId);
  }
  for (const p of bundle.people) {
    const nodeId = makeOrgLoopbrainId("person", p.contextId);
    personCtxIdToNodeId.set(p.contextId, nodeId);
  }

  for (const personItem of bundle.people) {
    const personNodeId = makeOrgLoopbrainId(
      "person",
      personItem.contextId
    );

    const data = (personItem.data ?? {}) as PersonContextData;

    const teamId =
      data.relationships?.teamId ??
      data.position?.teamId ??
      data.team?.id ??
      null;

    const departmentId =
      data.relationships?.departmentId ??
      data.position?.departmentId ??
      data.department?.id ??
      null;

    // PERSON ↔ TEAM
    if (teamId) {
      const teamNodeId = teamCtxIdToNodeId.get(teamId);
      if (teamNodeId) {
        addRelation(nodesById, {
          type: "member_of_team",
          sourceId: personNodeId,
          targetId: teamNodeId,
          label: "Person is member of team",
        });

        addRelation(nodesById, {
          type: "has_member",
          sourceId: teamNodeId,
          targetId: personNodeId,
          label: "Team has member",
        });
      }
    }

    // PERSON ↔ DEPARTMENT
    if (departmentId) {
      const deptNodeId = deptCtxIdToNodeId.get(departmentId);
      if (deptNodeId) {
        addRelation(nodesById, {
          type: "member_of_department",
          sourceId: personNodeId,
          targetId: deptNodeId,
          label: "Person is member of department",
        });

        addRelation(nodesById, {
          type: "has_member",
          sourceId: deptNodeId,
          targetId: personNodeId,
          label: "Department has member",
        });
      }
    }

    // MANAGER ↔ REPORT
    const managerId = data.relationships?.managerId ?? null;
    if (managerId) {
      const managerNodeId = personCtxIdToNodeId.get(managerId);
      if (managerNodeId) {
        addRelation(nodesById, {
          type: "reports_to",
          sourceId: personNodeId,
          targetId: managerNodeId,
          label: "Person reports to manager",
        });

        addRelation(nodesById, {
          type: "manages",
          sourceId: managerNodeId,
          targetId: personNodeId,
          label: "Manager manages report",
        });
      }
    }

    // Optional: explicit direct reports if present
    const directReportIds = data.relationships?.directReportIds ?? [];
    for (const reportId of directReportIds) {
      const reportNodeId = personCtxIdToNodeId.get(reportId);
      if (!reportNodeId) continue;

      addRelation(nodesById, {
        type: "manages",
        sourceId: personNodeId,
        targetId: reportNodeId,
        label: "Manager manages report",
      });

      addRelation(nodesById, {
        type: "reports_to",
        sourceId: reportNodeId,
        targetId: personNodeId,
        label: "Person reports to manager",
      });
    }
  }

  // TEAM ↔ DEPARTMENT (if not already covered)
  for (const teamItem of bundle.teams) {
    const teamNodeId = makeOrgLoopbrainId(
      "team",
      teamItem.contextId
    );
    const data = (teamItem.data ?? {}) as TeamContextData;

    const departmentId =
      data.orgPlacement?.departmentId ??
      data.team?.departmentId ??
      null;

    if (departmentId) {
      const deptNodeId = deptCtxIdToNodeId.get(departmentId);
      if (deptNodeId) {
        addRelation(nodesById, {
          type: "member_of_department",
          sourceId: teamNodeId,
          targetId: deptNodeId,
          label: "Team belongs to department",
        });

        addRelation(nodesById, {
          type: "has_team",
          sourceId: deptNodeId,
          targetId: teamNodeId,
          label: "Department has team",
        });
      }
    }
  }
}

/**
 * Attach ROLE ↔ TEAM ↔ DEPARTMENT relations based on RoleContextData.
 */
function attachRolePlacementRelations(
  bundle: OrgContextBundle,
  nodesById: Map<string, OrgLoopbrainContextObject>
) {
  const teamCtxIdToNodeId = new Map<string, string>();
  const deptCtxIdToNodeId = new Map<string, string>();

  for (const t of bundle.teams) {
    const nodeId = makeOrgLoopbrainId("team", t.contextId);
    teamCtxIdToNodeId.set(t.contextId, nodeId);
  }
  for (const d of bundle.departments) {
    const nodeId = makeOrgLoopbrainId("department", d.contextId);
    deptCtxIdToNodeId.set(d.contextId, nodeId);
  }

  for (const roleItem of bundle.roles) {
    const roleNodeId = makeOrgLoopbrainId(
      "role",
      roleItem.contextId
    );
    const data = (roleItem.data ?? {}) as RoleContextData;

    const teamId = data.orgPlacement?.teamId ?? null;
    const deptId = data.orgPlacement?.departmentId ?? null;

    if (teamId) {
      const teamNodeId = teamCtxIdToNodeId.get(teamId);
      if (teamNodeId) {
        addRelation(nodesById, {
          type: "member_of_team",
          sourceId: roleNodeId,
          targetId: teamNodeId,
          label: "Role belongs to team",
        });

        addRelation(nodesById, {
          type: "has_role",
          sourceId: teamNodeId,
          targetId: roleNodeId,
          label: "Team has role",
        });
      }
    }

    if (deptId) {
      const deptNodeId = deptCtxIdToNodeId.get(deptId);
      if (deptNodeId) {
        addRelation(nodesById, {
          type: "member_of_department",
          sourceId: roleNodeId,
          targetId: deptNodeId,
          label: "Role belongs to department",
        });

        addRelation(nodesById, {
          type: "has_role",
          sourceId: deptNodeId,
          targetId: roleNodeId,
          label: "Department has role",
        });
      }
    }
  }
}

/**
 * Attach all detailed org relations in the graph, including:
 *  - org → departments/teams/roles/people
 *  - person ↔ team/department
 *  - team ↔ department
 *  - person ↔ manager (reports_to / manages)
 *  - role ↔ team/department
 */
function attachDetailedOrgRelations(
  bundle: OrgContextBundle,
  nodesById: Map<string, OrgLoopbrainContextObject>
) {
  // 1) Keep basic org root relations
  attachBasicOrgRelations(bundle, nodesById);

  // 2) Person ↔ Team ↔ Department ↔ Manager relations
  attachPersonTeamDepartmentRelations(bundle, nodesById);

  // 3) Role ↔ Team ↔ Department
  attachRolePlacementRelations(bundle, nodesById);
}

/**
 * Public helper:
 * - Loads OrgContextBundle from the current workspace
 * - Converts it into OrgLoopbrainContextBundle
 * - Attaches detailed org relations
 */
export async function buildOrgLoopbrainContextBundleForCurrentWorkspace(): Promise<OrgLoopbrainContextBundle> {
  const { bundle } = await loadCurrentWorkspaceOrgContextBundle();

  return buildOrgLoopbrainContextBundleFromStore(bundle);
}

/**
 * Public helper that accepts workspaceId directly (useful for orchestrator contexts):
 * - Loads OrgContextBundle for a specific workspace
 * - Converts it into OrgLoopbrainContextBundle
 * - Attaches detailed org relations
 * - Builds RoleContexts from Prisma data and maps them to ContextObjects (in-memory only for now)
 */
export async function buildOrgLoopbrainContextBundleForWorkspace(
  workspaceId: string
): Promise<OrgLoopbrainContextBundle> {
  const { loadOrgContextBundle } = await import("@/lib/context/org/loadOrgContextBundle");
  const bundle = await loadOrgContextBundle(workspaceId);

  // Build RoleContexts from Prisma data and map to ContextObjects
  // Then persist them as ContextItems in the DB
  let roleContexts: RoleContext[] = [];
  let roleContextObjects: OrgLoopbrainContextObject[] = [];
  try {
    const {
      buildRoleContextsFromWorkspace,
      mapRoleContextToContextObject,
    } = await import("@/lib/org/context");
    const { upsertRoleContextItems } = await import(
      "@/lib/context/contextItemStore"
    );

    roleContexts = await buildRoleContextsFromWorkspace(workspaceId);
    roleContextObjects = roleContexts.map((rc) =>
      mapRoleContextToContextObject(rc)
    );

    // Persist role ContextObjects to Context Store
    if (roleContextObjects.length > 0) {
      try {
        const savedItems = await upsertRoleContextItems(
          workspaceId,
          roleContextObjects
        );

        // Log for debugging (dev-only)
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[OrgBundle] Persisted ${savedItems.length} role ContextItems to Context Store`
          );
        }
      } catch (err: unknown) {
        // Fail-safe: log but do not crash Org bundle building
        console.error(
          "[OrgBundle] Failed to upsert role context items",
          err
        );
      }
    }

    // Log for debugging (dev-only)
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[OrgBundle] roleContextObjects sample",
        roleContextObjects.slice(0, 3).map((obj) => ({
          id: obj.id,
          type: obj.type,
          title: obj.title,
          summaryLength: obj.summary.length,
          tagsCount: obj.tags.length,
          relationsCount: obj.relations.length,
          owner: obj.owner,
        }))
      );
    }
  } catch (error: unknown) {
    // Silently fail if RoleContext building fails (dev-only feature)
    if (process.env.NODE_ENV === "development") {
      console.warn("[OrgBundle] Failed to build RoleContexts:", error);
    }
  }

  // Load stored role ContextItems from Context Store and merge with in-memory ones
  let storedRoleContextItems: OrgLoopbrainContextObject[] = [];
  try {
    const { getRoleContextItemsForWorkspace } = await import(
      "@/lib/context/contextItemQueries"
    );
    storedRoleContextItems = await getRoleContextItemsForWorkspace(workspaceId);

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[OrgBundle] Loaded ${storedRoleContextItems.length} role ContextItems from Context Store`
      );
    }
  } catch (error: unknown) {
    // Fail-safe: log but continue without stored roles
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[OrgBundle] Failed to load stored role ContextItems:",
        error
      );
    }
  }

  // Merge in-memory and stored role ContextObjects (in-memory wins as freshest)
  const roleContextById = new Map<string, OrgLoopbrainContextObject>();

  // First, add stored roles
  for (const ctx of storedRoleContextItems) {
    if (ctx.id && ctx.type === "role") {
      roleContextById.set(ctx.id, ctx);
    }
  }

  // Then, add in-memory roles (they overwrite stored ones if IDs collide)
  for (const ctx of roleContextObjects) {
    if (ctx.id && ctx.type === "role") {
      roleContextById.set(ctx.id, ctx);
    }
  }

  const mergedRoleContextObjects = Array.from(roleContextById.values());

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[OrgBundle] Merged ${mergedRoleContextObjects.length} role ContextObjects (${roleContextObjects.length} in-memory, ${storedRoleContextItems.length} stored)`
    );
  }

  // Build bundle with role relations attached
  const loopbrainBundle = buildOrgLoopbrainContextBundleFromStore(
    bundle,
    roleContexts,
    mergedRoleContextObjects
  );

  // Attach roleContexts and roleContextObjects to bundle for inspection (temporary, until L6 Step 5)
  // @ts-expect-error - Adding temporary fields for inspection
  loopbrainBundle._roleContexts = roleContexts;
  // @ts-expect-error - Adding temporary fields for inspection
  loopbrainBundle._roleContextObjects = roleContextObjects;

  // Log sample nodes with role relations (dev-only)
  if (process.env.NODE_ENV === "development" && roleContexts.length > 0) {
    const sampleTeam = loopbrainBundle.related.find((n) => n.type === "team");
    const sampleDepartment = loopbrainBundle.related.find(
      (n) => n.type === "department"
    );
    const samplePerson = loopbrainBundle.related.find(
      (n) => n.type === "person"
    );
    const sampleRole = loopbrainBundle.related.find((n) => n.type === "role");

    console.log("[OrgBundle] team sample", {
      id: sampleTeam?.id,
      title: sampleTeam?.title,
      hasRoleRelations: sampleTeam?.relations.filter((r) => r.type === "has_role")
        .length,
      relationsCount: sampleTeam?.relations.length,
    });
    console.log("[OrgBundle] department sample", {
      id: sampleDepartment?.id,
      title: sampleDepartment?.title,
      hasRoleRelations: sampleDepartment?.relations.filter(
        (r) => r.type === "has_role"
      ).length,
      relationsCount: sampleDepartment?.relations.length,
    });
    console.log("[OrgBundle] person sample", {
      id: samplePerson?.id,
      title: samplePerson?.title,
      ownsRelations: samplePerson?.relations.filter((r) => r.type === "owns")
        .length,
      relationsCount: samplePerson?.relations.length,
    });
    console.log("[OrgBundle] role sample", {
      id: sampleRole?.id,
      title: sampleRole?.title,
      relationsCount: sampleRole?.relations.length,
      relations: sampleRole?.relations.map((r) => ({
        type: r.type,
        targetId: r.targetId,
      })),
    });
  }

  return loopbrainBundle;
}

/**
 * Attach role relations to team, department, person, and org nodes.
 * This adds reverse edges (has_role, owns, owned_by) to connect roles into the wider Org graph.
 */
function attachRoleRelationsToNodes(
  roleContexts: RoleContext[],
  nodesById: Map<string, OrgLoopbrainContextObject>
) {
  // Build lookup maps for efficient role assignment
  const rolesByTeamId = new Map<string, RoleContext[]>();
  const rolesByDepartmentId = new Map<string, RoleContext[]>();
  const rolesByUserId = new Map<string, RoleContext[]>();

  for (const role of roleContexts) {
    if (!role.id) continue;

    if (role.teamId) {
      const list = rolesByTeamId.get(role.teamId) ?? [];
      list.push(role);
      rolesByTeamId.set(role.teamId, list);
    }

    if (role.departmentId) {
      const list = rolesByDepartmentId.get(role.departmentId) ?? [];
      list.push(role);
      rolesByDepartmentId.set(role.departmentId, list);
    }

    if (role.userId) {
      const list = rolesByUserId.get(role.userId) ?? [];
      list.push(role);
      rolesByUserId.set(role.userId, list);
    }
  }

  // Add has_role relations to teams
  for (const [teamId, roles] of rolesByTeamId.entries()) {
    const teamNodeId = makeOrgLoopbrainId("team", teamId);
    const teamNode = nodesById.get(teamNodeId);
    if (teamNode) {
      for (const role of roles) {
        addRelation(nodesById, {
          type: "has_role",
          sourceId: teamNodeId,
          targetId: role.id,
          label: "Team has role",
        });
      }
    }
  }

  // Add has_role relations to departments
  for (const [departmentId, roles] of rolesByDepartmentId.entries()) {
    const departmentNodeId = makeOrgLoopbrainId("department", departmentId);
    const departmentNode = nodesById.get(departmentNodeId);
    if (departmentNode) {
      for (const role of roles) {
        addRelation(nodesById, {
          type: "has_role",
          sourceId: departmentNodeId,
          targetId: role.id,
          label: "Department has role",
        });
      }
    }
  }

  // Add owns/owned_by relations to people
  for (const [userId, roles] of rolesByUserId.entries()) {
    const personNodeId = makeOrgLoopbrainId("person", userId);
    const personNode = nodesById.get(personNodeId);
    if (personNode) {
      for (const role of roles) {
        // owns: person → role
        addRelation(nodesById, {
          type: "owns",
          sourceId: personNodeId,
          targetId: role.id,
          label: "Person holds role",
        });

        // owned_by: role → person (already added from role side, but ensure it exists)
        const roleNode = nodesById.get(role.id);
        if (roleNode) {
          // Check if relation already exists
          const hasOwnedBy = roleNode.relations.some(
            (r) =>
              r.type === "owned_by" &&
              r.sourceId === role.id &&
              r.targetId === personNodeId
          );
          if (!hasOwnedBy) {
            addRelation(nodesById, {
              type: "owned_by",
              sourceId: role.id,
              targetId: personNodeId,
              label: "Role held by person",
            });
          }
        }
      }
    }
  }

  // Optionally: Add has_role relations to org node
  const orgNode = nodesById.get("org");
  if (orgNode && roleContexts.length > 0) {
    for (const role of roleContexts) {
      if (!role.id) continue;
      addRelation(nodesById, {
        type: "has_role",
        sourceId: "org",
        targetId: role.id,
        label: "Org has role",
      });
    }
  }
}

/**
 * Pure transformer: OrgContextBundle -> OrgLoopbrainContextBundle.
 * Useful for unit tests and internal orchestration.
 * 
 * Optionally accepts roleContexts to enhance nodes with role relations.
 */
export function buildOrgLoopbrainContextBundleFromStore(
  bundle: OrgContextBundle,
  roleContexts?: RoleContext[],
  mergedRoleContextObjects?: OrgLoopbrainContextObject[]
): OrgLoopbrainContextBundle {
  const nodesById = new Map<string, OrgLoopbrainContextObject>();

  // 1) Org
  if (bundle.org) {
    const orgNode = buildNodeFromContextItem(bundle.org);
    nodesById.set(orgNode.id, orgNode);
  }

  // 2) Departments
  for (const d of bundle.departments) {
    const node = buildNodeFromContextItem(d);
    nodesById.set(node.id, node);
  }

  // 3) Teams
  for (const t of bundle.teams) {
    const node = buildNodeFromContextItem(t);
    nodesById.set(node.id, node);
  }

  // 4) Roles (from ContextItems - legacy roles from old ContextItem format)
  for (const r of bundle.roles) {
    const node = buildNodeFromContextItem(r);
    nodesById.set(node.id, node);
  }

  // 5) People
  for (const p of bundle.people) {
    const node = buildNodeFromContextItem(p);
    nodesById.set(node.id, node);
  }

  // 6) Add merged role ContextObjects (from RoleContext + Context Store)
  // These are the new canonical role representations with full relations
  if (mergedRoleContextObjects && mergedRoleContextObjects.length > 0) {
    for (const roleObj of mergedRoleContextObjects) {
      // Only add if not already present (avoid duplicates with legacy roles)
      if (!nodesById.has(roleObj.id)) {
        nodesById.set(roleObj.id, roleObj);
      } else {
        // In-memory merged roles take precedence over legacy roles
        nodesById.set(roleObj.id, roleObj);
      }
    }
  }

  // 7) Attach detailed org relations
  attachDetailedOrgRelations(bundle, nodesById);

  // 8) Attach role relations (has_role, owns, owned_by) if roleContexts provided
  if (roleContexts && roleContexts.length > 0) {
    attachRoleRelationsToNodes(roleContexts, nodesById);
  }

  // 9) Build final bundle structure
  const allNodes = Array.from(nodesById.values());

  const primary =
    bundle.org != null
      ? nodesById.get(
          makeOrgLoopbrainId("org", bundle.org.contextId)
        ) ?? null
      : null;

  const byId: Record<string, OrgLoopbrainContextObject> = {};
  for (const node of allNodes) {
    byId[node.id] = node;
  }

  const related = primary
    ? allNodes.filter((n) => n.id !== primary.id)
    : allNodes;

  return {
    primary,
    related,
    byId,
  };
}
