import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/server/auth";

export async function POST(req: Request) {
  const body = (await req.json()) as { token: string; decision: "ACCEPT" | "DECLINE" };
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const invite = await prisma.orgInvitation.findUnique({ where: { token: body.token } });
  if (!invite) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 404 });
  if (invite.status !== "PENDING") return NextResponse.json({ ok: false, error: "Invite already used" }, { status: 400 });
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    await prisma.orgInvitation.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ ok: false, error: "Invite expired" }, { status: 400 });
  }

  if (body.decision === "DECLINE") {
    await prisma.orgInvitation.update({ where: { id: invite.id }, data: { status: "DECLINED" } });
    return NextResponse.json({ ok: true, status: "DECLINED" });
  }

  // ACCEPT: create membership
  const orgId = invite.orgId || invite.workspaceId;
  if (!orgId) return NextResponse.json({ ok: false, error: "Invalid invite" }, { status: 400 });

  await prisma.orgMembership.upsert({
    where: { orgId_userId: { orgId, userId: user.id } },
    update: { role: invite.role || "VIEWER" },
    create: { orgId, userId: user.id, role: invite.role || "VIEWER" },
  });

  await prisma.orgInvitation.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });

  const org = await prisma.org.findUnique({ where: { id: orgId }, select: { name: true } });
  return NextResponse.json({
    ok: true,
    status: "ACCEPTED",
    orgId,
    orgName: org?.name || "Organization",
    role: invite.role || "VIEWER",
  });
}

