import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await getCurrentWorkspaceId(_req);
    const { id: userId } = await params;

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        availability: {
          select: {
            id: true,
            type: true,
            startDate: true,
            endDate: true,
            fraction: true,
            note: true,
          },
          orderBy: {
            startDate: "desc",
          },
        },
        allocations: {
          select: {
            id: true,
            projectId: true,
            fraction: true,
            startDate: true,
            endDate: true,
            note: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Person not found" },
        { status: 404 }
      );
    }

    // Find primary position for this user in this workspace
    const position = await prisma.orgPosition.findFirst({
      where: {
        workspaceId,
        userId,
        isActive: true,
      },
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
      },
      orderBy: [
        { level: "desc" },
        { createdAt: "asc" },
      ],
    });

    const team = position?.team ?? null;
    const department = team?.department ?? null;

    const dto = {
      id: user.id,
      name: user.name ?? "Unnamed",
      email: user.email,
      position: position
        ? {
            id: position.id,
            title: position.title,
            level: position.level,
          }
        : null,
      team: team
        ? {
            id: team.id,
            name: team.name,
          }
        : null,
      department: department
        ? {
            id: department.id,
            name: department.name,
          }
        : null,
      availability: user.availability.map((a) => ({
        id: a.id,
        type: a.type,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate?.toISOString() ?? null,
        fraction: a.fraction ?? null,
        note: a.note ?? null,
      })),
      allocations: user.allocations.map((a) => ({
        id: a.id,
        projectId: a.projectId,
        projectName: a.project.name,
        fraction: a.fraction,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate?.toISOString() ?? null,
        note: a.note ?? null,
      })),
    };

    return NextResponse.json({ ok: true, person: dto });
  } catch (error) {
    console.error("Error loading org person detail:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load person" },
      { status: 500 }
    );
  }
}

