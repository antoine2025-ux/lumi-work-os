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

    const department = await prisma.orgDepartment.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: {
        teams: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          include: {
            positions: {
              where: { isActive: true },
              select: {
                id: true,
                title: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json(
        { ok: false, error: "Department not found" },
        { status: 404 }
      );
    }

    const teamDtos = department.teams.map((team) => {
      const positionsCount = team.positions.length;
      const assignedUsersCount = team.positions.filter(
        (p) => p.userId !== null
      ).length;

      return {
        id: team.id,
        name: team.name,
        description: team.description ?? "",
        color: team.color ?? null,
        isActive: team.isActive,
        positionsCount,
        assignedUsersCount,
      };
    });

    const dto = {
      id: department.id,
      name: department.name,
      description: department.description ?? "",
      color: department.color ?? null,
      isActive: department.isActive,
      createdAt: department.createdAt.toISOString(),
      updatedAt: department.updatedAt.toISOString(),
      teams: teamDtos,
      stats: {
        teamCount: teamDtos.length,
        positionsCount: teamDtos.reduce(
          (sum, t) => sum + t.positionsCount,
          0
        ),
        assignedUsersCount: teamDtos.reduce(
          (sum, t) => sum + t.assignedUsersCount,
          0
        ),
      },
    };

    return NextResponse.json({ ok: true, department: dto });
  } catch (error) {
    console.error("Error loading department detail:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load department" },
      { status: 500 }
    );
  }
}
