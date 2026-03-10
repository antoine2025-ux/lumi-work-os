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
import { handleApiError } from "@/lib/api-errors";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { resolveEffectiveCapacity } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { getDefaultIssueWindow, getWorkspaceThresholdsAsync, getCapacityResponseMeta } from "@/lib/org/capacity/thresholds";
import { getPersonCapacityStatus, type PersonCapacityMeta } from "@/lib/org/capacity/status";
import { applyQuickEntry, getQuickEntryValues } from "@/lib/org/capacity/quickEntry";
import { prisma } from "@/lib/db";
import { CapacityQuickEntrySchema } from "@/lib/validations/org";

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

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN"],
    });

    setWorkspaceContext(workspaceId);

    const { personId } = await context.params;
    const body = CapacityQuickEntrySchema.parse(await request.json());

    const { weeklyHours, availabilityPct, allocationPct } = body;

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
    return handleApiError(error, request);
  }
}
