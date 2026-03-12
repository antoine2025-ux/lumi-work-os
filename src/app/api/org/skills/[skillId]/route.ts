/**
 * PATCH/DELETE /api/org/skills/[skillId]
 * Update or delete a single skill.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { UpdateSkillSchema } from "@/lib/validations/org";

/**
 * Normalize skill name for consistent storage.
 */
function normalizeSkillName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ skillId: string }> }
) {
  try {
    const { skillId } = await ctx.params;

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

    // Step 4: Verify skill exists and belongs to workspace
    const existing = await prisma.skill.findFirst({
      where: {
        id: skillId,
        workspaceId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Step 5: Parse and validate request body
    const body = UpdateSkillSchema.parse(await request.json());
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = normalizeSkillName(String(body.name));
      if (!name) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }

      // Check for case-insensitive duplicate (exclude self)
      const duplicate = await prisma.skill.findFirst({
        where: {
          workspaceId,
          name: { equals: name, mode: "insensitive" },
          id: { not: skillId },
        },
      });

      if (duplicate) {
        return NextResponse.json({ error: "A skill with this name already exists" }, { status: 400 });
      }

      updateData.name = name;
    }

    if (body.category !== undefined) {
      updateData.category = body.category;
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    // Step 6: Update skill
    const updated = await prisma.skill.update({
      where: { id: skillId },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      skill: {
        id: updated.id,
        name: updated.name,
        category: updated.category,
        description: updated.description,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ skillId: string }> }
) {
  try {
    const { skillId } = await ctx.params;

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

    // Step 4: Verify skill exists and belongs to workspace
    const existing = await prisma.skill.findFirst({
      where: {
        id: skillId,
        workspaceId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Step 5: Check if skill is referenced
    const personSkillCount = await prisma.personSkill.count({
      where: { skillId },
    });

    const roleCardSkillCount = await prisma.roleCardSkill.count({
      where: { skillId },
    });

    if (personSkillCount > 0 || roleCardSkillCount > 0) {
      return NextResponse.json(
        {
          error: "Skill is in use",
          personSkillCount,
          roleCardSkillCount,
        },
        { status: 400 }
      );
    }

    // Step 6: Delete skill
    await prisma.skill.delete({
      where: { id: skillId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

