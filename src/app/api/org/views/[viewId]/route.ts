import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { getOrgContext } from "@/server/rbac";
import { handleApiError } from "@/lib/api-errors"

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message } }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ viewId: string }> }) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    let ctx;
    try {
      ctx = await getOrgContext(req);
    } catch (error) {
      console.error("[DELETE /api/org/views/[viewId]] Error getting org context:", error);
      return NextResponse.json({ ok: false, error: "Failed to get organization context" }, { status: 500 });
    }

    if (!ctx.orgId) {
      return NextResponse.json({ ok: false, error: "No organization membership" }, { status: 403 });
    }
    if (!ctx.canEdit) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const workspaceId = auth.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ ok: false, error: "No workspace" }, { status: 403 });
    }

    const resolvedParams = await params;

    const existing = await prisma.orgSavedView.findUnique({
      where: { id: resolvedParams.viewId },
      select: { id: true, workspaceId: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "View not found" } }, { status: 404 });
    }
    if (existing.workspaceId !== workspaceId) {
      return badRequest("View does not belong to workspace");
    }

    await prisma.orgSavedView.delete({ where: { id: resolvedParams.viewId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, req)
  }
}

