/**
 * GET/PUT/DELETE /api/org/capacity/contract/[contractId]
 * 
 * CRUD operations for a specific capacity contract.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { logOrgAudit } from "@/lib/audit/org-audit";
import { computeChanges } from "@/lib/audit/diff";
import { UpdateCapacityContractSchema } from "@/lib/validations/org";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await ctx.params;

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

    // Step 4: Fetch contract
    const contract = await prisma.capacityContract.findFirst({
      where: {
        id: contractId,
        workspaceId,
      },
      select: {
        id: true,
        personId: true,
        weeklyCapacityHours: true,
        effectiveFrom: true,
        effectiveTo: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      contract: {
        id: contract.id,
        personId: contract.personId,
        weeklyCapacityHours: contract.weeklyCapacityHours,
        effectiveFrom: contract.effectiveFrom.toISOString(),
        effectiveTo: contract.effectiveTo?.toISOString() ?? null,
        createdById: contract.createdById,
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await ctx.params;

    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (require ADMIN)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Verify contract exists
    const existing = await prisma.capacityContract.findFirst({
      where: {
        id: contractId,
        workspaceId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Step 5: Parse and validate body
    const body = UpdateCapacityContractSchema.parse(await request.json());
    const updates: {
      weeklyCapacityHours?: number;
      effectiveFrom?: Date;
      effectiveTo?: Date | null;
    } = {};

    if (body.weeklyCapacityHours !== undefined) {
      updates.weeklyCapacityHours = body.weeklyCapacityHours;
    }

    if (body.effectiveFrom !== undefined) {
      updates.effectiveFrom = new Date(body.effectiveFrom);
    }

    if (body.effectiveTo !== undefined) {
      updates.effectiveTo = body.effectiveTo ? new Date(body.effectiveTo) : null;
    }

    // Step 6: Update contract
    const updated = await prisma.capacityContract.update({
      where: { id: contractId },
      data: updates,
      select: {
        id: true,
        personId: true,
        weeklyCapacityHours: true,
        effectiveFrom: true,
        effectiveTo: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Step 7: Log audit entry (fire-and-forget)
    const changes = computeChanges(
      existing,
      updated,
      ["weeklyCapacityHours", "effectiveFrom", "effectiveTo"]
    );
    if (changes) {
      logOrgAudit({
        workspaceId,
        entityType: "CAPACITY_CONTRACT",
        entityId: updated.id,
        entityName: `Contract for ${updated.personId}`,
        action: "UPDATED",
        actorId: userId,
        changes,
      }).catch((e) => console.error("[PUT /api/org/capacity/contract/[contractId]] Audit error:", e));
    }

    return NextResponse.json({
      ok: true,
      contract: {
        id: updated.id,
        personId: updated.personId,
        weeklyCapacityHours: updated.weeklyCapacityHours,
        effectiveFrom: updated.effectiveFrom.toISOString(),
        effectiveTo: updated.effectiveTo?.toISOString() ?? null,
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
  ctx: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await ctx.params;

    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (require ADMIN)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Fetch contract for audit logging
    const existing = await prisma.capacityContract.findFirst({
      where: { id: contractId, workspaceId },
      select: { id: true, personId: true },
    });

    // Step 5: Delete contract
    const deleted = await prisma.capacityContract.deleteMany({
      where: {
        id: contractId,
        workspaceId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Step 6: Log audit entry (fire-and-forget)
    if (existing) {
      logOrgAudit({
        workspaceId,
        entityType: "CAPACITY_CONTRACT",
        entityId: contractId,
        entityName: `Contract for ${existing.personId}`,
        action: "DELETED",
        actorId: userId,
      }).catch((e) => console.error("[DELETE /api/org/capacity/contract/[contractId]] Audit error:", e));
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
