import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
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

// Define the include shape for proper typing
const positionInclude = {
  team: {
    include: {
      department: true,
    },
  },
  user: true,
} satisfies Prisma.OrgPositionInclude;

type PositionWithRelations = Prisma.OrgPositionGetPayload<{
  include: typeof positionInclude;
}>;

export async function getOrgPositionsList(): Promise<OrgPositionListItemDTO[]> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return [];
  }

  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
    },
    include: positionInclude,
    orderBy: [
      { level: "asc" },
      { order: "asc" },
    ],
  });

  return positions.map((pos: PositionWithRelations) => ({
    id: pos.id,
    title: pos.title || "Untitled Position",
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
  if (!workspaceId) {
    return null;
  }

  const pos = await prisma.orgPosition.findFirst({
    where: {
      id: positionId,
      workspaceId,
    },
    include: positionInclude,
  });

  if (!pos) {
    return null;
  }

  return {
    id: pos.id,
    title: pos.title || "Untitled Position",
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

