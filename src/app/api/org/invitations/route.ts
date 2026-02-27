import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { sendEmail } from "@/server/mailer";
import crypto from "crypto";
import { OrgInvitationSchema } from "@/lib/validations/org";
import { handleApiError } from "@/lib/api-errors";

function token() {
  return crypto.randomBytes(24).toString("hex");
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["VIEWER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const invites = await prisma.orgInvitation.findMany({
      where: { orgId: auth.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

    return NextResponse.json({ ok: true, invites });
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const body = OrgInvitationSchema.parse(await req.json());

    const created = await prisma.orgInvitation.create({
      data: {
        orgId: auth.workspaceId,
        email: body.email.toLowerCase().trim(),
        role: body.role,
        token: token(),
        status: "PENDING",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 days
      },
    });

    const org = await prisma.org.findUnique({ where: { id: auth.workspaceId }, select: { name: true } });
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
          <p style="margin:0; color:#666">This link expires on ${created.expiresAt?.toISOString() ?? 'N/A'}.</p>
        </div>
      `,
    }).catch(() => null);

    return NextResponse.json({ ok: true, invite: created, inviteLink: link, orgName });
  } catch (error) {
    return handleApiError(error, req);
  }
}

