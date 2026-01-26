import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });

  const invite = await prisma.orgInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      status: true,
      role: true,
      email: true,
      expiresAt: true,
      org: { select: { id: true, name: true } },
    },
  });

  if (!invite) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, invite });
}

