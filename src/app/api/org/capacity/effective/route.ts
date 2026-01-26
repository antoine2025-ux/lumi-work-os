/**
 * GET /api/org/capacity/effective
 * 
 * Get effective capacity for a single person within a time window.
 * 
 * Query params:
 * - personId: string (required)
 * - start: ISO 8601 UTC string (required)
 * - end: ISO 8601 UTC string (required)
 * 
 * Timezone Rule: All inputs/outputs are ISO 8601 strings in UTC.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Resolver
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { resolveEffectiveCapacity } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { getWorkspaceThresholds, getCapacityResponseMeta } from "@/lib/org/capacity/thresholds";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth
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

    // Step 4: Parse and validate query params
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("personId");
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    if (!personId) {
      return NextResponse.json(
        { error: "personId query parameter is required" },
        { status: 400 }
      );
    }

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "start and end query parameters are required (ISO 8601 UTC)" },
        { status: 400 }
      );
    }

    // Parse dates (must be valid ISO 8601)
    const start = new Date(startParam);
    const end = new Date(endParam);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 UTC (e.g., 2026-01-15T00:00:00.000Z)" },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "end must be after start" },
        { status: 400 }
      );
    }

    // Step 5: Resolve effective capacity
    const timeWindow = { start, end };
    const capacity = await resolveEffectiveCapacity(workspaceId, personId, timeWindow);
    const thresholds = getWorkspaceThresholds(workspaceId);

    // Step 6: Return response (all dates as ISO UTC strings)
    return NextResponse.json({
      ok: true,
      capacity: {
        personId: capacity.personId,
        timeWindow: {
          start: capacity.timeWindow.start.toISOString(),
          end: capacity.timeWindow.end.toISOString(),
        },
        weeklyCapacityHours: capacity.weeklyCapacityHours,
        contractedHoursForWindow: capacity.contractedHoursForWindow,
        availabilityFactor: capacity.availabilityFactor,
        allocatedHours: capacity.allocatedHours,
        effectiveAvailableHours: capacity.effectiveAvailableHours,
        confidence: capacity.confidence,
        explanation: capacity.explanation,
      },
      thresholds: {
        lowCapacityHoursThreshold: thresholds.lowCapacityHoursThreshold,
        overallocationThreshold: thresholds.overallocationThreshold,
        minCapacityForCoverage: thresholds.minCapacityForCoverage,
      },
      responseMeta: getCapacityResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/capacity/effective] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
