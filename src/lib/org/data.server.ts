/**
 * Server-only data loaders for Org Center pages.
 * These functions can only be called from Server Components or Route Handlers.
 * 
 * PERFORMANCE: 
 * - Heavy loaders are wrapped with React.cache() to deduplicate requests within a single render cycle.
 * - TTL-based caching (1-5 min) reduces database load across requests.
 */

import { cache } from "react";
import { prisma } from "@/lib/db";
import type { OrgPermissionContext } from "@/lib/org/permissions.server";
import type {
  OrgPerson,
  StructureTeam,
  StructureDepartment,
  StructureRole,
  OrgAdminActivityItem,
} from "@/types/org";
import { listOrgAuditForOrg } from "@/lib/orgAudit";
import { getOrgInsightsSnapshot } from "@/lib/org/insights";
import type { OrgInsightsSnapshot } from "@/lib/org/insights";
import { withTTLCache, cacheKeys } from "./cache.server";
import { logQueryDuration } from "./query-performance";
import { timeOrgLoader } from "./observability.server";

export type OrgOverviewStats = {
  peopleCount: number;
  teamCount: number;
  departmentCount: number;
  openInvitesCount: number;
};

/**
 * Load overview stats for an org.
 * 
 * PERFORMANCE: 
 * - Cached per-request (React.cache) to avoid duplicate queries.
 * - TTL cache (1 min) for cross-request reuse.
 */
const _getOrgOverviewStats = async (
  orgId: string,
  userId: string | null = null
): Promise<OrgOverviewStats> => {
  return timeOrgLoader("getOrgOverviewStats", orgId, userId, async () => {
    return logQueryDuration("getOrgOverviewStats", async () => {
      const [peopleCount, teamCount, departmentCount, openInvitesResult] =
        await Promise.allSettled([
          prisma.workspaceMember.count({
            where: { workspaceId: orgId },
          }),
          prisma.orgTeam.count({
            where: { workspaceId: orgId, isActive: true },
          }),
          prisma.orgDepartment.count({
            where: { workspaceId: orgId, isActive: true },
          }),
          prisma.orgInvitation.count({
            where: {
              workspaceId: orgId,
              status: "PENDING",
            },
          }).catch(() => 0), // Gracefully handle if table doesn't exist
        ]);

      const peopleCountValue = peopleCount.status === "fulfilled" ? peopleCount.value : 0;
      const teamCountValue = teamCount.status === "fulfilled" ? teamCount.value : 0;
      const departmentCountValue = departmentCount.status === "fulfilled" ? departmentCount.value : 0;
      const openInvitesCount = openInvitesResult.status === "fulfilled" ? openInvitesResult.value : 0;

      return {
        peopleCount: peopleCountValue,
        teamCount: teamCountValue,
        departmentCount: departmentCountValue,
        openInvitesCount,
      };
    }, 100);
  });
};

// Apply both React.cache (request deduplication) and TTL cache (cross-request)
export const getOrgOverviewStats = cache(
  withTTLCache(
    _getOrgOverviewStats,
    (...args: Parameters<typeof _getOrgOverviewStats>) => cacheKeys.orgOverviewStats(args[0]),
    60 * 1000 // 1 min TTL
  )
);
// Note: userId is passed for observability but not used in cache key (org-level stats)

/**
 * Load people directory for an org with pagination.
 * 
 * PERFORMANCE: 
 * - Cached per-request (React.cache) to avoid duplicate queries.
 * - TTL cache (2 min) for cross-request reuse.
 * - Paginated to handle large orgs efficiently (50 per page).
 * - Optimized selects to reduce over-fetching.
 */
const _getOrgPeople = async (
  orgId: string,
  userId: string | null = null,
  filters?: {
    q?: string;
    teamId?: string;
    departmentId?: string;
    roleId?: string;
    page?: number;
    limit?: number;
  }
): Promise<{
  items: OrgPerson[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  return timeOrgLoader("getOrgPeople", orgId, userId, async () => {
    return logQueryDuration("getOrgPeople", async () => {
    const PAGE_SIZE = filters?.limit || 50;
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const skip = (page - 1) * PAGE_SIZE;

    // Get total count for pagination
    const totalCount = await prisma.workspaceMember.count({
      where: {
        workspaceId: orgId,
      },
    });

    // Get paginated workspace members with optimized select
    const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: orgId,
    },
    select: {
      userId: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
    skip,
    take: PAGE_SIZE,
  });

  // Build filter conditions for positions
  const positionFilters: any = {
    workspaceId: orgId,
    isActive: true,
    userId: {
      not: null,
    },
  };

  if (filters?.teamId) {
    positionFilters.teamId = filters.teamId;
  }

  if (filters?.departmentId) {
    positionFilters.team = {
      departmentId: filters.departmentId,
    };
  }

  if (filters?.q) {
    positionFilters.OR = [
      { user: { name: { contains: filters.q, mode: "insensitive" } } },
      { user: { email: { contains: filters.q, mode: "insensitive" } } },
      { title: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  // Get positions with users assigned (optimized select, no deep includes)
  const positionsWithUsers = await prisma.orgPosition.findMany({
    where: positionFilters,
    select: {
      id: true,
      userId: true,
      title: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          departmentId: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Build map from userId -> position info
  const userIdToPosition = new Map<
    string,
    {
      role: string;
      teamId: string | null;
      team: string | null;
      departmentId: string | null;
      department: string | null;
    }
  >();

  for (const pos of positionsWithUsers) {
    if (!pos.user) continue;
    if (userIdToPosition.has(pos.user.id)) continue;

    userIdToPosition.set(pos.user.id, {
      role: pos.title,
      teamId: pos.team?.id ?? null,
      team: pos.team?.name ?? null,
      departmentId: pos.team?.department?.id ?? null,
      department: pos.team?.department?.name ?? null,
    });
  }

  // Combine members with position info
  let people: OrgPerson[] = members.map((m) => {
    const positionInfo = userIdToPosition.get(m.userId);

    return {
      id: m.userId,
      name: m.user?.name ?? m.user?.email ?? "Unknown",
      email: m.user?.email ?? "",
      role: positionInfo?.role ?? null,
      teamId: positionInfo?.teamId ?? null,
      team: positionInfo?.team ?? null,
      departmentId: positionInfo?.departmentId ?? null,
      department: positionInfo?.department ?? null,
      location: null,
      joinedAt: m.joinedAt?.toISOString(),
    };
  });

  // Apply client-side filtering for roleId and final search pass
  if (filters?.roleId || filters?.q) {
    people = people.filter((p) => {
      if (filters.roleId && p.role && !p.role.toLowerCase().includes(filters.roleId.toLowerCase())) {
        return false;
      }

      if (filters.q) {
        const queryLower = filters.q.toLowerCase();
        const matchesSearch =
          p.name.toLowerCase().includes(queryLower) ||
          p.email.toLowerCase().includes(queryLower) ||
          (p.role && p.role.toLowerCase().includes(queryLower)) ||
          (p.team && p.team.toLowerCase().includes(queryLower)) ||
          (p.department && p.department.toLowerCase().includes(queryLower));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return {
      items: people,
      total: totalCount,
      page,
      pageSize: PAGE_SIZE,
      totalPages,
    };
    }, 200);
  });
};

// Apply both React.cache (request deduplication) and TTL cache (cross-request)
export const getOrgPeople = cache(
  withTTLCache(
    _getOrgPeople,
    (...args: Parameters<typeof _getOrgPeople>) => 
      cacheKeys.orgPeople(args[0], JSON.stringify(args[2] || {})), // args[2] is filters, args[1] is userId
    2 * 60 * 1000 // 2 min TTL
  )
);
// Note: userId is passed for observability but not used in cache key (org-level data)

/**
 * Load structure lists (teams, departments, roles) for an org.
 * 
 * PERFORMANCE: 
 * - Cached per-request (React.cache) to avoid duplicate queries.
 * - TTL cache (3 min) for cross-request reuse.
 */
const _getOrgStructureLists = async (
  orgId: string,
  userId: string | null = null
): Promise<{
  teams: StructureTeam[];
  departments: StructureDepartment[];
  roles: StructureRole[];
}> => {
  return timeOrgLoader("getOrgStructureLists", orgId, userId, async () => {
    return logQueryDuration("getOrgStructureLists", async () => {
      // Departments - optimized select (only count teams, don't fetch all)
    const departments = await prisma.orgDepartment.findMany({
      where: { workspaceId: orgId, isActive: true },
      select: {
        id: true,
        name: true,
        teams: {
          where: { isActive: true },
          select: {
            id: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Teams - optimized select (use _count instead of fetching all positions)
    const teams = await prisma.orgTeam.findMany({
      where: { workspaceId: orgId, isActive: true },
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        positions: {
          where: { isActive: true, userId: { not: null } },
          select: {
            id: true,
            level: true,
            order: true,
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: [{ level: "desc" }, { order: "asc" }],
          take: 1, // Only need first position for lead
        },
        _count: {
          select: {
            positions: {
              where: {
                isActive: true,
                userId: { not: null },
              },
            },
          },
        },
      },
      orderBy: [{ departmentId: "asc" }, { order: "asc" }, { name: "asc" }],
    });

    // Roles (using OrgPosition as roles - distinct titles) - optimized select
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId: orgId,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        level: true,
        userId: true,
        team: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { title: "asc" },
    });

    // Map departments
    const mappedDepartments: StructureDepartment[] = departments.map((d) => ({
      id: d.id,
      name: d.name,
      teamCount: d.teams.length,
    }));

    // Map teams
    const mappedTeams: StructureTeam[] = teams.map((t) => {
    const leadPosition = t.positions.find((pos) => pos.user !== null);
    const leadName = leadPosition?.user?.name ?? null;

    return {
      id: t.id,
      name: t.name,
      departmentId: t.department?.id ?? null,
      departmentName: t.department?.name ?? null,
      leadName,
      memberCount: t._count.positions,
    };
  });

    // Group positions by title to create "roles"
    const roleMap = new Map<
    string,
    {
      id: string;
      name: string;
      level: string | null;
      defaultTeamName: string | null;
      activePeopleCount: number;
    }
  >();

  for (const pos of positions) {
    const existing = roleMap.get(pos.title);
    if (existing) {
      if (pos.user) {
        existing.activePeopleCount += 1;
      }
      if (!existing.defaultTeamName && pos.team) {
        existing.defaultTeamName = pos.team.name;
      }
    } else {
      roleMap.set(pos.title, {
        id: pos.id,
        name: pos.title,
        level: pos.level != null ? pos.level.toString() : null,
        defaultTeamName: pos.team?.name ?? null,
        activePeopleCount: pos.user ? 1 : 0,
      });
    }
  }

    const mappedRoles: StructureRole[] = Array.from(roleMap.values()).map((r) => ({
    id: r.id,
    name: r.name,
    level: r.level,
    defaultTeamName: r.defaultTeamName,
    activePeopleCount: r.activePeopleCount,
  }));

    return {
      teams: mappedTeams,
      departments: mappedDepartments,
      roles: mappedRoles,
    };
    }, 200);
  });
};

// Apply both React.cache (request deduplication) and TTL cache (cross-request)
export const getOrgStructureLists = cache(
  withTTLCache(
    _getOrgStructureLists,
    (...args: Parameters<typeof _getOrgStructureLists>) => cacheKeys.orgStructure(args[0]),
    3 * 60 * 1000 // 3 min TTL
  )
);
// Note: userId is passed for observability but not used in cache key (org-level data)

/**
 * Load org chart data for an org.
 * 
 * PERFORMANCE: Cached per-request to avoid duplicate queries.
 */
export const getOrgChartData = cache(async (orgId: string): Promise<{
  departments: Array<{
    id: string;
    name: string;
    leadName: string | null;
    leadId: string | null;
    teams: Array<{
      id: string;
      name: string;
      leadName: string | null;
      headcount: number;
    }>;
  }>;
}> => {
  const departments = await prisma.orgDepartment.findMany({
    where: { workspaceId: orgId, isActive: true },
    include: {
      teams: {
        where: { isActive: true },
        include: {
          positions: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: [{ level: "desc" }, { order: "asc" }],
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return {
    departments: departments.map((dept) => {
      // Find department lead: highest-level position across all teams
      const allPositions = dept.teams.flatMap((team) =>
        team.positions
          .filter((pos) => pos.user !== null)
          .map((pos) => ({
            level: pos.level,
            userName: pos.user!.name,
            userId: pos.user!.id,
          }))
      );

      const departmentLead =
        allPositions.length > 0
          ? allPositions.sort((a, b) => b.level - a.level)[0]
          : null;

      return {
        id: dept.id,
        name: dept.name,
        leadName: departmentLead?.userName ?? null,
        leadId: departmentLead?.userId ?? null,
        teams: dept.teams.map((team) => {
          const leadPosition = team.positions.find((pos) => pos.user !== null);
          const leadName = leadPosition?.user?.name ?? null;
          const headcount = team.positions.filter((pos) => pos.user !== null).length;

          return {
            id: team.id,
            name: team.name,
            leadName,
            headcount,
          };
        }),
      };
    }),
  };
});

/**
 * Load admin activity items for an org.
 * 
 * PERFORMANCE: Cached per-request to avoid duplicate queries.
 */
export const getOrgAdminActivity = cache(async (
  orgId: string,
  userId: string | null = null,
  limit: number = 24
): Promise<OrgAdminActivityItem[]> => {
  return timeOrgLoader("getOrgAdminActivity", orgId, userId, async () => {
    try {
      const logs = await listOrgAuditForOrg(orgId, limit).catch((error) => {
        // If listOrgAuditForOrg fails (e.g., missing column), return empty array
        console.error("[getOrgAdminActivity] listOrgAuditForOrg failed:", error);
        return [];
      });

      if (!logs || logs.length === 0) {
        return [];
      }

      return logs.map((log: any) => ({
        id: log.id,
        action: log.action,
        targetType: log.entityType,
        targetId: log.entityId,
        meta: log.metadata as any,
        createdAt: log.createdAt.toISOString(),
        // Use actor if available, otherwise fall back to user
        actor: log.actor
          ? {
              id: log.actor.id,
              name: log.actor.name ?? null,
              email: log.actor.email ?? null,
            }
          : log.user
          ? {
              id: log.user.id,
              name: log.user.name ?? null,
              email: log.user.email ?? null,
            }
          : null,
      }));
    } catch (error) {
      console.error("[getOrgAdminActivity] Failed to load admin activity:", error);
      // Return empty array instead of throwing
      return [];
    }
  });
});

/**
 * Load insights snapshot for an org (requires permission context).
 * 
 * PERFORMANCE: 
 * - Cached per-request (React.cache) to avoid duplicate queries.
 * - TTL cache (5 min) for cross-request reuse (insights change less frequently).
 */
const _getOrgInsights = async (
  orgId: string,
  context: OrgPermissionContext,
  options?: { period?: "month"; periods?: number }
): Promise<OrgInsightsSnapshot> => {
  return timeOrgLoader("getOrgInsights", orgId, context.userId, async () => {
    return getOrgInsightsSnapshot(orgId, context, {
      period: options?.period ?? "month",
      periods: options?.periods ?? 6,
    });
  });
};

// Apply both React.cache (request deduplication) and TTL cache (cross-request)
export const getOrgInsights = cache(
  withTTLCache(
    _getOrgInsights,
    (...args: Parameters<typeof _getOrgInsights>) => 
      cacheKeys.orgInsights(args[0], JSON.stringify(args[2] || {})),
    5 * 60 * 1000 // 5 min TTL
  )
);

