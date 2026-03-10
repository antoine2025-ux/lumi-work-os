import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { sendWorkspaceInvite } from "@/lib/email/send-invite";
import { getAppBaseUrl } from "@/lib/appUrl";
import { logOrgAudit } from "@/lib/audit/org-audit";
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

    const invite = await prisma.orgInvitation.findUnique({ where: { id: body.id } });
    if (!invite) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    if (invite.workspaceId && invite.workspaceId !== workspaceId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Extend expiry by 14 days and set back to PENDING if it was expired/declined.
    const updated = await prisma.orgInvitation.update({
      where: { id: body.id },
      data: {
        status: invite.status === "ACCEPTED" ? "ACCEPTED" : "PENDING",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      },
    });

    // Email sending (best-effort) — use same flow as create
    const [workspace, inviter] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: invite.invitedById ?? "" }, select: { name: true, email: true } }),
    ]);
    await sendWorkspaceInvite({
      to: updated.email,
      workspaceName: workspace?.name ?? "your workspace",
      inviterName: inviter?.name ?? inviter?.email ?? "A team member",
      inviteToken: updated.token,
      role: updated.role ?? "VIEWER",
    }).catch(() => null);

    // Log audit entry (fire-and-forget)
    logOrgAudit({
      workspaceId,
      entityType: "INVITATION",
      entityId: updated.id,
      entityName: updated.email,
      action: "UPDATED",
      actorId: user.userId,
      metadata: { resent: true },
    }).catch((e) => console.error("[POST /api/org/invitations/resend] Audit error:", e));

    const baseUrl = getAppBaseUrl();
    const inviteLink = `${baseUrl}/invite/${updated.token}`;
    return NextResponse.json({ ok: true, invite: updated, inviteLink, workspaceName: workspace?.name ?? "your workspace" });
  } catch (error) {
    return handleApiError(error, req);
  }
}

