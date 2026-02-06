/**
 * GET/PATCH /api/org/capacity/people/[personId]
 *
 * GET: Single person capacity detail (effective capacity + quick-entry values)
 * PATCH: Quick-entry update (weeklyHours, availabilityPct, allocationPct)
 *
 * Quick-entry writes are handled exclusively by capacityQuickEntry.ts.
 * See plan: "Destructive Write Guardrails" and "Single-Allocation Invariant".
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { resolveEffectiveCapacity } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { getDefaultIssueWindow, getWorkspaceThresholdsAsync, getCapacityResponseMeta } from "@/lib/org/capacity/thresholds";
import { getPersonCapacityStatus, type PersonCapacityMeta } from "@/lib/org/capacity/status";
import { applyQuickEntry, getQuickEntryValues } from "@/lib/org/capacity/quickEntry";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ personId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
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

    const { personId } = await context.params;
    const issueWindow = getDefaultIssueWindow();
    const settings = await getWorkspaceThresholdsAsync(workspaceId);

    // Resolve effective capacity
    const capacity = await resolveEffectiveCapacity(
      workspaceId,
      personId,
      { start: issueWindow.start, end: issueWindow.end }
    );

    // Get quick-entry form values
    const quickEntry = await getQuickEntryValues(workspaceId, personId);

    // Check data presence for meta
    const [contractCount, availCount] = await Promise.all([
      prisma.capacityContract.count({
        where: {
          workspaceId,
          personId,
          effectiveFrom: { lte: issueWindow.start },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: issueWindow.start } },
          ],
        },
      }),
      prisma.personAvailability.count({
        where: {
          workspaceId,
          personId,
          startDate: { lte: issueWindow.end },
          OR: [
            { endDate: null },
            { endDate: { gte: issueWindow.start } },
          ],
        },
      }),
    ]);

    const meta: PersonCapacityMeta = {
      isContractDefault: contractCount === 0,
      hasAvailabilityData: availCount > 0,
    };

    const status = getPersonCapacityStatus(capacity, meta, settings);

    const availableHours = capacity.contractedHoursForWindow * capacity.availabilityFactor;
    const utilizationPct = availableHours > 0
      ? capacity.allocatedHours / availableHours
      : 0;

    return NextResponse.json({
      ok: true,
      personId,
      capacity: {
        weeklyCapacityHours: capacity.weeklyCapacityHours,
        contractedHoursForWindow: capacity.contractedHoursForWindow,
        availabilityFactor: capacity.availabilityFactor,
        allocatedHours: capacity.allocatedHours,
        effectiveAvailableHours: capacity.effectiveAvailableHours,
        utilizationPct,
        confidence: capacity.confidence,
        explanation: capacity.explanation,
      },
      status,
      quickEntry,
      meta: {
        hasContract: !meta.isContractDefault,
        hasAvailability: meta.hasAvailabilityData,
      },
      responseMeta: getCapacityResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/capacity/people/[personId]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN"],
    });

    setWorkspaceContext(workspaceId);

    const { personId } = await context.params;
    const body = await request.json();

    // Validate input
    const { weeklyHours, availabilityPct, allocationPct } = body;

    if (weeklyHours !== undefined) {
      if (typeof weeklyHours !== "number" || weeklyHours < 0 || weeklyHours > 168) {
        return NextResponse.json(
          { error: "weeklyHours must be a number between 0 and 168" },
          { status: 400 }
        );
      }
    }

    if (availabilityPct !== undefined) {
      if (typeof availabilityPct !== "number" || availabilityPct < 0 || availabilityPct > 100) {
        return NextResponse.json(
          { error: "availabilityPct must be a number between 0 and 100" },
          { status: 400 }
        );
      }
    }

    if (allocationPct !== undefined) {
      if (typeof allocationPct !== "number" || allocationPct < 0 || allocationPct > 200) {
        return NextResponse.json(
          { error: "allocationPct must be a number between 0 and 200" },
          { status: 400 }
        );
      }
    }

    if (weeklyHours === undefined && availabilityPct === undefined && allocationPct === undefined) {
      return NextResponse.json(
        { error: "At least one of weeklyHours, availabilityPct, or allocationPct is required" },
        { status: 400 }
      );
    }

    const result = await applyQuickEntry(
      workspaceId,
      personId,
      { weeklyHours, availabilityPct, allocationPct },
      userId
    );

    const availableHours = result.capacity.contractedHoursForWindow * result.capacity.availabilityFactor;
    const utilizationPct = availableHours > 0
      ? result.capacity.allocatedHours / availableHours
      : 0;

    return NextResponse.json({
      ok: true,
      personId,
      capacity: {
        weeklyCapacityHours: result.capacity.weeklyCapacityHours,
        contractedHoursForWindow: result.capacity.contractedHoursForWindow,
        availabilityFactor: result.capacity.availabilityFactor,
        allocatedHours: result.capacity.allocatedHours,
        effectiveAvailableHours: result.capacity.effectiveAvailableHours,
        utilizationPct,
        explanation: result.capacity.explanation,
      },
      status: result.status,
      mutations: result.mutations,
      meta: {
        hasContract: !result.meta.isContractDefault,
        hasAvailability: result.meta.hasAvailabilityData,
      },
      responseMeta: getCapacityResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[PATCH /api/org/capacity/people/[personId]] Error:", error);

    if (error instanceof Error && (error.message.includes("Forbidden") || error.message.includes("Unauthorized"))) {
      return NextResponse.json({ error: error.message || "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
