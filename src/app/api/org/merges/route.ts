import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/server/rbac";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });

  const merges = await (prisma as any).orgPersonMergeLog.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { appliedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ ok: true, merges });
}

