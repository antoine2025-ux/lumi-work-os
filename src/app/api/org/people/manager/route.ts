import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertWorkspaceAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { getOrgContext } from "@/server/rbac";
import { OrgBulkManagerSchema } from "@/lib/validations/org";
import { logOrgAuditBatch, type OrgAuditEntry } from "@/lib/audit/org-audit";

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
    } catch (error) {
      console.error("[POST /api/org/people/manager] Error getting org context:", error);
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
    const { personIds, managerId } = OrgBulkManagerSchema.parse(await req.json());

    // Get positions for the selected people (fetch before state for audit)
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        userId: { in: personIds },
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        parentId: true,
        user: { select: { name: true } },
      },
    });

    if (positions.length !== personIds.length) {
      return badRequest("Some personIds do not belong to this workspace");
    }

    const positionIds = positions.map((p) => p.id);

    // If manager is set, ensure manager belongs to workspace and isn't in personIds
    let managerPositionId: string | null = null;
    if (managerId) {
      const mgrPosition = await prisma.orgPosition.findFirst({
        where: {
          workspaceId,
          userId: managerId,
          isActive: true,
        },
        select: { id: true, userId: true },
      });

      if (!mgrPosition) {
        return badRequest("managerId must reference a person in the same workspace");
      }
      if (personIds.includes(managerId)) {
        return badRequest("managerId cannot be one of the selected people");
      }
      managerPositionId = mgrPosition.id;
    }

    // Update all positions
    await prisma.orgPosition.updateMany({
      where: {
        id: { in: positionIds },
      },
      data: {
        parentId: managerPositionId,
      },
    });

    // Collect audit entries for batch logging
    const auditEntries: OrgAuditEntry[] = [];
    for (const position of positions) {
      auditEntries.push({
        workspaceId,
        entityType: "MANAGER_LINK",
        entityId: position.id,
        entityName: position.user?.name ?? undefined,
        action: managerPositionId ? "ASSIGNED" : "UNASSIGNED",
        actorId: auth.user.userId,
        changes: {
          managerId: { from: position.parentId, to: managerPositionId },
        },
      });
    }

    // Batch write audit logs (fire-and-forget)
    if (auditEntries.length > 0) {
      logOrgAuditBatch(auditEntries).catch((e) => 
        console.error(`[POST /api/org/people/manager] Batch audit log error (non-fatal): ${auditEntries.length} entries`, e)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

