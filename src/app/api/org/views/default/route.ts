import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireAdmin } from "@/server/rbac";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { id: string; role: "VIEWER" | "EDITOR" | "ADMIN" | null };
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireAdmin((ctx as any).canAdmin);

  // Clear previous default for role in this scope
  const view = await prisma.savedView.findUnique({ where: { id: body.id } });
  if (!view) return NextResponse.json({ ok: false }, { status: 404 });
  if (view.orgId !== ctx.orgId) return NextResponse.json({ ok: false }, { status: 403 });

  await prisma.savedView.updateMany({
    where: { orgId: ctx.orgId, scope: view.scope, defaultForRole: body.role as any },
    data: { defaultForRole: null },
  });

  const updated = await prisma.savedView.update({
    where: { id: body.id },
    data: { defaultForRole: body.role as any },
  });

  return NextResponse.json({ ok: true, view: updated });
}

