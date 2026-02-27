import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

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

    await prisma.auditLogEntry.create({
      data: {
        orgId: auth.workspaceId,
        actorUserId: auth.user.userId,
        actorLabel: auth.user.name || auth.user.email || "Unknown user",
        action: "restore_person",
        targetCount: 1,
        summary: `Restored archived person ${body.id}`,
      },
    });

    return NextResponse.json({ ok: true, person: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

