/**
 * GET/POST /api/org/allocations
 * 
 * List and create work allocations.
 * 
 * GET: List allocations for a person (query param: personId)
 * POST: Create a new work allocation
 * 
 * Note: allocationPercent is relative to contracted capacity, not raw hours.
 * Formula: allocatedHours = weeklyCapacityHours × allocationPercent
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import type { AllocationContextType, AllocationSource } from "@prisma/client";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { resolveEffectiveCapacity } from "@/lib/org/capacity/resolveEffectiveCapacity";
import {
  buildResponseMeta,
  type CapacityPatch,
  type MutationResult,
} from "@/lib/org/mutations/types";
import { computeIssueResolution } from "@/lib/org/mutations/utils";

const ALLOWED_CONTEXT_TYPES: AllocationContextType[] = ["TEAM", "PROJECT", "ROLE", "OTHER"];
const ALLOWED_SOURCES: AllocationSource[] = ["MANUAL", "INTEGRATION"];

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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

    // Step 4: Get query params
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("personId");
    const contextType = searchParams.get("contextType") as AllocationContextType | null;
    const contextId = searchParams.get("contextId");

    // Build where clause
    const where: Parameters<typeof prisma.workAllocation.findMany>[0]["where"] = {
      workspaceId,
    };

    if (personId) {
      where.personId = personId;
    }

    if (contextType && ALLOWED_CONTEXT_TYPES.includes(contextType)) {
      where.contextType = contextType;
    }

    if (contextId) {
      where.contextId = contextId;
    }

    // Step 5: Fetch allocations
    const allocations = await prisma.workAllocation.findMany({
      where,
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        personId: true,
        allocationPercent: true,
        contextType: true,
        contextId: true,
        contextLabel: true,
        startDate: true,
        endDate: true,
        source: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      allocations: allocations.map((a) => ({
        id: a.id,
        personId: a.personId,
        allocationPercent: a.allocationPercent,
        contextType: a.contextType,
        contextId: a.contextId,
        contextLabel: a.contextLabel,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate?.toISOString() ?? null,
        source: a.source,
        createdById: a.createdById,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/allocations] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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

    // Validate required fields
    if (!body.personId) {
      return NextResponse.json({ ok: false, error: "personId is required" }, { status: 400 });
    }

    if (body.allocationPercent === undefined || body.allocationPercent === null) {
      return NextResponse.json({ ok: false, error: "allocationPercent is required" }, { status: 400 });
    }

    const allocationPercent = Number(body.allocationPercent);
    if (isNaN(allocationPercent) || allocationPercent < 0 || allocationPercent > 1) {
      return NextResponse.json(
        { ok: false, error: "allocationPercent must be between 0 and 1" },
        { status: 400 }
      );
    }

    if (!body.contextType) {
      return NextResponse.json({ ok: false, error: "contextType is required" }, { status: 400 });
    }

    if (!ALLOWED_CONTEXT_TYPES.includes(body.contextType)) {
      return NextResponse.json(
        { ok: false, error: `contextType must be one of: ${ALLOWED_CONTEXT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!body.startDate) {
      return NextResponse.json({ ok: false, error: "startDate is required" }, { status: 400 });
    }

    const startDate = new Date(body.startDate);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid startDate" }, { status: 400 });
    }

    const endDate = body.endDate ? new Date(body.endDate) : null;
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid endDate" }, { status: 400 });
    }

    if (endDate && endDate <= startDate) {
      return NextResponse.json(
        { ok: false, error: "endDate must be after startDate" },
        { status: 400 }
      );
    }

    // Validate source if provided
    const source: AllocationSource = body.source ?? "MANUAL";
    if (!ALLOWED_SOURCES.includes(source)) {
      return NextResponse.json(
        { ok: false, error: `source must be one of: ${ALLOWED_SOURCES.join(", ")}` },
        { status: 400 }
      );
    }

    // Step 5: Verify person exists in workspace
    const position = await prisma.orgPosition.findFirst({
      where: {
        workspaceId,
        OR: [
          { id: body.personId },
          { userId: body.personId },
        ],
        isActive: true,
      },
      select: { userId: true },
    });

    if (!position?.userId) {
      return NextResponse.json({ ok: false, error: "Person not found in workspace" }, { status: 404 });
    }

    // Step 6: Compute issues BEFORE mutation (scoped to person)
    // TODO: Enhance to derive actual capacity issues for the person
    const issuesBefore: OrgIssueMetadata[] = [];

    // Step 7: Create the allocation
    const created = await prisma.workAllocation.create({
      data: {
        workspaceId,
        personId: position.userId,
        allocationPercent,
        contextType: body.contextType,
        contextId: body.contextId ?? null,
        contextLabel: body.contextLabel ?? null,
        startDate,
        endDate,
        source,
        createdById: userId,
      },
      select: {
        id: true,
        personId: true,
        allocationPercent: true,
        contextType: true,
        contextId: true,
        contextLabel: true,
        startDate: true,
        endDate: true,
        source: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Step 8: Compute issues AFTER mutation (same scoped set)
    // TODO: Enhance to derive actual capacity issues for the person
    const issuesAfter: OrgIssueMetadata[] = [];

    // Step 9: Build response metadata
    const responseMeta = buildResponseMeta("mutation:allocation-create:v1");

    // Step 10: Diff issues to determine active vs resolved
    const affectedIssues = computeIssueResolution(
      issuesBefore,
      issuesAfter,
      responseMeta.mutationId
    );

    // Step 11: Compute updated effective capacity for the person
    const window = {
      start: startDate,
      end: endDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const effectiveCapacity = await resolveEffectiveCapacity(workspaceId, position.userId, window);

    // Step 12: Return canonical MutationResult
    const allocationData = {
      id: created.id,
      personId: created.personId,
      allocationPercent: created.allocationPercent,
      contextType: created.contextType,
      contextId: created.contextId,
      contextLabel: created.contextLabel,
      startDate: created.startDate.toISOString(),
      endDate: created.endDate?.toISOString() ?? null,
      source: created.source,
      createdById: created.createdById,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    const response: MutationResult<typeof allocationData, CapacityPatch> = {
      ok: true,
      data: allocationData,
      patch: {
        patchVersion: 1,
        updatedEffectiveCapacity: {
          personId: position.userId,
          weeklyCapacityHours: effectiveCapacity.weeklyCapacityHours,
          effectiveAvailableHours: effectiveCapacity.effectiveAvailableHours,
          utilizationPercent: effectiveCapacity.utilizationPercent,
        },
      },
      scope: {
        entityType: "PERSON",
        entityId: position.userId,
      },
      affectedIssues,
      responseMeta,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("[POST /api/org/allocations] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
