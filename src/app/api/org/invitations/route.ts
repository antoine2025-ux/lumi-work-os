import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext, requireAdmin } from "@/server/rbac";
import { sendEmail } from "@/server/mailer";
import crypto from "crypto";

function token() {
  return crypto.randomBytes(24).toString("hex");
}

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const invites = await prisma.orgInvitation.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ ok: true, invites });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email: string; role: "VIEWER" | "EDITOR" | "ADMIN" };
    const ctx = await getOrgContext(req);
    if (!ctx.orgId) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

    requireAdmin((ctx as any).canAdmin);

    const created = await prisma.orgInvitation.create({
      data: {
        orgId: ctx.orgId,
        email: body.email.toLowerCase().trim(),
        role: body.role,
        token: token(),
        status: "PENDING",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 days
      },
    });

    const org = await prisma.org.findUnique({ where: { id: ctx.orgId }, select: { name: true } });
    const orgName = org?.name || "your organization";
    const link = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/org/invite/${created.token}`;

    await sendEmail({
      to: created.email,
      subject: `You've been invited to ${orgName} on Loopwell`,
      html: `
        <div style="font-family: ui-sans-serif, system-ui; line-height: 1.4">
          <h2 style="margin:0 0 12px 0;">You're invited to ${orgName}</h2>
          <p style="margin:0 0 12px 0;">Role: <b>${created.role}</b></p>
          <p style="margin:0 0 12px 0;">
            <a href="${link}">Accept invitation</a>
          </p>
          <p style="margin:0; color:#666">This link expires on ${created.expiresAt.toISOString()}.</p>
        </div>
      `,
    }).catch(() => null);

    return NextResponse.json({ ok: true, invite: created, inviteLink: link, orgName });
  } catch (e: any) {
    const status = e?.status === 403 ? 403 : 500;
    return NextResponse.json({ ok: false, error: e?.message ?? "Failed" }, { status });
  }
}

