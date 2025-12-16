import { NextRequest, NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { getOrgContext } from "@/server/rbac";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext(request);
    if (!ctx.user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    const orgId = ctx.orgId;
    if (!orgId) return NextResponse.json({ ok: false, error: "No organization membership", noOrgMembership: true }, { status: 403 });

    const workspaceId = await getCurrentWorkspaceId(request);

    // Cache with org-scoped tag
    const key = `org:${orgId}:people`;
    const people = await unstable_cache(
      async () => {
        // Get all workspace members
        const workspaceMembers = await prisma.workspaceMember.findMany({
          where: { workspaceId },
          select: {
            userId: true,
          },
        });

        const memberUserIds = workspaceMembers.map((m) => m.userId);

        // Positions that have users assigned in this workspace (exclude archived)
        const positionsWithUsers = await prisma.orgPosition.findMany({
          where: {
            workspaceId,
            isActive: true,
            archivedAt: null, // Exclude archived people
            userId: {
              not: null,
            },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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
            parent: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                children: true,
              },
            },
          },
        });

        // Build a map from userId -> primary position (first one we see)
        const userIdToPosition = new Map<
          string,
          {
            positionId: string;
            positionTitle: string;
            teamId: string | null;
            teamName: string | null;
            departmentId: string | null;
            departmentName: string | null;
            managerId: string | null;
            managerName: string | null;
            directReportCount: number;
          }
        >();

        for (const pos of positionsWithUsers) {
          if (!pos.user) continue;
          if (userIdToPosition.has(pos.user.id)) continue;

          const team = pos.team;
          const department = team?.department ?? null;
          const manager = pos.parent?.user ?? null;

          userIdToPosition.set(pos.user.id, {
            positionId: pos.id,
            positionTitle: pos.title,
            teamId: team?.id ?? null,
            teamName: team?.name ?? null,
            departmentId: department?.id ?? null,
            departmentName: department?.name ?? null,
            managerId: manager?.id ?? null,
            managerName: manager?.name ?? null,
            directReportCount: pos._count.children,
          });
        }

        // Fetch users who are either workspace members or assigned to a position
        const relevantUserIds = Array.from(
          new Set([
            ...memberUserIds,
            ...Array.from(userIdToPosition.keys()),
          ])
        );

        if (relevantUserIds.length === 0) {
          return [];
        }

        const users = await prisma.user.findMany({
          where: {
            id: {
              in: relevantUserIds,
            },
          },
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
          orderBy: {
            name: "asc",
          },
        });

        return users.map((user) => {
          const pos = userIdToPosition.get(user.id);

          return {
            id: user.id,
            name: user.name ?? "Unnamed",
            fullName: user.name ?? "Unnamed",
            email: user.email,
            positionId: pos?.positionId ?? null,
            title: pos?.positionTitle ?? null,
            role: pos?.positionTitle ?? null,
            teamId: pos?.teamId ?? null,
            teamName: pos?.teamName ?? null,
            team: pos?.teamName ?? null,
            departmentId: pos?.departmentId ?? null,
            departmentName: pos?.departmentName ?? null,
            managerId: pos?.managerId ?? null,
            managerName: pos?.managerName ?? null,
            directReportCount: pos?.directReportCount ?? 0,
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
        });
      },
      [key, workspaceId],
      { tags: [key], revalidate: 60 }
    )();

    return NextResponse.json({
      ok: true,
      people,
    });
  } catch (error) {
    console.error("Error loading org people:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load people" },
      { status: 500 }
    );
  }
}

