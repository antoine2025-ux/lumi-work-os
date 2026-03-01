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
import { prisma } from "@/lib/db";
import { logOrgAudit } from "@/lib/audit/org-audit";
import { computeChanges } from "@/lib/audit/diff";

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
    console.error("[GET /api/org/capacity/contract/[contractId]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const body = await request.json();
    const updates: {
      weeklyCapacityHours?: number;
      effectiveFrom?: Date;
      effectiveTo?: Date | null;
    } = {};

    if (body.weeklyCapacityHours !== undefined) {
      const hours = Number(body.weeklyCapacityHours);
      if (isNaN(hours) || hours < 0 || hours > 168) {
        return NextResponse.json(
          { error: "weeklyCapacityHours must be between 0 and 168" },
          { status: 400 }
        );
      }
      updates.weeklyCapacityHours = hours;
    }

    if (body.effectiveFrom !== undefined) {
      const date = new Date(body.effectiveFrom);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: "Invalid effectiveFrom date" }, { status: 400 });
      }
      updates.effectiveFrom = date;
    }

    if (body.effectiveTo !== undefined) {
      if (body.effectiveTo === null) {
        updates.effectiveTo = null;
      } else {
        const date = new Date(body.effectiveTo);
        if (isNaN(date.getTime())) {
          return NextResponse.json({ error: "Invalid effectiveTo date" }, { status: 400 });
        }
        updates.effectiveTo = date;
      }
    }

    // Validate date ordering
    const from = updates.effectiveFrom ?? existing.effectiveFrom;
    const to = updates.effectiveTo !== undefined ? updates.effectiveTo : existing.effectiveTo;
    if (to && to <= from) {
      return NextResponse.json(
        { error: "effectiveTo must be after effectiveFrom" },
        { status: 400 }
      );
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
    console.error("[PUT /api/org/capacity/contract/[contractId]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    console.error("[DELETE /api/org/capacity/contract/[contractId]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
