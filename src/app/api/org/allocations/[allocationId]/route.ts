/**
 * GET/PUT/DELETE /api/org/allocations/[allocationId]
 * 
 * CRUD operations for a specific work allocation.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import type { AllocationContextType, AllocationSource } from "@prisma/client";
import { logOrgAudit } from "@/lib/audit/org-audit";
import { computeChanges } from "@/lib/audit/diff";
import { UpdateAllocationSchema } from "@/lib/validations/org";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ allocationId: string }> }
) {
  try {
    const { allocationId } = await ctx.params;

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

    // Step 4: Fetch allocation
    const allocation = await prisma.workAllocation.findFirst({
      where: {
        id: allocationId,
        workspaceId,
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

    if (!allocation) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      allocation: {
        id: allocation.id,
        personId: allocation.personId,
        allocationPercent: allocation.allocationPercent,
        contextType: allocation.contextType,
        contextId: allocation.contextId,
        contextLabel: allocation.contextLabel,
        startDate: allocation.startDate.toISOString(),
        endDate: allocation.endDate?.toISOString() ?? null,
        source: allocation.source,
        createdById: allocation.createdById,
        createdAt: allocation.createdAt.toISOString(),
        updatedAt: allocation.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ allocationId: string }> }
) {
  try {
    const { allocationId } = await ctx.params;

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

    // Step 4: Verify allocation exists
    const existing = await prisma.workAllocation.findFirst({
      where: {
        id: allocationId,
        workspaceId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }

    // Step 5: Parse and validate body
    const body = UpdateAllocationSchema.parse(await request.json());
    const updates: {
      allocationPercent?: number;
      contextType?: AllocationContextType;
      contextId?: string | null;
      contextLabel?: string | null;
      startDate?: Date;
      endDate?: Date | null;
      source?: AllocationSource;
    } = {};

    if (body.allocationPercent !== undefined) {
      updates.allocationPercent = body.allocationPercent;
    }

    if (body.contextType !== undefined) {
      updates.contextType = body.contextType as AllocationContextType;
    }

    if (body.contextId !== undefined) {
      updates.contextId = body.contextId;
    }

    if (body.contextLabel !== undefined) {
      updates.contextLabel = body.contextLabel;
    }

    if (body.startDate !== undefined) {
      updates.startDate = new Date(body.startDate);
    }

    if (body.endDate !== undefined) {
      updates.endDate = body.endDate ? new Date(body.endDate) : null;
    }

    if (body.source !== undefined) {
      updates.source = body.source as AllocationSource;
    }

    // Step 6: Update allocation
    const updated = await prisma.workAllocation.update({
      where: { id: allocationId },
      data: updates,
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

    // Step 7: Log audit entry (fire-and-forget)
    const changes = computeChanges(
      existing,
      updated,
      ["allocationPercent", "contextType", "contextId", "contextLabel", "startDate", "endDate", "source"]
    );
    if (changes) {
      logOrgAudit({
        workspaceId,
        entityType: "ALLOCATION",
        entityId: updated.id,
        entityName: `Allocation for ${updated.personId}`,
        action: "UPDATED",
        actorId: userId,
        changes,
      }).catch((e) => console.error("[PUT /api/org/allocations/[allocationId]] Audit error:", e));
    }

    return NextResponse.json({
      ok: true,
      allocation: {
        id: updated.id,
        personId: updated.personId,
        allocationPercent: updated.allocationPercent,
        contextType: updated.contextType,
        contextId: updated.contextId,
        contextLabel: updated.contextLabel,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate?.toISOString() ?? null,
        source: updated.source,
        createdById: updated.createdById,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ allocationId: string }> }
) {
  try {
    const { allocationId } = await ctx.params;

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

    // Step 4: Fetch allocation for audit logging
    const existing = await prisma.workAllocation.findFirst({
      where: { id: allocationId, workspaceId },
      select: { id: true, personId: true },
    });

    // Step 5: Delete allocation
    const deleted = await prisma.workAllocation.deleteMany({
      where: {
        id: allocationId,
        workspaceId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }

    // Step 6: Log audit entry (fire-and-forget)
    if (existing) {
      logOrgAudit({
        workspaceId,
        entityType: "ALLOCATION",
        entityId: allocationId,
        entityName: `Allocation for ${existing.personId}`,
        action: "DELETED",
        actorId: userId,
      }).catch((e) => console.error("[DELETE /api/org/allocations/[allocationId]] Audit error:", e));
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
