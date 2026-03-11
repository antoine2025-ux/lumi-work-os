/**
 * GET /api/org/role-templates  — List all role cards (templates) for workspace
 * POST /api/org/role-templates — Create a new role card (ADMIN)
 *
 * Auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Zod → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { RoleCardCreateSchema } from "@/lib/validations/org";

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["VIEWER"] });
    setWorkspaceContext(workspaceId);

    const templates = await prisma.roleCard.findMany({
      where: { workspaceId },
      include: {
        skillRefs: {
          include: {
            skill: { select: { id: true, name: true, category: true } },
          },
        },
        position: {
          select: { id: true, title: true, userId: true },
        },
      },
      orderBy: [{ jobFamily: "asc" }, { level: "asc" }, { roleName: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      templates: templates.map((t) => ({
        id: t.id,
        roleName: t.roleName,
        jobFamily: t.jobFamily,
        level: t.level,
        roleDescription: t.roleDescription,
        responsibilities: t.responsibilities,
        requiredSkills: t.requiredSkills,
        preferredSkills: t.preferredSkills,
        keyMetrics: t.keyMetrics,
        positionId: t.positionId,
        position: t.position ?? null,
        skillRefs: t.skillRefs.map((sr) => ({
          id: sr.id,
          type: sr.type,
          minProficiency: sr.minProficiency,
          skill: sr.skill,
        })),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const body = RoleCardCreateSchema.parse(await request.json());

    // If positionId provided, verify it belongs to this workspace
    if (body.positionId) {
      const position = await prisma.orgPosition.findFirst({
        where: { id: body.positionId, workspaceId },
      });
      if (!position) {
        return NextResponse.json({ error: "Position not found" }, { status: 404 });
      }
    }

    const template = await prisma.roleCard.create({
      data: {
        workspaceId,
        createdById: userId,
        roleName: body.roleName,
        jobFamily: body.jobFamily,
        level: body.level,
        roleDescription: body.roleDescription,
        responsibilities: body.responsibilities,
        requiredSkills: body.requiredSkills,
        preferredSkills: body.preferredSkills,
        keyMetrics: body.keyMetrics,
        ...(body.positionId ? { positionId: body.positionId } : {}),
        ...(body.roleInOrg !== undefined && { roleInOrg: body.roleInOrg }),
        ...(body.focusArea !== undefined && { focusArea: body.focusArea }),
        ...(body.managerNotes !== undefined && { managerNotes: body.managerNotes }),
      },
    });

    return NextResponse.json({ ok: true, template }, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
