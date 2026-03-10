/**
 * POST /api/org/work/requests/[id]/acknowledge
 *
 * Acknowledge the latest recommendation for a work request.
 *
 * Semantics:
 * - "Latest" = WorkRecommendationLog with greatest createdAt for this workRequestId.
 * - Acknowledging an older log never marks newer ones as acknowledged.
 * - Staleness guard: if the latest log is older than STALENESS_THRESHOLD_MS,
 *   re-run feasibility, create a new log, and acknowledge the *new* log.
 * - Idempotent: if the latest log is already acknowledged, return ok.
 *
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { resolveWorkFeasibility } from "@/lib/org/work/resolveWorkFeasibility";
import { logWorkRecommendation } from "@/lib/org/work/logWorkRecommendation";
import type { WorkRecommendationAction } from "@prisma/client";

const STALENESS_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Step 1: Auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Get workspace member
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Step 5: Fetch work request
    const workRequest = await prisma.workRequest.findFirst({
      where: { id, workspaceId },
    });

    if (!workRequest) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    // O1: Provisional work requests cannot be acknowledged
    if (workRequest.isProvisional) {
      return NextResponse.json(
        { error: "Provisional work requests cannot be acknowledged" },
        { status: 400 }
      );
    }

    // Step 6: Find latest log
    let latestLog = await prisma.workRecommendationLog.findFirst({
      where: { workRequestId: id },
      orderBy: { createdAt: "desc" },
    });

    const now = Date.now();
    const isStale =
      latestLog && now - latestLog.createdAt.getTime() > STALENESS_THRESHOLD_MS;

    // Step 7: If no log or stale, resolve + log fresh
    if (!latestLog || isStale) {
      const result = await resolveWorkFeasibility(workspaceId, workRequest);

      latestLog = await logWorkRecommendation({
        workspaceId,
        workRequestId: id,
        action: result.recommendation.action as WorkRecommendationAction,
        reason: result.recommendation.explanation[0] ?? null,
        snapshot: {
          viableCount: result.evidence.viableCount,
          capacityGapHours: result.feasibility.capacityGapHours,
          requiredRoleType: workRequest.requiredRoleType,
          decisionDomainKey: workRequest.decisionDomainKey,
          topCandidateCount: result.candidates.length,
          evaluatedAt: result.responseMeta.generatedAt,
        },
      });
    }

    // Step 8: Idempotent — already acknowledged
    if (latestLog.acknowledgedAt) {
      return NextResponse.json({
        ok: true,
        acknowledgedAt: latestLog.acknowledgedAt.toISOString(),
      });
    }

    // Step 9: Acknowledge
    const updated = await prisma.workRecommendationLog.update({
      where: { id: latestLog.id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedById: member.id,
      },
    });

    return NextResponse.json({
      ok: true,
      acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null,
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
