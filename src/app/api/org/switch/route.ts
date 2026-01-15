import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/server/auth";

export async function POST(req: Request) {
  const body = (await req.json()) as { orgId: string };
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  // Note: orgMembership model requires prisma generate to be recognized in types
  const membership = await (prisma as any).orgMembership.findUnique({
    where: { orgId_userId: { orgId: body.orgId, userId: user.id } },
    select: { orgId: true },
  }) as { orgId: string } | null;
  if (!membership) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ ok: true, orgId: body.orgId });
}
