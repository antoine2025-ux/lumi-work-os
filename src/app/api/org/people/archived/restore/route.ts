import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireAdmin } from "@/server/rbac";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getOrgContext(req);
    if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
    requireAdmin((ctx as any).canAdmin);

    // Set workspace context for proper scoping
    const workspaceId = await getCurrentWorkspaceId(req);
    if (!workspaceId) return NextResponse.json({ ok: false, error: "Workspace required" }, { status: 400 });
    setWorkspaceContext(workspaceId);

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
        orgId: ctx.orgId,
        actorUserId: ctx.user?.id ?? null,
        actorLabel: ctx.user?.name || ctx.user?.email || "Unknown user",
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

