/**
 * Loopbrain Availability API
 *
 * GET: Retrieve calendar availability for a person or team
 *
 * @see src/lib/loopbrain/context-sources/calendar.ts
 * @see src/lib/loopbrain/contract/calendarAvailability.v0.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { logger } from "@/lib/logger";
import { buildLogContextFromRequest } from "@/lib/request-context";
import { handleApiError } from "@/lib/api-errors";
import {
  buildCalendarAvailability,
  buildTeamAvailabilitySnapshot,
} from "@/lib/loopbrain/context-sources/calendar";

/**
 * GET /api/loopbrain/availability
 *
 * Query parameters:
 * - personId: Get availability for a specific person (default: current user)
 * - teamId: Get availability for a team (returns TeamAvailabilitySnapshotV0)
 * - forecastDays: Number of days to forecast (default: 14)
 * - includeConflicts: Include conflict detection (default: true)
 *
 * Response: CalendarAvailabilitySnapshotV0 or TeamAvailabilitySnapshotV0
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  logger.info("Incoming request GET /api/loopbrain/availability", baseContext);

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
    const forecastDays = parseInt(searchParams.get("forecastDays") || "14", 10);
    const includeConflicts = searchParams.get("includeConflicts") !== "false";

    let result;

    if (teamId) {
      // Build team availability snapshot
      result = await buildTeamAvailabilitySnapshot(auth.workspaceId, teamId, {
        forecastDays,
        includeConflicts,
      });
    } else {
      // Build individual availability snapshot
      result = await buildCalendarAvailability(auth.workspaceId, personId, {
        forecastDays,
        includeConflicts,
      });
    }

    const durationMs = Date.now() - startTime;
    logger.info("GET /api/loopbrain/availability completed", {
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
