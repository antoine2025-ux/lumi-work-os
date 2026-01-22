import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/server/rbac";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { id: string; pinned: boolean };
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });

  // Note: savedView model requires prisma generate to be recognized in types
  const view = await (prisma as any).savedView.findUnique({ where: { id: body.id } }) as {
    id: string;
    orgId: string;
    userId: string | null;
    shared: boolean;
    pinned: boolean;
  } | null;
  if (!view) return NextResponse.json({ ok: false }, { status: 404 });
  if (view.orgId !== ctx.orgId) return NextResponse.json({ ok: false }, { status: 403 });

  if (view.shared && !ctx.canAdmin) return NextResponse.json({ ok: false }, { status: 403 });
  if (!view.shared && view.userId !== ctx.user?.id) return NextResponse.json({ ok: false }, { status: 403 });

  const updated = await (prisma as any).savedView.update({
    where: { id: body.id },
    data: { pinned: !!body.pinned },
  });

  return NextResponse.json({ ok: true, view: updated });
}

