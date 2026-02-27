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
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;
    const body = (await req.json()) as { id: string; pinned: boolean };

    const view = await prisma.savedView.findUnique({ where: { id: body.id } });
    if (!view) return NextResponse.json({ ok: false }, { status: 404 });
    if (view.orgId !== workspaceId) return NextResponse.json({ ok: false }, { status: 403 });

    const isAdmin = auth.user.roles.some((r) => ['ADMIN', 'OWNER'].includes(r));
    if (view.shared && !isAdmin) return NextResponse.json({ ok: false }, { status: 403 });
    if (!view.shared && view.userId !== auth.user.userId) return NextResponse.json({ ok: false }, { status: 403 });

    const updated = await prisma.savedView.update({
      where: { id: body.id },
      data: { pinned: !!body.pinned },
    });

    return NextResponse.json({ ok: true, view: updated });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
