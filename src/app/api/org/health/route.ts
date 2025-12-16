import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext } from "@/server/rbac";
import { measureOrgHealth } from "@/server/orgHealth";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "latest"; // latest | history
  const days = Math.max(1, Math.min(90, Number(searchParams.get("days") || "30")));

  if (mode === "latest") {
    // return latest snapshot; if none, create one
    const last = await prisma.orgHealthSnapshot.findFirst({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
    });

    if (last) return NextResponse.json({ ok: true, snapshot: last });

    const created = await measureOrgHealth(ctx.orgId);
    return NextResponse.json({ ok: true, snapshot: created.snapshot });
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const history = await prisma.orgHealthSnapshot.findMany({
    where: { orgId: ctx.orgId, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ ok: true, history });
}
