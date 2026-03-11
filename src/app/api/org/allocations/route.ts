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
import { handleApiError } from "@/lib/api-errors";
import type { AllocationContextType, AllocationSource } from "@prisma/client";
import { AllocationCreateSchema } from "@/lib/validations/org";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { resolveEffectiveCapacity } from "@/lib/org/capacity/resolveEffectiveCapacity";
import {
  buildResponseMeta,
  type CapacityPatch,
  type MutationResult,
} from "@/lib/org/mutations/types";
import { computeIssueResolution } from "@/lib/org/mutations/utils";
import { logOrgAudit } from "@/lib/audit/org-audit";

const ALLOWED_CONTEXT_TYPES: AllocationContextType[] = ["TEAM", "PROJECT", "ROLE", "OTHER"];
const _ALLOWED_SOURCES: AllocationSource[] = ["MANUAL", "INTEGRATION"];

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
    const where: any = {
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
    return handleApiError(error, request);
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

    // Step 4: Parse and validate request body (Zod)
    const body = AllocationCreateSchema.parse(await request.json());
    const allocationPercent = body.allocationPercent;
    const startDate = new Date(body.startDate);
    const endDate = body.endDate ? new Date(body.endDate) : null;
    const source: AllocationSource = (body.source as AllocationSource) ?? "MANUAL";

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
    // TODO [BACKLOG]: Derive actual capacity issues for this person
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
    // TODO [BACKLOG]: Derive actual capacity issues for this person
    const issuesAfter: OrgIssueMetadata[] = [];

    // Step 9: Build response metadata
    const responseMeta = buildResponseMeta("mutation:allocation-create:v1");

    // Step 10: Diff issues to determine active vs resolved
    const affectedIssues = computeIssueResolution(
      issuesBefore,
      issuesAfter,
      responseMeta.mutationId
    );

    // Step 11: Log audit entry (fire-and-forget)
    logOrgAudit({
      workspaceId,
      entityType: "ALLOCATION",
      entityId: created.id,
      entityName: `Allocation for ${position.userId}`,
      action: "CREATED",
      actorId: userId,
    }).catch((e) => console.error("[POST /api/org/allocations] Audit error:", e));

    // Step 12: Compute updated effective capacity for the person
    const window = {
      start: startDate,
      end: endDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const effectiveCapacity = await resolveEffectiveCapacity(workspaceId, position.userId, window);

    // Step 13: Return canonical MutationResult
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

    const utilizationPercent = effectiveCapacity.weeklyCapacityHours > 0
      ? Math.round((effectiveCapacity.allocatedHours / effectiveCapacity.weeklyCapacityHours) * 100)
      : 0;

    const response: MutationResult<typeof allocationData, CapacityPatch> = {
      ok: true,
      data: allocationData,
      patch: {
        patchVersion: 1,
        updatedEffectiveCapacity: {
          personId: position.userId,
          weeklyCapacityHours: effectiveCapacity.weeklyCapacityHours,
          effectiveAvailableHours: effectiveCapacity.effectiveAvailableHours,
          utilizationPercent,
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
    return handleApiError(error, request);
  }
}
