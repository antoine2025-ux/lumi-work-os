/**
 * GET    /api/org/role-templates/[id] — Fetch a single role card
 * PUT    /api/org/role-templates/[id] — Update role card (ADMIN)
 * DELETE /api/org/role-templates/[id] — Delete role card (ADMIN)
 *
 * Auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Zod → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { RoleCardUpdateSchema } from "@/lib/validations/org";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["VIEWER"] });
    setWorkspaceContext(workspaceId);

    const template = await prisma.roleCard.findFirst({
      where: { id, workspaceId },
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
    });

    if (!template) {
      return NextResponse.json({ error: "Role template not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, template });
  } catch (error) {
    return handleApiError(error, request);
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const existing = await prisma.roleCard.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Role template not found" }, { status: 404 });
    }

    const body = RoleCardUpdateSchema.parse(await request.json());

    const updated = await prisma.roleCard.update({
      where: { id },
      data: {
        ...(body.roleName !== undefined && { roleName: body.roleName }),
        ...(body.jobFamily !== undefined && { jobFamily: body.jobFamily }),
        ...(body.level !== undefined && { level: body.level }),
        ...(body.roleDescription !== undefined && { roleDescription: body.roleDescription }),
        ...(body.responsibilities !== undefined && { responsibilities: body.responsibilities }),
        ...(body.requiredSkills !== undefined && { requiredSkills: body.requiredSkills }),
        ...(body.preferredSkills !== undefined && { preferredSkills: body.preferredSkills }),
        ...(body.keyMetrics !== undefined && { keyMetrics: body.keyMetrics }),
        ...(body.positionId !== undefined && { positionId: body.positionId }),
        ...(body.roleInOrg !== undefined && { roleInOrg: body.roleInOrg }),
        ...(body.focusArea !== undefined && { focusArea: body.focusArea }),
        ...(body.managerNotes !== undefined && { managerNotes: body.managerNotes }),
      },
    });

    return NextResponse.json({ ok: true, template: updated });
  } catch (error) {
    return handleApiError(error, request);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const existing = await prisma.roleCard.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Role template not found" }, { status: 404 });
    }

    await prisma.roleCard.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, request);
  }
}
