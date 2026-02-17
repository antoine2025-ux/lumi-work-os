// @ts-nocheck
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export type OrgTeamDetailDTO = {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
  updatedAt: string;
};

export async function getOrgTeamById(
  teamId: string
): Promise<OrgTeamDetailDTO | null> {
  const workspaceId = await getCurrentWorkspaceId();

  const team = await prisma.orgTeam.findFirst({
    where: {
      id: teamId,
      workspaceId,
    },
    include: {
      department: true,
    },
  });

  if (!team) {
    return null;
  }

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    departmentId: team.departmentId,
    departmentName: team.department?.name ?? null,
    isActive: team.isActive,
    updatedAt: team.updatedAt.toISOString(),
  };
}

export type OrgTeamMemberDTO = {
  positionId: string;
  userId: string | null;
  fullName: string | null;
  roleTitle: string | null;
  level: number | null;
  isVacant: boolean;
};

export type OrgTeamWithMembersDTO = {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
  updatedAt: string;
  members: OrgTeamMemberDTO[];
};

export async function getOrgTeamWithMembers(
  teamId: string
): Promise<OrgTeamWithMembersDTO | null> {
  const workspaceId = await getCurrentWorkspaceId();

  const team = await prisma.orgTeam.findFirst({
    where: {
      id: teamId,
      workspaceId,
    },
    include: {
      department: true,
      positions: {
        where: { isActive: true },
        include: {
          user: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!team) {
    return null;
  }

  const members: OrgTeamMemberDTO[] = team.positions.map((pos) => {
    const fullName = pos.user ? (pos.user.name ?? pos.user.email ?? null) : null;

    return {
      positionId: pos.id,
      userId: pos.userId,
      fullName,
      roleTitle: pos.title ?? null,
      level: pos.level ?? null,
      isVacant: !pos.userId,
    };
  });

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    departmentId: team.departmentId,
    departmentName: team.department?.name ?? null,
    isActive: team.isActive,
    updatedAt: team.updatedAt.toISOString(),
    members,
  };
}

