// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const workspaceId = await getCurrentWorkspaceId(_req);
    const { id } = await params;

    const team = await prisma.orgTeam.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        positions: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { ok: false, error: "Team not found" },
        { status: 404 }
      );
    }

    const positionDtos = team.positions.map((pos) => ({
      id: pos.id,
      title: pos.title,
      level: pos.level,
      isActive: pos.isActive,
      userId: pos.user?.id ?? null,
      userName: pos.user?.name ?? null,
      userEmail: pos.user?.email ?? null,
    }));

    const filledCount = positionDtos.filter((p) => p.userId !== null).length;

    const dto = {
      id: team.id,
      name: team.name,
      description: team.description ?? "",
      color: team.color ?? null,
      isActive: team.isActive,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
      department: team.department
        ? {
            id: team.department.id,
            name: team.department.name,
          }
        : null,
      positions: positionDtos,
      stats: {
        positionsCount: positionDtos.length,
        filledPositionsCount: filledCount,
        unfilledPositionsCount: positionDtos.length - filledCount,
      },
    };

    return NextResponse.json({ ok: true, team: dto });
  } catch (error) {
    console.error("Error loading team detail:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load team" },
      { status: 500 }
    );
  }
}
