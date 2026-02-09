/**
 * Loopbrain Workload API (by user)
 *
 * GET: Retrieve workload analysis for a user.
 * Returns WorkloadAnalysisSnapshotV0.
 *
 * @see src/lib/loopbrain/workload-analysis.ts
 * @see src/lib/loopbrain/contract/workloadAnalysis.v0.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { logger } from "@/lib/logger";
import { buildLogContextFromRequest } from "@/lib/request-context";
import { handleApiError } from "@/lib/api-errors";
import { buildWorkloadAnalysis } from "@/lib/loopbrain/workload-analysis";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  try {
    const auth = await getUnifiedAuth(request);

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(auth.workspaceId);

    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const includeNextWeek = searchParams.get("includeNextWeek") !== "false";
    const includeWorkRequests = searchParams.get("includeWorkRequests") !== "false";

    const snapshot = await buildWorkloadAnalysis(auth.workspaceId, userId, {
      includeNextWeek,
      includeWorkRequests,
    });

    logger.info("GET /api/loopbrain/workload/[userId] completed", {
      ...baseContext,
      userId,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    return handleApiError(error);
  }
}
