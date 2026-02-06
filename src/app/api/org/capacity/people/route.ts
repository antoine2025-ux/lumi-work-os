/**
 * GET /api/org/capacity/people
 *
 * List all workspace members with capacity data + computed fields.
 *
 * Returns per-person:
 * - Basic info (name, role, team)
 * - Effective capacity (weeklyCapacityHours, availabilityFactor, allocatedHours, effectiveAvailableHours)
 * - Status (MISSING / OK / OVERLOADED / SEVERELY_OVERLOADED / UNDERUTILIZED / ZERO_AVAILABLE)
 * - hasContract / hasAvailability booleans for missing-data detection
 *
 * Invariant: All capacity numbers originate from resolveEffectiveCapacityBatch.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { resolveEffectiveCapacityBatch } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { getDefaultIssueWindow, getWorkspaceThresholdsAsync, getCapacityResponseMeta } from "@/lib/org/capacity/thresholds";
import { getPersonCapacityStatus, type PersonCapacityMeta } from "@/lib/org/capacity/status";

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(workspaceId);

    const issueWindow = getDefaultIssueWindow();
    const settings = await getWorkspaceThresholdsAsync(workspaceId);

    // Fetch active positions with team/user info
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        archivedAt: null,
        userId: { not: null },
        user: {
          workspaceMembers: {
            some: {
              workspaceId,
              employmentStatus: { not: "TERMINATED" },
            },
          },
        },
      },
      select: {
        userId: true,
        teamId: true,
        title: true,
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Deduplicate by personId (keep first position)
    const personMap = new Map<string, (typeof positions)[0]>();
    for (const pos of positions) {
      if (pos.userId && !personMap.has(pos.userId)) {
        personMap.set(pos.userId, pos);
      }
    }

    const personIds = [...personMap.keys()];

    if (personIds.length === 0) {
      return NextResponse.json({
        ok: true,
        rows: [],
        total: 0,
        coverage: { configured: 0, total: 0, pct: 0 },
        responseMeta: getCapacityResponseMeta(),
      });
    }

    // Batch resolve capacity
    const capacityMap = await resolveEffectiveCapacityBatch(
      workspaceId,
      personIds,
      { start: issueWindow.start, end: issueWindow.end }
    );

    // Check data presence
    const [contractCounts, availabilityCounts] = await Promise.all([
      prisma.capacityContract.groupBy({
        by: ["personId"],
        where: {
          workspaceId,
          personId: { in: personIds },
          effectiveFrom: { lte: issueWindow.start },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: issueWindow.start } },
          ],
        },
        _count: true,
      }),
      prisma.personAvailability.groupBy({
        by: ["personId"],
        where: {
          workspaceId,
          personId: { in: personIds },
          startDate: { lte: issueWindow.end },
          OR: [
            { endDate: null },
            { endDate: { gte: issueWindow.start } },
          ],
        },
        _count: true,
      }),
    ]);

    const contractCountMap = new Map(contractCounts.map(c => [c.personId, c._count]));
    const availabilityCountMap = new Map(availabilityCounts.map(a => [a.personId, a._count]));

    // Build response rows
    let configuredCount = 0;
    const rows = personIds.map(personId => {
      const pos = personMap.get(personId)!;
      const capacity = capacityMap.get(personId);
      const hasContract = (contractCountMap.get(personId) ?? 0) > 0;
      const hasAvailability = (availabilityCountMap.get(personId) ?? 0) > 0;

      const meta: PersonCapacityMeta = {
        isContractDefault: !hasContract,
        hasAvailabilityData: hasAvailability,
      };

      if (hasContract || hasAvailability) {
        configuredCount++;
      }

      const status = capacity
        ? getPersonCapacityStatus(capacity, meta, settings)
        : "MISSING" as const;

      const availableHours = capacity
        ? capacity.contractedHoursForWindow * capacity.availabilityFactor
        : 0;
      const utilizationPct = availableHours > 0 && capacity
        ? capacity.allocatedHours / availableHours
        : 0;

      return {
        personId,
        name: pos.user?.name ?? null,
        email: pos.user?.email ?? null,
        title: pos.title,
        teamId: pos.teamId,
        teamName: pos.team?.name ?? null,
        weeklyCapacityHours: capacity?.weeklyCapacityHours ?? settings.defaultWeeklyHoursTarget,
        availabilityFactor: capacity?.availabilityFactor ?? 1,
        allocatedHours: capacity?.allocatedHours ?? 0,
        effectiveAvailableHours: capacity?.effectiveAvailableHours ?? 0,
        utilizationPct,
        status,
        hasContract,
        hasAvailability,
      };
    });

    return NextResponse.json({
      ok: true,
      rows,
      total: rows.length,
      coverage: {
        configured: configuredCount,
        total: rows.length,
        pct: rows.length > 0 ? Math.round((configuredCount / rows.length) * 100) : 0,
      },
      responseMeta: getCapacityResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/capacity/people] Error:", error);

    if (error instanceof Error && (error.message.includes("Forbidden") || error.message.includes("Unauthorized"))) {
      return NextResponse.json({ error: error.message || "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
