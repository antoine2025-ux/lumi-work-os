// src/app/api/org/role-cards/[id]/position/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;
    const { id: roleCardId } = await params;

    const roleCard = await prisma.roleCard.findFirst({
      where: {
        id: roleCardId,
        workspaceId,
      },
      select: {
        positionId: true,
      },
    });

    if (!roleCard || !roleCard.positionId) {
      return NextResponse.json(
        { ok: false, error: "Role card not found or not linked to a position" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      positionId: roleCard.positionId,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}

