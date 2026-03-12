import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { logOrgAudit } from "@/lib/audit/org-audit";
import { computeChanges } from "@/lib/audit/diff";
import { OrgInvitationIdSchema } from "@/lib/validations/admin";

export async function POST(req: NextRequest) {
  try {
    const body = OrgInvitationIdSchema.parse(await req.json());
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await assertAccess({ 
      userId: user.userId, 
      workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    });
    setWorkspaceContext(workspaceId);

    const existing = await prisma.orgInvitation.findUnique({
      where: { id: body.id },
      select: { id: true, email: true, status: true },
    });

    const updated = await prisma.orgInvitation.update({
      where: { id: body.id },
      data: { status: "EXPIRED" },
    });

    // Log audit entry (fire-and-forget)
    if (existing) {
      const changes = computeChanges(
        { status: existing.status },
        { status: "EXPIRED" },
        ["status"]
      );
      if (changes) {
        logOrgAudit({
          workspaceId,
          entityType: "INVITATION",
          entityId: updated.id,
          entityName: updated.email,
          action: "UPDATED",
          actorId: user.userId,
          changes,
        }).catch((e) => console.error("[POST /api/org/invitations/revoke] Audit error:", e));
      }
    }

    return NextResponse.json({ ok: true, invite: updated });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}

