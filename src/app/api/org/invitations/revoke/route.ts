import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireAdmin } from "@/server/rbac";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { id: string };
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  requireAdmin((ctx as any).canAdmin);

  const updated = await (prisma as any).orgInvitation.update({
    where: { id: body.id },
    data: { status: "EXPIRED" },
  });

  return NextResponse.json({ ok: true, invite: updated });
}

