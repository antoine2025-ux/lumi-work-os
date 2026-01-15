import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { getOrgContext } from "@/server/rbac";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message } }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    let ctx;
    try {
      ctx = await getOrgContext(req);
    } catch (error) {
      console.error("[POST /api/org/people/manager/edge] Error getting org context:", error);
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

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON body");

    const { personId, newManagerId } = body ?? {};

    if (!personId || typeof personId !== "string") return badRequest("personId is required");
    if (newManagerId !== null && newManagerId !== undefined && typeof newManagerId !== "string") {
      return badRequest("newManagerId must be a string or null");
    }

    // Get the person's position
    const position = await prisma.orgPosition.findFirst({
      where: {
        workspaceId,
        userId: personId,
        isActive: true,
      },
      select: { id: true, userId: true },
    });

    if (!position) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Person not found" } }, { status: 404 });
    }

    // If newManagerId is set, validate it
    let managerPositionId: string | null = null;
    if (newManagerId) {
      const mgrPosition = await prisma.orgPosition.findFirst({
        where: {
          workspaceId,
          userId: newManagerId,
          isActive: true,
        },
        select: { id: true, userId: true },
      });
      if (!mgrPosition) return badRequest("newManagerId must reference a person in the same workspace");
      if (newManagerId === personId) return badRequest("newManagerId cannot be self");
      managerPositionId = mgrPosition.id;
    }

    // Update the position
    await prisma.orgPosition.update({
      where: { id: position.id },
      data: { parentId: managerPositionId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error updating edge:", error);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: error.message || "Failed to update edge" } },
      { status: 500 }
    );
  }
}

