import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export type OrgContextStatus = {
  workspaceId: string;
  counts: {
    department: number;
    team: number;
    role: number;
    person: number;
    total: number;
  };
  lastUpdatedAt: {
    department: string | null;
    team: string | null;
    role: string | null;
    person: string | null;
    overall: string | null;
  };
};

/**
 * Get high-level Org → ContextItem status for the current workspace.
 */
export async function getOrgContextStatusForCurrentWorkspace(): Promise<OrgContextStatus> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new Error('No workspace found');
  }

  const types = ["department", "team", "role", "person"] as const;

  const [items] = await Promise.all([
    prisma.contextItem.findMany({
      where: {
        workspaceId,
        type: { in: types as unknown as string[] },
      },
      select: {
        type: true,
        updatedAt: true,
      },
    }),
  ]);

  const countsMap: Record<string, number> = {
    department: 0,
    team: 0,
    role: 0,
    person: 0,
  };

  const latestUpdatedMap: Record<string, Date | null> = {
    department: null,
    team: null,
    role: null,
    person: null,
  };

  for (const item of items) {
    const type = item.type;

    if (!countsMap[type]) {
      countsMap[type] = 0;
    }

    countsMap[type] += 1;

    const prev = latestUpdatedMap[type];
    if (!prev || item.updatedAt > prev) {
      latestUpdatedMap[type] = item.updatedAt;
    }
  }

  const overallDates: Date[] = [];
  for (const t of types) {
    const d = latestUpdatedMap[t];
    if (d) overallDates.push(d);
  }

  const lastUpdatedAt = {
    department: latestUpdatedMap.department
      ? latestUpdatedMap.department.toISOString()
      : null,
    team: latestUpdatedMap.team ? latestUpdatedMap.team.toISOString() : null,
    role: latestUpdatedMap.role ? latestUpdatedMap.role.toISOString() : null,
    person: latestUpdatedMap.person ? latestUpdatedMap.person.toISOString() : null,
    overall:
      overallDates.length > 0
        ? new Date(
            Math.max(...overallDates.map((d) => d.getTime()))
          ).toISOString()
        : null,
  };

  const counts = {
    department: countsMap.department,
    team: countsMap.team,
    role: countsMap.role,
    person: countsMap.person,
    total:
      countsMap.department +
      countsMap.team +
      countsMap.role +
      countsMap.person,
  };

  return {
    workspaceId,
    counts,
    lastUpdatedAt,
  };
}

