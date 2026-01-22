import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext, requireAdmin } from "@/server/rbac";
import { sendEmail } from "@/server/mailer";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { id: string };
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  requireAdmin((ctx as any).canAdmin);

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
  const org = await prisma.org.findUnique({ where: { id: updated.orgId || ctx.orgId }, select: { name: true } });
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

  return NextResponse.json({ ok: true, invite: updated, inviteLink: link, orgName });
}

