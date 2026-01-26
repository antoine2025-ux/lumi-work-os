/**
 * GET/POST /api/org/people/[personId]/skills
 * List and add skills for a person.
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

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await ctx.params;

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

    // Step 5: Fetch person skills with skill details
    const personSkills = await prisma.personSkill.findMany({
      where: {
        workspaceId,
        personId: position.userId,
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
      orderBy: [{ proficiency: "desc" }, { skill: { name: "asc" } }],
    });

    return NextResponse.json({
      ok: true,
      skills: personSkills.map((ps) => ({
        id: ps.id,
        skillId: ps.skillId,
        skill: {
          id: ps.skill.id,
          name: ps.skill.name,
          category: ps.skill.category,
        },
        proficiency: ps.proficiency,
        source: ps.source,
        verifiedAt: ps.verifiedAt?.toISOString() ?? null,
      })),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/people/[personId]/skills] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await ctx.params;

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

    // Step 4: Parse and validate request body
    const body = await request.json();

    if (!body.skillId || typeof body.skillId !== "string") {
      return NextResponse.json({ error: "skillId is required" }, { status: 400 });
    }

    // Validate proficiency
    const proficiency = body.proficiency !== undefined ? Number(body.proficiency) : 3;
    if (isNaN(proficiency) || proficiency < 1 || proficiency > 5) {
      return NextResponse.json({ error: "proficiency must be between 1 and 5" }, { status: 400 });
    }

    // Validate source
    const source = (body.source as SkillSource) || "SELF_REPORTED";
    if (!ALLOWED_SOURCES.includes(source)) {
      return NextResponse.json(
        { error: `source must be one of: ${ALLOWED_SOURCES.join(", ")}` },
        { status: 400 }
      );
    }

    // Step 5: Get the user ID from position
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

    // Step 7: Upsert person skill
    const personSkill = await prisma.personSkill.upsert({
      where: {
        workspaceId_personId_skillId: {
          workspaceId,
          personId: position.userId,
          skillId: body.skillId,
        },
      },
      update: {
        proficiency,
        source,
        verifiedAt: source === "VERIFIED" ? new Date() : undefined,
        verifiedById: source === "VERIFIED" ? userId : undefined,
      },
      create: {
        workspaceId,
        personId: position.userId,
        skillId: body.skillId,
        proficiency,
        source,
        verifiedAt: source === "VERIFIED" ? new Date() : null,
        verifiedById: source === "VERIFIED" ? userId : null,
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
      personSkill: {
        id: personSkill.id,
        skillId: personSkill.skillId,
        skill: {
          id: personSkill.skill.id,
          name: personSkill.skill.name,
          category: personSkill.skill.category,
        },
        proficiency: personSkill.proficiency,
        source: personSkill.source,
        verifiedAt: personSkill.verifiedAt?.toISOString() ?? null,
      },
    });
  } catch (error: unknown) {
    console.error("[POST /api/org/people/[personId]/skills] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

