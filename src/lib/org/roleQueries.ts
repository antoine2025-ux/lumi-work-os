// src/lib/org/roleQueries.ts

import { prisma } from "@/lib/db";

type RoleContextData = {
  id: string;
  type: string;
  title: string;
  summary?: string;
  tags?: string[];
  relations?: {
    type: string;
    sourceId: string;
    targetId: string;
    label?: string;
  }[];
  owner?: string | null;
};

/**
 * Get all roles held by a specific person.
 * Finds roles where the person is the owner (via owned_by relation or owner field).
 */
export async function getRolesForPerson(
  workspaceId: string,
  personContextId: string // e.g. "person:<userId>"
) {
  const items = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type: "role",
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const result: RoleContextData[] = [];

  for (const item of items) {
    const data = item.data as Record<string, unknown>;
    if (!data || typeof data !== "object") continue;
    if (data.type !== "role") continue;

    const relations = (data.relations ?? []) as RoleContextData["relations"];

    // Check if person owns this role via owned_by relation or owner field
    const ownedByPerson =
      data.owner === personContextId ||
      (relations ?? []).some(
        (rel) =>
          rel.type === "owned_by" &&
          rel.targetId === personContextId
      );

    if (ownedByPerson) {
      result.push(data as RoleContextData);
    }
  }

  return result;
}

/**
 * Get all roles that belong to a specific team.
 * Finds roles with member_of_team relation pointing to the team.
 */
export async function getRolesForTeam(
  workspaceId: string,
  teamContextId: string // e.g. "team:<teamId>"
) {
  const items = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type: "role",
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const result: RoleContextData[] = [];

  for (const item of items) {
    const data = item.data as Record<string, unknown>;
    if (!data || typeof data !== "object") continue;
    if (data.type !== "role") continue;

    const relations = (data.relations ?? []) as RoleContextData["relations"];

    const belongsToTeam = (relations ?? []).some(
      (rel) =>
        rel.type === "member_of_team" &&
        rel.targetId === teamContextId
    );

    if (belongsToTeam) {
      result.push(data as RoleContextData);
    }
  }

  return result;
}

