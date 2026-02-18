import { prisma } from "@/lib/db";
import { hasOrgCapability } from "@/lib/org/capabilities";
import type { OrgPermissionContext } from "@/lib/org/permissions.server";

// TODO: Adjust these types to your real schema as needed.
export type OrgInsightsSnapshot = {
  orgId: string;
  generatedAt: string; // ISO string
  summary: {
    totalPeople: number;
    totalTeams: number;
    totalDepartments: number;
    totalRoles: number;
  };
  byDepartment: {
    departmentId: string;
    departmentName: string | null;
    headcount: number;
  }[];
  byTeam: {
    teamId: string;
    teamName: string | null;
    departmentId: string | null;
    departmentName: string | null;
    headcount: number;
  }[];
  byRole: {
    roleId: string;
    roleName: string | null;
    headcount: number;
  }[];
  joinTrend: {
    periodStart: string; // ISO date (start of week/month)
    periodEnd: string; // ISO date (end of week/month)
    newMembers: number;
  }[];
};

type OrgInsightsOptions = {
  // e.g. "month" | "week" – for now we hardcode "month" behavior
  period?: "month";
  // How many periods back (e.g. 6 months)
  periods?: number;
};

/**
 * Assert that the given permission context allows viewing Insights.
 * Throws if not allowed.
 */
export function assertCanViewInsights(ctx: OrgPermissionContext | null) {
  if (!ctx || !hasOrgCapability(ctx.role, "org:insights:view")) {
    throw new Error("Not allowed to load Org Insights snapshot.");
  }
}

/**
 * Compute a consolidated insights snapshot for a given org.
 *
 * ADAPTED TO ACTUAL SCHEMA:
 * - WorkspaceMember: basic membership (workspaceId, userId, joinedAt)
 * - OrgPosition: links users to teams (workspaceId, userId, teamId, title)
 * - OrgTeam: teams (workspaceId, departmentId, name)
 * - OrgDepartment: departments (workspaceId, name)
 * - RoleCard: roles (workspaceId, roleName) - linked via OrgPosition.positionId
 */
export async function getOrgInsightsSnapshot(
  orgId: string,
  ctx: OrgPermissionContext | null,
  opts: OrgInsightsOptions = {}
): Promise<OrgInsightsSnapshot> {
  // Server-side guard: prevent accidental snapshot loading for Members
  assertCanViewInsights(ctx);
  const period = opts.period ?? "month";
  const periods = opts.periods ?? 6;

  if (!prisma) {
    throw new Error("Prisma client not available");
  }

  // 1) Load core data sets in parallel.
  // Wrap each query individually to handle errors gracefully
  const [membershipsResult, positionsResult, teamsResult, departmentsResult, roleCardsResult] =
    await Promise.allSettled([
      // WorkspaceMember: basic org membership
      prisma.workspaceMember.findMany({
        where: { workspaceId: orgId },
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          joinedAt: true,
        },
      }),
      // OrgPosition: links users to teams/roles
      // Only get positions that have a userId (are occupied)
      // Use a safer approach: fetch all active positions and filter in memory if needed
      (async () => {
        try {
          // Construct query object explicitly to ensure Prisma can validate it
          const whereClause = {
            workspaceId: orgId,
            isActive: true,
          };
          const selectClause = {
            id: true,
            userId: true,
            teamId: true,
            title: true,
            // Note: positionId doesn't exist on OrgPosition model
            // RoleCard links via OrgPosition.id, not a separate positionId field
          };
          
          const allPositions = await prisma.orgPosition.findMany({
            where: whereClause,
            select: selectClause,
          });
          // Filter to only positions with a userId (occupied positions)
          return allPositions.filter(p => p.userId !== null);
        } catch (error: any) {
          console.error('[getOrgInsightsSnapshot] Failed to load positions:', error);
          // Return empty array on any error to prevent page crash
          return [];
        }
      })(),
      // OrgTeam: teams with department relationships
      prisma.orgTeam.findMany({
        where: { workspaceId: orgId, isActive: true },
        select: {
          id: true,
          name: true,
          departmentId: true,
        },
      }),
      // OrgDepartment: departments
      prisma.orgDepartment.findMany({
        where: { workspaceId: orgId, isActive: true },
        select: {
          id: true,
          name: true,
        },
      }),
      // RoleCard: role definitions (optional, for role-based insights)
      // Handle gracefully if model doesn't exist yet
      // RoleCard.positionId links to OrgPosition.id (not a field on OrgPosition)
      (async () => {
        try {
          return await (prisma as any).roleCard.findMany({
            where: { workspaceId: orgId },
            select: {
              id: true,
              roleName: true,
              positionId: true, // This is the OrgPosition.id that this RoleCard links to
            },
          });
        } catch (error: any) {
          // If model doesn't exist yet (before migrations), return empty array
          if (error?.message?.includes('roleCard') || error?.code === 'P2025') {
            return [];
          }
          throw error;
        }
      })(),
    ]);

  // Extract results from Promise.allSettled, handling errors gracefully
  const memberships = membershipsResult.status === 'fulfilled' ? membershipsResult.value : [];
  const positions = positionsResult.status === 'fulfilled' ? positionsResult.value : [];
  const teams = teamsResult.status === 'fulfilled' ? teamsResult.value : [];
  const departments = departmentsResult.status === 'fulfilled' ? departmentsResult.value : [];
  const roleCards = roleCardsResult.status === 'fulfilled' ? roleCardsResult.value : [];

  // Log errors if any occurred
  if (membershipsResult.status === 'rejected') {
    console.error('[getOrgInsightsSnapshot] Failed to load memberships:', membershipsResult.reason);
  }
  if (positionsResult.status === 'rejected') {
    console.error('[getOrgInsightsSnapshot] Failed to load positions:', positionsResult.reason);
  }
  if (teamsResult.status === 'rejected') {
    console.error('[getOrgInsightsSnapshot] Failed to load teams:', teamsResult.reason);
  }
  if (departmentsResult.status === 'rejected') {
    console.error('[getOrgInsightsSnapshot] Failed to load departments:', departmentsResult.reason);
  }
  if (roleCardsResult.status === 'rejected') {
    console.error('[getOrgInsightsSnapshot] Failed to load roleCards:', roleCardsResult.reason);
  }

  // Helpers for name lookups
  const deptById = new Map(
    departments.map((d) => [d.id, { id: d.id, name: d.name ?? null }])
  );
  const teamById = new Map(
    teams.map((t) => [
      t.id,
      {
        id: t.id,
        name: t.name ?? null,
        departmentId: t.departmentId ?? null,
      },
    ])
  );
  const roleCardByPositionId = new Map(
    roleCards
      .filter((rc: typeof roleCards[0]) => rc.positionId)
      .map((rc: typeof roleCards[0]) => [rc.positionId!, { id: rc.id, roleName: rc.roleName }])
  );

  // 2) Summary metrics
  const totalPeople = memberships.length;
  const totalTeams = teams.length;
  const totalDepartments = departments.length;
  const totalRoles = roleCards.length;

  // 3) Headcount by department
  // Count positions grouped by team's departmentId
  const deptCounts = new Map<string, number>();
  for (const pos of positions) {
    if (!pos.teamId) continue;

    const team = teamById.get(pos.teamId);
    if (!team || !team.departmentId) continue;

    deptCounts.set(team.departmentId, (deptCounts.get(team.departmentId) ?? 0) + 1);
  }

  const byDepartment = Array.from(deptCounts.entries())
    .map(([departmentId, headcount]) => {
      const d = deptById.get(departmentId);
      return {
        departmentId,
        departmentName: d?.name ?? null,
        headcount,
      };
    })
    .sort((a, b) => b.headcount - a.headcount); // Sort by headcount descending

  // 4) Headcount by team
  const teamCounts = new Map<string, number>();
  for (const pos of positions) {
    if (!pos.teamId) continue;
    teamCounts.set(pos.teamId, (teamCounts.get(pos.teamId) ?? 0) + 1);
  }

  const byTeam = Array.from(teamCounts.entries())
    .map(([teamId, headcount]) => {
      const t = teamById.get(teamId);
      const departmentId = t?.departmentId ?? null;
      const dept = departmentId ? deptById.get(departmentId) : null;

      return {
        teamId,
        teamName: t?.name ?? null,
        departmentId,
        departmentName: dept?.name ?? null,
        headcount,
      };
    })
    .sort((a, b) => b.headcount - a.headcount); // Sort by headcount descending

  // 5) Headcount by role
  // Use RoleCard if position.id links to one, otherwise use position title
  // RoleCard.positionId links to OrgPosition.id (not a field on OrgPosition)
  const roleCounts = new Map<string, { name: string; count: number }>();
  for (const pos of positions) {
    let roleName: string | null = null;

    // Try to get role from RoleCard first (RoleCard.positionId -> OrgPosition.id)
    const roleCard = roleCardByPositionId.get(pos.id);
    if (roleCard) {
      roleName = roleCard.roleName;
    }

    // Fallback to position title if no RoleCard
    if (!roleName && pos.title) {
      roleName = pos.title;
    }

    if (!roleName) continue;

    const existing = roleCounts.get(roleName);
    if (existing) {
      existing.count += 1;
    } else {
      roleCounts.set(roleName, { name: roleName, count: 1 });
    }
  }

  const byRole = Array.from(roleCounts.entries())
    .map(([roleName, data]) => ({
      roleId: roleName, // Use roleName as ID for now
      roleName: data.name,
      headcount: data.count,
    }))
    .sort((a, b) => b.headcount - a.headcount); // Sort by headcount descending

  // 6) Join trend (last N months)
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // first day of next month
  const buckets: { start: Date; end: Date }[] = [];

  for (let i = periods - 1; i >= 0; i--) {
    const start = new Date(endDate);
    start.setMonth(start.getMonth() - (i + 1));
    const end = new Date(endDate);
    end.setMonth(end.getMonth() - i);
    buckets.push({ start, end });
  }

  const joinTrend = buckets.map((bucket) => {
    const { start, end } = bucket;
    const count = memberships.filter((m) => {
      const joined =
        m.joinedAt instanceof Date ? m.joinedAt : new Date(m.joinedAt as any);
      return joined >= start && joined < end;
    }).length;

    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      newMembers: count,
    };
  });

  return {
    orgId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalPeople,
      totalTeams,
      totalDepartments,
      totalRoles,
    },
    byDepartment,
    byTeam,
    byRole,
    joinTrend,
  };
}

