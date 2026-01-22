import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/server/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const memberships = await (prisma as any).orgMembership.findMany({
    where: { userId: user.id },
    select: {
      role: true,
      org: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const orgs = memberships.map((m: any) => ({
    id: m.org.id,
    name: m.org.name,
    role: m.role,
  }));

  return NextResponse.json({ ok: true, orgs });
}

