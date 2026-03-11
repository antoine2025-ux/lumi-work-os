/**
 * Loopbrain Workload API
 *
 * GET: Retrieve workload analysis for a person or team
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
import {
  buildWorkloadAnalysis,
  buildTeamWorkloadSnapshot,
} from "@/lib/loopbrain/workload-analysis";

/**
 * GET /api/loopbrain/workload
 *
 * Query parameters:
 * - personId: Get workload for a specific person (default: current user)
 * - teamId: Get workload for a team (returns TeamWorkloadSnapshotV0)
 * - includeNextWeek: Include next week in temporal analysis (default: true)
 * - includeWorkRequests: Include work requests (default: true)
 *
 * Response: WorkloadAnalysisSnapshotV0 or TeamWorkloadSnapshotV0
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  logger.info("Incoming request GET /api/loopbrain/workload", baseContext);

  try {
    const auth = await getUnifiedAuth(request);

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(auth.workspaceId);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const personId = searchParams.get("personId") || auth.user.userId;
    const teamId = searchParams.get("teamId");
    const includeNextWeek = searchParams.get("includeNextWeek") !== "false";
    const includeWorkRequests = searchParams.get("includeWorkRequests") !== "false";

    let result;

    if (teamId) {
      // Build team workload snapshot
      result = await buildTeamWorkloadSnapshot(auth.workspaceId, teamId);
    } else {
      // Build individual workload snapshot
      result = await buildWorkloadAnalysis(auth.workspaceId, personId, {
        includeNextWeek,
        includeWorkRequests,
      });
    }

    const durationMs = Date.now() - startTime;
    logger.info("GET /api/loopbrain/workload completed", {
      ...baseContext,
      personId: teamId ? undefined : personId,
      teamId,
      durationMs,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
