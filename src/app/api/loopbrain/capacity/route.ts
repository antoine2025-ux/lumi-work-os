/**
 * Loopbrain Capacity API
 *
 * GET: Retrieve unified capacity for a person or team
 *
 * @see src/lib/loopbrain/context-sources/capacity.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { logger } from "@/lib/logger";
import { buildLogContextFromRequest } from "@/lib/request-context";
import { handleApiError } from "@/lib/api-errors";
import {
  buildUnifiedCapacity,
  buildTeamCapacitySummary,
} from "@/lib/loopbrain/context-sources/capacity";

/**
 * GET /api/loopbrain/capacity
 *
 * Query parameters:
 * - personId: Get capacity for a specific person (default: current user)
 * - teamId: Get capacity for a team (returns TeamCapacitySummaryV0)
 *
 * Response: UnifiedCapacitySnapshotV0 or TeamCapacitySummaryV0
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  logger.info("Incoming request GET /api/loopbrain/capacity", baseContext);

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

    let result;

    if (teamId) {
      // Build team capacity summary
      result = await buildTeamCapacitySummary(auth.workspaceId, teamId);
    } else {
      // Build individual capacity snapshot
      result = await buildUnifiedCapacity(auth.workspaceId, personId);
    }

    const durationMs = Date.now() - startTime;
    logger.info("GET /api/loopbrain/capacity completed", {
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
