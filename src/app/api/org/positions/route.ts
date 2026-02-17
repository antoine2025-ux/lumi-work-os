// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await getCurrentWorkspaceId(request);

    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: [
        { level: "asc" },
        { title: "asc" },
      ],
      include: {
        team: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const items = positions.map((pos) => {
      const team = pos.team;
      const department = team?.department ?? null;

      return {
        id: pos.id,
        title: pos.title,
        level: pos.level,
        isActive: pos.isActive,
        teamId: team?.id ?? null,
        teamName: team?.name ?? null,
        departmentId: department?.id ?? null,
        departmentName: department?.name ?? null,
        userId: pos.user?.id ?? null,
        userName: pos.user?.name ?? null,
        userEmail: pos.user?.email ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      positions: items,
    });
  } catch (error) {
    console.error("Error loading org positions:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load positions" },
      { status: 500 }
    );
  }
}
