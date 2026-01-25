import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export type OrgPositionListItemDTO = {
  id: string;
  title: string;
  level: number | null;
  isActive: boolean;
  teamId: string | null;
  teamName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  userId: string | null;
  userName: string | null;
  updatedAt: string;
};

export type OrgPositionDetailDTO = OrgPositionListItemDTO & {
  roleDescription: string | null;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
};

export async function getOrgPositionsList(): Promise<OrgPositionListItemDTO[]> {
  const workspaceId = await getCurrentWorkspaceId();

  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
    },
    include: {
      team: {
        include: {
          department: true,
        },
      },
      user: true,
    },
    orderBy: [
      { level: "asc" },
      { order: "asc" },
    ],
  });

  return positions.map((pos) => ({
    id: pos.id,
    title: pos.title,
    level: pos.level ?? null,
    isActive: pos.isActive,
    teamId: pos.teamId,
    teamName: pos.team?.name ?? null,
    departmentId: pos.team?.departmentId ?? null,
    departmentName: pos.team?.department?.name ?? null,
    userId: pos.userId,
    userName: pos.user?.name ?? pos.user?.email ?? null,
    updatedAt: pos.updatedAt.toISOString(),
  }));
}

export async function getOrgPositionById(
  positionId: string
): Promise<OrgPositionDetailDTO | null> {
  const workspaceId = await getCurrentWorkspaceId();

  const pos = await prisma.orgPosition.findFirst({
    where: {
      id: positionId,
      workspaceId,
    },
    include: {
      team: {
        include: {
          department: true,
        },
      },
      user: true,
    },
  });

  if (!pos) {
    return null;
  }

  return {
    id: pos.id,
    title: pos.title,
    level: pos.level ?? null,
    isActive: pos.isActive,
    teamId: pos.teamId,
    teamName: pos.team?.name ?? null,
    departmentId: pos.team?.departmentId ?? null,
    departmentName: pos.team?.department?.name ?? null,
    userId: pos.userId,
    userName: pos.user?.name ?? pos.user?.email ?? null,
    updatedAt: pos.updatedAt.toISOString(),
    roleDescription: pos.roleDescription ?? null,
    responsibilities: pos.responsibilities ?? [],
    requiredSkills: pos.requiredSkills ?? [],
    preferredSkills: pos.preferredSkills ?? [],
  };
}

