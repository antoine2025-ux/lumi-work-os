import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertWorkspaceAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { getOrgContext } from "@/server/rbac";
import { OrgManagerEdgeSchema } from "@/lib/validations/org";
import { logOrgAudit } from "@/lib/audit/org-audit";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message } }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    // Assert user has workspace access (ADMIN+ can edit org structure)
    await assertWorkspaceAccess(auth.user.userId, auth.workspaceId, ['ADMIN']);
    setWorkspaceContext(auth.workspaceId);

    let ctx;
    try {
      ctx = await getOrgContext(req);
    } catch (error: unknown) {
      console.error("[POST /api/org/people/manager/edge] Error getting org context:", error);
      return NextResponse.json({ ok: false, error: "Failed to get organization context" }, { status: 500 });
    }

    if (!ctx.workspaceId) {
      return NextResponse.json({ ok: false, error: "No organization membership" }, { status: 403 });
    }
    if (!ctx.canEdit) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const workspaceId = auth.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ ok: false, error: "No workspace" }, { status: 403 });
    }

    // Validate request body (Zod)
    const { personId, newManagerId } = OrgManagerEdgeSchema.parse(await req.json());

    // Get the person's position (fetch before state for audit)
    const position = await prisma.orgPosition.findFirst({
      where: {
        workspaceId,
        userId: personId,
        isActive: true,
      },
      select: { 
        id: true, 
        userId: true,
        parentId: true,
        user: { select: { name: true } },
      },
    });

    if (!position) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Person not found" } }, { status: 404 });
    }

    // If newManagerId is set, validate it
    let managerPositionId: string | null = null;
    if (newManagerId) {
      const mgrPosition = await prisma.orgPosition.findFirst({
        where: {
          workspaceId,
          userId: newManagerId,
          isActive: true,
        },
        select: { id: true, userId: true },
      });
      if (!mgrPosition) return badRequest("newManagerId must reference a person in the same workspace");
      if (newManagerId === personId) return badRequest("newManagerId cannot be self");
      managerPositionId = mgrPosition.id;
    }

    // Update the position
    await prisma.orgPosition.update({
      where: { id: position.id },
      data: { parentId: managerPositionId },
    });

    // Log audit entry
    logOrgAudit({
      workspaceId,
      entityType: "MANAGER_LINK",
      entityId: position.id,
      entityName: position.user?.name ?? undefined,
      action: managerPositionId ? "ASSIGNED" : "UNASSIGNED",
      actorId: auth.user.userId,
      changes: {
        managerId: { from: position.parentId, to: managerPositionId },
      },
    }).catch((e) => console.error("[POST /api/org/people/manager/edge] Audit log error (non-fatal):", e));

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

