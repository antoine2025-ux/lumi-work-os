import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { logOrgAudit } from "@/lib/audit/org-audit";

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const body = (await req.json()) as { id: string };

    // Get person name for audit log
    const position = await prisma.orgPosition.findUnique({
      where: { id: body.id },
      select: { user: { select: { name: true } } },
    });

    // Restore archived position
    const updated = await prisma.orgPosition.update({
      where: { id: body.id },
      data: {
        archivedAt: null,
        archivedReason: null,
        mergedIntoId: null,
        isActive: true, // Also reactivate
      },
    });

    logOrgAudit({
      workspaceId: auth.workspaceId,
      entityType: "PERSON",
      entityId: body.id,
      entityName: position?.user?.name ?? undefined,
      action: "RESTORED",
      actorId: auth.user.userId,
    }).catch((e) => console.error("[POST /api/org/people/archived/restore] Audit log error (non-fatal):", e));

    return NextResponse.json({ ok: true, person: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

