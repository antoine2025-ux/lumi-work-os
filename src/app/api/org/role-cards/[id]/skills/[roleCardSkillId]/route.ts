/**
 * PATCH/DELETE /api/org/role-cards/[id]/skills/[roleCardSkillId]
 * Update or remove a single role card skill.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";

const ALLOWED_TYPES = ["REQUIRED", "PREFERRED"] as const;
type RoleCardSkillType = typeof ALLOWED_TYPES[number];

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; roleCardSkillId: string }> }
) {
  try {
    const { id: roleCardId, roleCardSkillId } = await ctx.params;

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

    // Step 4: Verify role card exists and belongs to workspace
    const roleCard = await prisma.roleCard.findFirst({
      where: {
        id: roleCardId,
        workspaceId,
      },
    });

    if (!roleCard) {
      return NextResponse.json({ error: "Role card not found" }, { status: 404 });
    }

    // Step 5: Verify role card skill exists
    const existing = await prisma.roleCardSkill.findFirst({
      where: {
        id: roleCardSkillId,
        roleCardId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Role card skill not found" }, { status: 404 });
    }

    // Step 6: Parse and validate request body
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Validate type
    if (body.type !== undefined) {
      if (!ALLOWED_TYPES.includes(body.type)) {
        return NextResponse.json(
          { error: `type must be one of: ${ALLOWED_TYPES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.type = body.type;
    }

    // Validate minProficiency
    if (body.minProficiency !== undefined) {
      if (body.minProficiency === null) {
        updateData.minProficiency = null;
      } else {
        const minProficiency = Number(body.minProficiency);
        if (isNaN(minProficiency) || minProficiency < 1 || minProficiency > 5) {
          return NextResponse.json({ error: "minProficiency must be between 1 and 5" }, { status: 400 });
        }
        updateData.minProficiency = minProficiency;
      }
    }

    // Step 7: Update role card skill
    const updated = await prisma.roleCardSkill.update({
      where: { id: roleCardSkillId },
      data: updateData,
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      roleCardSkill: {
        id: updated.id,
        skillId: updated.skillId,
        skill: {
          id: updated.skill.id,
          name: updated.skill.name,
          category: updated.skill.category,
        },
        type: updated.type,
        minProficiency: updated.minProficiency,
      },
    });
  } catch (error: unknown) {
    console.error("[PATCH /api/org/role-cards/[id]/skills/[roleCardSkillId]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; roleCardSkillId: string }> }
) {
  try {
    const { id: roleCardId, roleCardSkillId } = await ctx.params;

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

    // Step 4: Verify role card exists and belongs to workspace
    const roleCard = await prisma.roleCard.findFirst({
      where: {
        id: roleCardId,
        workspaceId,
      },
    });

    if (!roleCard) {
      return NextResponse.json({ error: "Role card not found" }, { status: 404 });
    }

    // Step 5: Verify role card skill exists
    const existing = await prisma.roleCardSkill.findFirst({
      where: {
        id: roleCardSkillId,
        roleCardId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Role card skill not found" }, { status: 404 });
    }

    // Step 6: Delete role card skill
    await prisma.roleCardSkill.delete({
      where: { id: roleCardSkillId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("[DELETE /api/org/role-cards/[id]/skills/[roleCardSkillId]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

