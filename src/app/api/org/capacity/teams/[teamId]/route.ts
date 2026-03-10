/**
 * GET/PATCH /api/org/capacity/teams/[teamId]
 *
 * GET: Single team rollup + member capacity breakdown
 * PATCH: Update TeamCapacityPlan.weeklyDemandHours
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-errors";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { resolveEffectiveCapacityBatch } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { getDefaultIssueWindow, getWorkspaceThresholdsAsync, getCapacityResponseMeta } from "@/lib/org/capacity/thresholds";
import { getTeamCapacityStatus, getPersonCapacityStatus, type PersonCapacityMeta } from "@/lib/org/capacity/status";
import { computeTeamCapacityRollup } from "@/lib/org/capacity/teamRollup";
import { TeamCapacityUpdateSchema } from "@/lib/validations/org";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["MEMBER"] });
    setWorkspaceContext(workspaceId);

    const { teamId } = await context.params;
    const issueWindow = getDefaultIssueWindow();
    const settings = await getWorkspaceThresholdsAsync(workspaceId);

    // Fetch team info
    const team = await prisma.orgTeam.findFirst({
      where: { id: teamId, workspaceId, isActive: true },
      select: { id: true, name: true, departmentId: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Fetch active positions on this team
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        teamId,
        isActive: true,
        archivedAt: null,
        userId: { not: null },
        user: {
          workspaceMemberships: {
            some: { workspaceId, employmentStatus: { not: "TERMINATED" } },
          },
        },
      },
      select: {
        userId: true,
        title: true,
        user: { select: { id: true, name: true } },
      },
    });

    const personIds = [...new Set(positions.map(p => p.userId!))];

    // Batch resolve capacity
    const capacityMap = personIds.length > 0
      ? await resolveEffectiveCapacityBatch(workspaceId, personIds, { start: issueWindow.start, end: issueWindow.end })
      : new Map();

    // Check data presence
    const [contractCounts, availabilityCounts] = personIds.length > 0
      ? await Promise.all([
          prisma.capacityContract.groupBy({
            by: ["personId"],
            where: {
              workspaceId,
              personId: { in: personIds },
              effectiveFrom: { lte: issueWindow.start },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: issueWindow.start } }],
            },
            _count: true,
          }),
          prisma.personAvailability.groupBy({
            by: ["personId"],
            where: {
              workspaceId,
              personId: { in: personIds },
              startDate: { lte: issueWindow.end },
              OR: [{ endDate: null }, { endDate: { gte: issueWindow.start } }],
            },
            _count: true,
          }),
        ])
      : [[], []];

    const contractCountMap = new Map(contractCounts.map(c => [c.personId, c._count]));
    const availabilityCountMap = new Map(availabilityCounts.map(a => [a.personId, a._count]));

    // Fetch team demand plan
    const teamPlan = await prisma.teamCapacityPlan.findUnique({
      where: { teamId },
      select: { weeklyDemandHours: true, notes: true },
    });

    // Build member data
    const members = positions.map(pos => {
      const personId = pos.userId!;
      const capacity = capacityMap.get(personId);
      const hasContract = (contractCountMap.get(personId) ?? 0) > 0;
      const hasAvailability = (availabilityCountMap.get(personId) ?? 0) > 0;
      const meta: PersonCapacityMeta = { isContractDefault: !hasContract, hasAvailabilityData: hasAvailability };

      const _status = capacity ? getPersonCapacityStatus(capacity, meta, settings) : "MISSING" as const;
      const availableHours = capacity ? capacity.contractedHoursForWindow * capacity.availabilityFactor : 0;
      const _utilizationPct = availableHours > 0 && capacity ? capacity.allocatedHours / availableHours : 0;

      return {
        personId,
        teamId,
        positionTitle: pos.title,
        capacity: capacity!,
        meta,
      };
    }).filter(m => m.capacity); // skip if no capacity resolved

    // Compute rollup
    const rollup = computeTeamCapacityRollup(
      teamId,
      team.name,
      team.departmentId,
      members.map(m => ({
        personId: m.personId,
        personName: positions.find(p => p.userId === m.personId)?.user?.name ?? m.personId,
        teamId: m.teamId,
        positionTitle: m.positionTitle,
        capacity: m.capacity,
        meta: m.meta,
      })),
      teamPlan
    );

    const teamStatus = getTeamCapacityStatus(rollup, settings);

    // Build member response
    const memberRows = members.map(m => {
      const pos = positions.find(p => p.userId === m.personId);
      const status = getPersonCapacityStatus(m.capacity, m.meta, settings);
      const avail = m.capacity.contractedHoursForWindow * m.capacity.availabilityFactor;
      return {
        personId: m.personId,
        name: pos?.user?.name ?? null,
        title: m.positionTitle,
        weeklyCapacityHours: m.capacity.weeklyCapacityHours,
        availabilityFactor: m.capacity.availabilityFactor,
        allocatedHours: m.capacity.allocatedHours,
        effectiveAvailableHours: m.capacity.effectiveAvailableHours,
        utilizationPct: avail > 0 ? m.capacity.allocatedHours / avail : 0,
        status,
        hasContract: !m.meta.isContractDefault,
        hasAvailability: m.meta.hasAvailabilityData,
      };
    });

    return NextResponse.json({
      ok: true,
      team: {
        teamId: rollup.teamId,
        teamName: rollup.teamName,
        departmentId: rollup.departmentId,
        memberCount: rollup.memberCount,
        availableHours: Math.round(rollup.availableHours * 10) / 10,
        allocatedHours: Math.round(rollup.allocatedHours * 10) / 10,
        utilizationPct: Math.round(rollup.utilizationPct * 100),
        status: teamStatus,
        missingDataCount: rollup.missingDataCount,
        weeklyDemandHours: rollup.weeklyDemandHours,
        demandGapHours: rollup.demandGapHours != null ? Math.round(rollup.demandGapHours * 10) / 10 : null,
        demandNotes: teamPlan?.notes ?? null,
      },
      members: memberRows,
      responseMeta: getCapacityResponseMeta(),
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const { teamId } = await context.params;
    const body = TeamCapacityUpdateSchema.parse(await request.json());

    const { weeklyDemandHours } = body;
    const notes = (body as any).notes;

    // Verify team exists
    const team = await prisma.orgTeam.findFirst({
      where: { id: teamId, workspaceId, isActive: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const plan = await prisma.teamCapacityPlan.upsert({
      where: { teamId },
      create: {
        workspaceId,
        teamId,
        weeklyDemandHours: weeklyDemandHours ?? 0,
        notes: notes ?? null,
      },
      update: {
        ...(weeklyDemandHours !== undefined && { weeklyDemandHours }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({
      ok: true,
      teamId,
      weeklyDemandHours: plan.weeklyDemandHours,
      notes: plan.notes,
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
