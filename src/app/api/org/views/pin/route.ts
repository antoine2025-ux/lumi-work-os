import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext } from "@/server/rbac";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { id: string; pinned: boolean };
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });

  const view = await prisma.savedView.findUnique({ where: { id: body.id } });
  if (!view) return NextResponse.json({ ok: false }, { status: 404 });
  if (view.orgId !== ctx.orgId) return NextResponse.json({ ok: false }, { status: 403 });

  if (view.shared && !ctx.canAdmin) return NextResponse.json({ ok: false }, { status: 403 });
  if (!view.shared && view.userId !== ctx.user?.id) return NextResponse.json({ ok: false }, { status: 403 });

  const updated = await prisma.savedView.update({
    where: { id: body.id },
    data: { pinned: !!body.pinned },
  });

  return NextResponse.json({ ok: true, view: updated });
}

