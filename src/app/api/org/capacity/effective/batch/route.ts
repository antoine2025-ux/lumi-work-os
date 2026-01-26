/**
 * POST /api/org/capacity/effective/batch
 * 
 * Get effective capacity for multiple people within a time window.
 * 
 * Body:
 * {
 *   personIds: string[]  (required)
 *   start: string        (ISO 8601 UTC, required)
 *   end: string          (ISO 8601 UTC, required)
 * }
 * 
 * Timezone Rule: All inputs/outputs are ISO 8601 strings in UTC.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Resolver
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { resolveEffectiveCapacityBatch } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { getWorkspaceThresholds, getCapacityResponseMeta } from "@/lib/org/capacity/thresholds";

// Maximum number of personIds per batch request
const MAX_BATCH_SIZE = 100;

export async function POST(request: NextRequest) {
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

    // Step 4: Parse and validate request body
    const body = await request.json();

    if (!body.personIds || !Array.isArray(body.personIds)) {
      return NextResponse.json(
        { error: "personIds array is required" },
        { status: 400 }
      );
    }

    if (body.personIds.length === 0) {
      return NextResponse.json(
        { error: "personIds array must not be empty" },
        { status: 400 }
      );
    }

    if (body.personIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `personIds array must not exceed ${MAX_BATCH_SIZE} items` },
        { status: 400 }
      );
    }

    if (!body.start || !body.end) {
      return NextResponse.json(
        { error: "start and end are required (ISO 8601 UTC)" },
        { status: 400 }
      );
    }

    // Parse dates (must be valid ISO 8601)
    const start = new Date(body.start);
    const end = new Date(body.end);

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

    // Step 5: Resolve effective capacity batch
    const timeWindow = { start, end };
    const capacitiesMap = await resolveEffectiveCapacityBatch(
      workspaceId,
      body.personIds,
      timeWindow
    );
    const thresholds = getWorkspaceThresholds(workspaceId);

    // Step 6: Convert Map to object for JSON response
    const capacities: Record<string, object> = {};
    for (const [personId, capacity] of capacitiesMap) {
      capacities[personId] = {
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
      };
    }

    return NextResponse.json({
      ok: true,
      capacities,
      thresholds: {
        lowCapacityHoursThreshold: thresholds.lowCapacityHoursThreshold,
        overallocationThreshold: thresholds.overallocationThreshold,
        minCapacityForCoverage: thresholds.minCapacityForCoverage,
      },
      responseMeta: getCapacityResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[POST /api/org/capacity/effective/batch] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
