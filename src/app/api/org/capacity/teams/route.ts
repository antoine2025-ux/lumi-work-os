/**
 * GET /api/org/capacity/teams
 *
 * List all teams with capacity rollups.
 *
 * Returns per-team:
 * - Basic info (name, departmentId)
 * - Rollup (memberCount, availableHours, allocatedHours, utilizationPct)
 * - Status (MISSING_DATA / OK / OVERLOADED / SEVERELY_OVERLOADED / UNDERUTILIZED / NO_CAPACITY)
 * - Demand (weeklyDemandHours, demandGapHours) if TeamCapacityPlan exists
 *
 * Invariant: All numbers originate from computeAllTeamRollups.
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-errors";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { computeAllTeamRollups } from "@/lib/org/capacity/teamRollup";
import { getTeamCapacityStatus } from "@/lib/org/capacity/status";
import { getCapacityResponseMeta } from "@/lib/org/capacity/thresholds";

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

    const { teamRollups, settings } = await computeAllTeamRollups(workspaceId);

    const rows = teamRollups.map(rollup => ({
      teamId: rollup.teamId,
      teamName: rollup.teamName,
      departmentId: rollup.departmentId,
      memberCount: rollup.memberCount,
      availableHours: Math.round(rollup.availableHours * 10) / 10,
      allocatedHours: Math.round(rollup.allocatedHours * 10) / 10,
      utilizationPct: Math.round(rollup.utilizationPct * 100),
      status: getTeamCapacityStatus(rollup, settings),
      missingDataCount: rollup.missingDataCount,
      weeklyDemandHours: rollup.weeklyDemandHours,
      demandGapHours: rollup.demandGapHours != null
        ? Math.round(rollup.demandGapHours * 10) / 10
        : null,
    }));

    return NextResponse.json({
      ok: true,
      rows,
      total: rows.length,
      responseMeta: getCapacityResponseMeta(),
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
