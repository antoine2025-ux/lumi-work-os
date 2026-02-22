/**
 * GET /api/org/capacity/summary
 *
 * Aggregated capacity summary for Intelligence/Overview surfaces.
 *
 * Returns:
 * - totalPeople, configuredCount, missingCount
 * - overloadedCount, underutilizedCount
 * - teamIssueCount
 * - topIssues[] (deterministic ordering: severity > entity scope > magnitude > issueKey)
 * - coverage percentage
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { computeAllTeamRollups } from "@/lib/org/capacity/teamRollup";
import { getTeamCapacityStatus, getPersonCapacityStatus, type PersonCapacityMeta } from "@/lib/org/capacity/status";
import { resolveEffectiveCapacityBatch } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { getDefaultIssueWindow, getWorkspaceThresholdsAsync, getCapacityResponseMeta } from "@/lib/org/capacity/thresholds";
import { deriveCapacityV1Issues, type OrgIssueMetadata } from "@/lib/org/deriveIssues";

// Severity sort order for topIssues
const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1, info: 2 };
const ENTITY_SCOPE_ORDER: Record<string, number> = { TEAM: 0, DEPARTMENT: 1, PERSON: 2 };

function sortIssues(issues: OrgIssueMetadata[]): OrgIssueMetadata[] {
  return [...issues].sort((a, b) => {
    // 1. severity (critical/error > warning > info)
    const sevA = SEVERITY_ORDER[a.severity] ?? 3;
    const sevB = SEVERITY_ORDER[b.severity] ?? 3;
    if (sevA !== sevB) return sevA - sevB;

    // 2. entity scope (team before person)
    const scopeA = ENTITY_SCOPE_ORDER[a.entityType] ?? 3;
    const scopeB = ENTITY_SCOPE_ORDER[b.entityType] ?? 3;
    if (scopeA !== scopeB) return scopeA - scopeB;

    // 3. issueKey (stable tiebreaker)
    return a.issueKey.localeCompare(b.issueKey);
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["MEMBER"] });
    setWorkspaceContext(workspaceId);

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });
    const workspaceSlug = workspace?.slug ?? workspaceId;

    const issueWindow = getDefaultIssueWindow();
    const settings = await getWorkspaceThresholdsAsync(workspaceId);

    // Get team rollups (includes member capacities)
    const { teamRollups, memberCapacities: _memberCapacities } = await computeAllTeamRollups(workspaceId);

    // Also get all active people (including those not on teams) for coverage count
    const allPositions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        archivedAt: null,
        userId: { not: null },
        user: {
          workspaceMemberships: {
            some: { workspaceId, employmentStatus: { not: "TERMINATED" } },
          },
        },
      },
      select: { userId: true },
    });

    const allPersonIds = [...new Set(allPositions.map(p => p.userId!))];
    const totalPeople = allPersonIds.length;

    // Batch resolve for all people (including those not on teams)
    const capacityMap = allPersonIds.length > 0
      ? await resolveEffectiveCapacityBatch(workspaceId, allPersonIds, { start: issueWindow.start, end: issueWindow.end })
      : new Map();

    // Check data presence for all people
    const [contractCounts, availabilityCounts] = allPersonIds.length > 0
      ? await Promise.all([
          prisma.capacityContract.groupBy({
            by: ["personId"],
            where: {
              workspaceId,
              personId: { in: allPersonIds },
              effectiveFrom: { lte: issueWindow.start },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: issueWindow.start } }],
            },
            _count: true,
          }),
          prisma.personAvailability.groupBy({
            by: ["personId"],
            where: {
              workspaceId,
              personId: { in: allPersonIds },
              startDate: { lte: issueWindow.end },
              OR: [{ endDate: null }, { endDate: { gte: issueWindow.start } }],
            },
            _count: true,
          }),
        ])
      : [[], []];

    const contractCountMap = new Map(contractCounts.map(c => [c.personId, c._count]));
    const availabilityCountMap = new Map(availabilityCounts.map(a => [a.personId, a._count]));

    // Get person names
    const personNames = allPersonIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allPersonIds } },
          select: { id: true, name: true },
        })
      : [];
    const personNameMap = new Map(personNames.map(p => [p.id, p.name ?? p.id]));

    // Compute person-level stats
    let configuredCount = 0;
    let missingCount = 0;
    let overloadedPersonCount = 0;
    let underutilizedPersonCount = 0;

    const personMetas = new Map<string, PersonCapacityMeta>();
    const personMetadata = new Map<string, { name: string }>();

    for (const personId of allPersonIds) {
      const hasContract = (contractCountMap.get(personId) ?? 0) > 0;
      const hasAvailability = (availabilityCountMap.get(personId) ?? 0) > 0;
      const meta: PersonCapacityMeta = { isContractDefault: !hasContract, hasAvailabilityData: hasAvailability };

      personMetas.set(personId, meta);
      personMetadata.set(personId, { name: personNameMap.get(personId) ?? personId });

      if (hasContract || hasAvailability) {
        configuredCount++;
      } else {
        missingCount++;
      }

      const capacity = capacityMap.get(personId);
      if (capacity) {
        const status = getPersonCapacityStatus(capacity, meta, settings);
        if (status === "OVERLOADED" || status === "SEVERELY_OVERLOADED") {
          overloadedPersonCount++;
        } else if (status === "UNDERUTILIZED") {
          underutilizedPersonCount++;
        }
      }
    }

    // Compute team-level stats
    let teamIssueCount = 0;
    let overloadedTeamCount = 0;
    let underutilizedTeamCount = 0;

    for (const rollup of teamRollups) {
      const status = getTeamCapacityStatus(rollup, settings);
      if (status === "OVERLOADED" || status === "SEVERELY_OVERLOADED") {
        teamIssueCount++;
        overloadedTeamCount++;
      } else if (status === "UNDERUTILIZED") {
        teamIssueCount++;
        underutilizedTeamCount++;
      } else if (status === "MISSING_DATA" || status === "NO_CAPACITY") {
        teamIssueCount++;
      }
    }

    // Derive capacity v1 issues (missing data + team-level)
    const v1Issues = deriveCapacityV1Issues({
      timeWindow: { start: issueWindow.start, end: issueWindow.end },
      workspaceSlug,
      teamRollups,
      personMetas,
      personMetadata,
      thresholds: {
        overallocationThreshold: settings.overallocationThreshold,
        severeOverloadThresholdPct: settings.severeOverloadThresholdPct,
        underutilizedThresholdPct: settings.underutilizedThresholdPct,
        defaultWeeklyHoursTarget: settings.defaultWeeklyHoursTarget,
      },
    });

    // Sort and limit top issues
    const topIssues = sortIssues(v1Issues).slice(0, 10).map(issue => ({
      issueKey: issue.issueKey,
      type: issue.type,
      severity: issue.severity,
      entityType: issue.entityType,
      entityId: issue.entityId,
      entityName: issue.entityName,
      explanation: issue.explanation,
      fixUrl: issue.fixUrl,
      fixAction: issue.fixAction,
    }));

    return NextResponse.json({
      ok: true,
      summary: {
        totalPeople,
        configuredCount,
        missingCount,
        overloadedPersonCount,
        underutilizedPersonCount,
        overloadedTeamCount,
        underutilizedTeamCount,
        teamIssueCount,
        totalIssueCount: v1Issues.length,
        coveragePct: totalPeople > 0 ? Math.round((configuredCount / totalPeople) * 100) : 0,
      },
      topIssues,
      responseMeta: getCapacityResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/capacity/summary] Error:", error);

    if (error instanceof Error && (error.message.includes("Forbidden") || error.message.includes("Unauthorized"))) {
      return NextResponse.json({ error: error.message || "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
