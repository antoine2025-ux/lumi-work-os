// src/app/api/org/role-cards/[id]/position/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await getCurrentWorkspaceId(req);
    if (!workspaceId) {
      return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 401 });
    }
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
  } catch (err: any) {
    console.error("[Org] Failed to get position for role card", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Failed to get position for role card",
      },
      { status: 500 }
    );
  }
}

