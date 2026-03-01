import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { sendEmail } from "@/server/mailer";
import { logOrgAudit } from "@/lib/audit/org-audit";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: string };
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

    // Extend expiry by 14 days and set back to PENDING if it was expired/declined.
    const updated = await prisma.orgInvitation.update({
      where: { id: body.id },
      data: {
        status: invite.status === "ACCEPTED" ? "ACCEPTED" : "PENDING",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      },
    });

    // Email sending happens below (best-effort)
    const org = await prisma.org.findUnique({ where: { id: updated.orgId || workspaceId }, select: { name: true } }); // Reading Prisma field updated.orgId
    const orgName = org?.name || "your organization";
    const link = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/org/invite/${updated.token}`;
    await sendEmail({
      to: updated.email,
      subject: `You've been invited to ${orgName} on Loopwell`,
      html: `
      <div style="font-family: ui-sans-serif, system-ui; line-height: 1.4">
        <h2 style="margin:0 0 12px 0;">You're invited to ${orgName}</h2>
        <p style="margin:0 0 12px 0;">Role: <b>${updated.role || "VIEWER"}</b></p>
        <p style="margin:0 0 12px 0;">
          <a href="${link}">Accept invitation</a>
        </p>
        <p style="margin:0; color:#666">This link expires on ${updated.expiresAt?.toISOString()}.</p>
      </div>
    `,
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

    return NextResponse.json({ ok: true, invite: updated, inviteLink: link, orgName });
  } catch (error) {
    return handleApiError(error, req);
  }
}

