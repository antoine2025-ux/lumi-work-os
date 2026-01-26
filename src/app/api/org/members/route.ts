import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireEdit } from "@/server/rbac";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const members = await prisma.orgMembership.findMany({
    where: { orgId: ctx.orgId },
    select: {
      id: true,
      role: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      // Join to User table if present
    },
  });

  return NextResponse.json({ ok: true, members });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { userId: string; role: string };
    const ctx = await getOrgContext(req);
    if (!ctx.orgId) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

    requireEdit(ctx.role === "ADMIN");

    const created = await prisma.orgMembership.upsert({
      where: { orgId_userId: { orgId: ctx.orgId, userId: body.userId } },
      update: { role: body.role as any },
      create: { orgId: ctx.orgId, userId: body.userId, role: body.role as any },
    });

    return NextResponse.json({ ok: true, member: created });
  } catch (e: any) {
    const status = e?.status === 403 ? 403 : 500;
    return NextResponse.json({ ok: false, error: e?.message ?? "Failed" }, { status });
  }
}
