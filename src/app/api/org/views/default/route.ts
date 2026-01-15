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
  // Note: savedView model requires prisma generate to be recognized in types
  const view = await (prisma as any).savedView.findUnique({ where: { id: body.id } }) as {
    id: string;
    orgId: string;
    scope: string;
  } | null;
  if (!view) return NextResponse.json({ ok: false }, { status: 404 });
  if (view.orgId !== ctx.orgId) return NextResponse.json({ ok: false }, { status: 403 });

  await (prisma as any).savedView.updateMany({
    where: { orgId: ctx.orgId, scope: view.scope, defaultForRole: body.role },
    data: { defaultForRole: null },
  });

  const updated = await (prisma as any).savedView.update({
    where: { id: body.id },
    data: { defaultForRole: body.role },
  });

  return NextResponse.json({ ok: true, view: updated });
}

