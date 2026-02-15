/**
 * GET/POST /api/org/skills
 * Skills taxonomy management - list/search and create skills.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { OrgSkillCreateSchema } from "@/lib/validations/org";
import { handleApiError } from "@/lib/api-errors";

/**
 * Normalize skill name for consistent storage.
 * - Trim whitespace
 * - Collapse multiple spaces to single space
 */
function normalizeSkillName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export async function GET(request: NextRequest) {
  try {
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

    // Step 4: Parse query params
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const category = searchParams.get("category")?.trim() ?? "";
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    // Step 5: Fetch skills
    const skills = await prisma.skill.findMany({
      where: {
        workspaceId,
        ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
        ...(category ? { category } : {}),
      },
      include: {
        _count: {
          select: { personSkills: true },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: limit,
    });

    return NextResponse.json({
      ok: true,
      skills: skills.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        personCount: s._count.personSkills,
      })),
    });
  } catch (error) {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (require MEMBER for taxonomy write)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body (Zod)
    const body = OrgSkillCreateSchema.parse(await request.json());

    const name = normalizeSkillName(body.name);
    const category = body.category?.trim() ?? null;
    const description = body.description?.trim() ?? null;

    // Step 5: Check for case-insensitive duplicate
    const existing = await prisma.skill.findFirst({
      where: {
        workspaceId,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (existing) {
      // Return existing skill instead of error (per plan: "If skill exists, return existing")
      return NextResponse.json({
        ok: true,
        skill: {
          id: existing.id,
          name: existing.name,
          category: existing.category,
          description: existing.description,
        },
        created: false,
        message: "Skill already exists",
      });
    }

    // Step 6: Create skill
    const created = await prisma.skill.create({
      data: {
        workspaceId,
        name,
        category,
        description,
      },
    });

    return NextResponse.json({
      ok: true,
      skill: {
        id: created.id,
        name: created.name,
        category: created.category,
        description: created.description,
      },
      created: true,
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}

