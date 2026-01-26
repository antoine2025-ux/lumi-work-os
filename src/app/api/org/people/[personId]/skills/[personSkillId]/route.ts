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
import { prisma } from "@/lib/db";

const ALLOWED_SOURCES = ["SELF_REPORTED", "MANAGER_ADDED", "VERIFIED", "INFERRED"] as const;
type SkillSource = typeof ALLOWED_SOURCES[number];

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
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Validate proficiency
    if (body.proficiency !== undefined) {
      const proficiency = Number(body.proficiency);
      if (isNaN(proficiency) || proficiency < 1 || proficiency > 5) {
        return NextResponse.json({ error: "proficiency must be between 1 and 5" }, { status: 400 });
      }
      updateData.proficiency = proficiency;
    }

    // Validate source
    if (body.source !== undefined) {
      if (!ALLOWED_SOURCES.includes(body.source)) {
        return NextResponse.json(
          { error: `source must be one of: ${ALLOWED_SOURCES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.source = body.source;

      // If setting to VERIFIED, set verification info
      if (body.source === "VERIFIED") {
        updateData.verifiedAt = new Date();
        updateData.verifiedById = userId;
      }
    }

    // Handle verifiedAt explicitly
    if (body.verifiedAt !== undefined) {
      if (body.verifiedAt === null) {
        updateData.verifiedAt = null;
        updateData.verifiedById = null;
      } else {
        const date = new Date(body.verifiedAt);
        if (isNaN(date.getTime())) {
          return NextResponse.json({ error: "Invalid verifiedAt format" }, { status: 400 });
        }
        updateData.verifiedAt = date;
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
    console.error("[PATCH /api/org/people/[personId]/skills/[personSkillId]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    console.error("[DELETE /api/org/people/[personId]/skills/[personSkillId]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

