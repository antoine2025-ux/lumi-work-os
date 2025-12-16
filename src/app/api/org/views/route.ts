import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getOrgContext } from "@/server/rbac";
import { prisma } from "@/lib/prisma";
import { ensureDefaultOrgViews } from "@/server/orgViews";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });

  await ensureDefaultOrgViews(ctx.orgId);

  const views = await prisma.savedOrgView.findMany({
    where: { orgId: ctx.orgId },
    orderBy: [{ persona: "asc" }, { title: "asc" }],
  });

  return NextResponse.json({ ok: true, views });
}
