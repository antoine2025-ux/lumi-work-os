/**
 * GET  /api/org/positions  — list active positions in the workspace
 * POST /api/org/positions  — create a new position
 *
 * Auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { OrgPositionCreateSchema } from "@/lib/validations/org";
import { prisma } from "@/lib/db";
import { logOrgAudit } from "@/lib/audit/org-audit";

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["MEMBER"] });
    setWorkspaceContext(workspaceId);

    const positions = await prisma.orgPosition.findMany({
      where: { workspaceId, isActive: true },
      orderBy: [{ level: "asc" }, { title: "asc" }],
      include: {
        team: {
          select: {
            id: true,
            name: true,
            department: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const items = positions.map((pos) => {
      const team = pos.team;
      const department = team?.department ?? null;
      return {
        id: pos.id,
        title: pos.title,
        level: pos.level,
        isActive: pos.isActive,
        teamId: team?.id ?? null,
        teamName: team?.name ?? null,
        departmentId: department?.id ?? null,
        departmentName: department?.name ?? null,
        userId: pos.user?.id ?? null,
        userName: pos.user?.name ?? null,
        userEmail: pos.user?.email ?? null,
      };
    });

    return NextResponse.json({ ok: true, positions: items });
  } catch (error) {
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

    const { title, teamId, level } = OrgPositionCreateSchema.parse(await request.json());

    const position = await prisma.orgPosition.create({
      data: {
        title,
        teamId,
        level: level ?? 1,
        workspaceId,
        isActive: true,
      },
      select: { id: true, title: true, level: true },
    });

    logOrgAudit({
      workspaceId,
      entityType: "POSITION",
      entityId: position.id,
      entityName: position.title ?? undefined,
      action: "CREATED",
      actorId: userId,
    }).catch((e) => console.error("[POST /api/org/positions] Audit log error (non-fatal):", e));

    return NextResponse.json({ id: position.id, title: position.title, level: position.level }, { status: 201 });
  } catch (error) {
    return handleApiError(error, request);
  }
}
