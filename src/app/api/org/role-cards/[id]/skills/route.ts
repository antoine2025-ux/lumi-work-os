// @ts-nocheck
/**
 * GET/POST /api/org/role-cards/[id]/skills
 * List and add skills for a role card.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors";

const ALLOWED_TYPES = ["REQUIRED", "PREFERRED"] as const;
type RoleCardSkillType = typeof ALLOWED_TYPES[number];

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleCardId } = await ctx.params;

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

    // Step 5: Fetch role card skills with skill details
    const roleCardSkills = await prisma.roleCardSkill.findMany({
      where: {
        roleCardId,
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: [{ type: "asc" }, { skill: { name: "asc" } }],
    });

    return NextResponse.json({
      ok: true,
      skills: roleCardSkills.map((rcs) => ({
        id: rcs.id,
        skillId: rcs.skillId,
        skill: {
          id: rcs.skill.id,
          name: rcs.skill.name,
          category: rcs.skill.category,
        },
        type: rcs.type,
        minProficiency: rcs.minProficiency,
      })),
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleCardId } = await ctx.params;

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

    // Step 5: Parse and validate request body
    const body = await request.json();

    if (!body.skillId || typeof body.skillId !== "string") {
      return NextResponse.json({ error: "skillId is required" }, { status: 400 });
    }

    if (!body.type || !ALLOWED_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `type must be one of: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate minProficiency (optional, 1-5 or null)
    let minProficiency: number | null = null;
    if (body.minProficiency !== undefined && body.minProficiency !== null) {
      minProficiency = Number(body.minProficiency);
      if (isNaN(minProficiency) || minProficiency < 1 || minProficiency > 5) {
        return NextResponse.json({ error: "minProficiency must be between 1 and 5" }, { status: 400 });
      }
    }

    // Step 6: Verify skill exists
    const skill = await prisma.skill.findFirst({
      where: {
        id: body.skillId,
        workspaceId,
      },
    });

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Step 7: Check for existing role card skill
    const existing = await prisma.roleCardSkill.findFirst({
      where: {
        roleCardId,
        skillId: body.skillId,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Skill already added to role card" }, { status: 400 });
    }

    // Step 8: Create role card skill
    const roleCardSkill = await prisma.roleCardSkill.create({
      data: {
        roleCardId,
        skillId: body.skillId,
        type: body.type as RoleCardSkillType,
        minProficiency,
        workspaceId: auth.workspaceId,
      },
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
        id: roleCardSkill.id,
        skillId: roleCardSkill.skillId,
        skill: {
          id: roleCardSkill.skill.id,
          name: roleCardSkill.skill.name,
          category: roleCardSkill.skill.category,
        },
        type: roleCardSkill.type,
        minProficiency: roleCardSkill.minProficiency,
      },
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}

