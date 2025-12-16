import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireAdmin } from "@/server/rbac";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId || !ctx.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    state?: any;
    shared?: boolean;
  };

  const view = await prisma.savedView.findUnique({ where: { id } });
  if (!view) return NextResponse.json({ ok: false }, { status: 404 });

  if (view.orgId !== ctx.orgId) return NextResponse.json({ ok: false }, { status: 403 });

  // Check permissions
  if (view.shared) requireAdmin((ctx as any).canAdmin);
  if (!view.shared && view.userId !== ctx.user.id) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // If setting shared, require admin
  if (body.shared && !view.shared) requireAdmin((ctx as any).canAdmin);

  // Merge state if provided
  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.state !== undefined) {
    // Merge with existing state
    updateData.state = { ...(view.state as any || {}), ...body.state };
  }
  if (body.shared !== undefined) {
    updateData.shared = body.shared;
    updateData.userId = body.shared ? null : ctx.user.id;
  }

  const updated = await prisma.savedView.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ ok: true, view: updated });
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const ctx = await getOrgContext(_);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const view = await prisma.savedView.findUnique({ where: { id } });
  if (!view) return NextResponse.json({ ok: false }, { status: 404 });

  if (view.shared) requireAdmin((ctx as any).canAdmin);
  if (!view.shared && view.userId !== ctx.user?.id) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  await prisma.savedView.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

