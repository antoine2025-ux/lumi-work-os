import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev) {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const sample = await prisma.orgDepartment.findFirst({
    include: { teams: { take: 1 } } as any,
  });

  return NextResponse.json({ sample });
}

