/**
 * PATCH/DELETE /api/org/people/[personId]/skills/[personSkillId]
 * Update or remove a single person skill.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { UpdatePersonSkillSchema } from "@/lib/validations/org";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string; personSkillId: string }> }
) {
  try {
    const { personId, personSkillId } = await ctx.params;

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

    // Step 4: Get the user ID from position
    // Handle both OrgPosition ID and User ID (personId might be either)
    let position = await prisma.orgPosition.findFirst({
      where: {
        id: personId,
        workspaceId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    // If not found by ID, personId might be a User ID - try to find by userId
    if (!position) {
      position = await prisma.orgPosition.findFirst({
        where: {
          userId: personId,
          workspaceId,
          isActive: true,
        },
        select: {
          userId: true,
        },
      });
    }

    if (!position || !position.userId) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Step 5: Verify person skill exists and belongs to this person
    const existing = await prisma.personSkill.findFirst({
      where: {
        id: personSkillId,
        workspaceId,
        personId: position.userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Person skill not found" }, { status: 404 });
    }

    // Step 6: Parse and validate request body
    const body = UpdatePersonSkillSchema.parse(await request.json());
    const updateData: Record<string, unknown> = {};

    if (body.proficiency !== undefined) {
      updateData.proficiency = body.proficiency;
    }

    if (body.source !== undefined) {
      updateData.source = body.source;

      if (body.source === "VERIFIED") {
        updateData.verifiedAt = new Date();
        updateData.verifiedById = userId;
      }
    }

    if (body.verifiedAt !== undefined) {
      if (body.verifiedAt === null) {
        updateData.verifiedAt = null;
        updateData.verifiedById = null;
      } else {
        updateData.verifiedAt = new Date(body.verifiedAt);
        updateData.verifiedById = userId;
      }
    }

    // Step 7: Update person skill
    const updated = await prisma.personSkill.update({
      where: { id: personSkillId },
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
      personSkill: {
        id: updated.id,
        skillId: updated.skillId,
        skill: {
          id: updated.skill.id,
          name: updated.skill.name,
          category: updated.skill.category,
        },
        proficiency: updated.proficiency,
        source: updated.source,
        verifiedAt: updated.verifiedAt?.toISOString() ?? null,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string; personSkillId: string }> }
) {
  try {
    const { personId, personSkillId } = await ctx.params;

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

    // Step 4: Get the user ID from position
    // Handle both OrgPosition ID and User ID (personId might be either)
    let position = await prisma.orgPosition.findFirst({
      where: {
        id: personId,
        workspaceId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    // If not found by ID, personId might be a User ID - try to find by userId
    if (!position) {
      position = await prisma.orgPosition.findFirst({
        where: {
          userId: personId,
          workspaceId,
          isActive: true,
        },
        select: {
          userId: true,
        },
      });
    }

    if (!position || !position.userId) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Step 5: Verify person skill exists and belongs to this person
    const existing = await prisma.personSkill.findFirst({
      where: {
        id: personSkillId,
        workspaceId,
        personId: position.userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Person skill not found" }, { status: 404 });
    }

    // Step 6: Delete person skill
    await prisma.personSkill.delete({
      where: { id: personSkillId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

