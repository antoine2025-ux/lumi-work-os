import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from '@/lib/unified-auth';
import { assertAccess } from '@/lib/auth/assertAccess';
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware';

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;
    const body = (await req.json()) as { id: string; role: "VIEWER" | "EDITOR" | "ADMIN" | null };

    const view = await prisma.savedView.findUnique({ where: { id: body.id } });
    if (!view) return NextResponse.json({ ok: false }, { status: 404 });
    if (view.workspaceId !== workspaceId) return NextResponse.json({ ok: false }, { status: 403 });

    await prisma.savedView.updateMany({
      where: { workspaceId, scope: view.scope, defaultForRole: body.role as any },
      data: { defaultForRole: null },
    });

    const updated = await prisma.savedView.update({
      where: { id: body.id },
      data: { defaultForRole: body.role as any },
    });

    return NextResponse.json({ ok: true, view: updated });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
