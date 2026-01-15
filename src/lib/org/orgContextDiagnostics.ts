/**
 * Org Context Diagnostics
 * 
 * Provides diagnostics and health checks for Org → ContextStore pipeline.
 * Helps verify that ContextItems are correctly populated and structured.
 */

import { prisma } from "@/lib/db";
import { ContextObject } from "@/lib/context/contextTypes";
import { isValidContextIdFormat } from "@/lib/context/contextValidation";

const ORG_CONTEXT_TYPES = ["org", "person", "team", "department", "role"] as const;

export type OrgContextDiagnosticsSummary = {
  workspaceId: string;
  counts: {
    org: number;
    people: number;
    teams: number;
    departments: number;
    roles: number;
  };
  samples: {
    org?: ContextObject;
    people: ContextObject[];
    teams: ContextObject[];
    departments: ContextObject[];
    roles: ContextObject[];
  };
  issues: {
    missingOrgRoot: boolean;
    multipleOrgRoots: boolean;
    orphanPeopleWithoutRelations: string[]; // list of contextIds
    itemsWithInvalidIdFormat: string[]; // list of contextIds
    itemsWithNoRelations: string[]; // list of contextIds
  };
};

/**
 * Get diagnostics for Org context in a workspace.
 * 
 * Returns counts, samples, and health issues for all Org-related ContextItems.
 */
export async function getOrgContextDiagnostics(
  workspaceId: string
): Promise<OrgContextDiagnosticsSummary> {
  const items = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type: { in: ORG_CONTEXT_TYPES as any },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const byType: Record<string, ContextObject[]> = {
    org: [],
    person: [],
    team: [],
    department: [],
    role: [],
  };

  const itemsWithInvalidIdFormat: string[] = [];
  const itemsWithNoRelations: string[] = [];
  const orphanPeopleWithoutRelations: string[] = [];

  for (const item of items) {
    const data = item.data as ContextObject;

    // Skip if data is not a valid ContextObject
    if (!data || typeof data !== "object" || !data.id || !data.type) {
      continue;
    }

    // Check for invalid ID format
    if (!isValidContextIdFormat(data.id)) {
      itemsWithInvalidIdFormat.push(data.id);
    }

    // Check for items with no relations
    if (!data.relations || data.relations.length === 0) {
      itemsWithNoRelations.push(data.id);
    }

    // Check for orphan people (no team/department relations)
    if (data.type === "person") {
      const hasMembershipRelation =
        data.relations?.some((rel) =>
          ["member_of_team", "member_of_department"].includes(rel.type)
        ) ?? false;
      if (!hasMembershipRelation) {
        orphanPeopleWithoutRelations.push(data.id);
      }
    }

    // Group by type
    if (byType[data.type]) {
      byType[data.type].push(data);
    }
  }

  const orgItems = byType["org"];
  const people = byType["person"];
  const teams = byType["team"];
  const departments = byType["department"];
  const roles = byType["role"];

  const missingOrgRoot = orgItems.length === 0;
  const multipleOrgRoots = orgItems.length > 1;

  return {
    workspaceId,
    counts: {
      org: orgItems.length,
      people: people.length,
      teams: teams.length,
      departments: departments.length,
      roles: roles.length,
    },
    samples: {
      org: orgItems[0],
      people: people.slice(0, 5),
      teams: teams.slice(0, 5),
      departments: departments.slice(0, 5),
      roles: roles.slice(0, 5),
    },
    issues: {
      missingOrgRoot,
      multipleOrgRoots,
      orphanPeopleWithoutRelations,
      itemsWithInvalidIdFormat,
      itemsWithNoRelations,
    },
  };
}

