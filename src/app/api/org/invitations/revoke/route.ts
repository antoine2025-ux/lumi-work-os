import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: string };
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await assertAccess({ 
      userId: user.userId, 
      workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    });
    setWorkspaceContext(workspaceId);

    const updated = await prisma.orgInvitation.update({
      where: { id: body.id },
      data: { status: "EXPIRED" },
    });

    return NextResponse.json({ ok: true, invite: updated });
  } catch (error) {
    return handleApiError(error, req);
  }
}

