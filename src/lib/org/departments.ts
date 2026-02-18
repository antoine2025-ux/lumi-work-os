import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export type OrgDepartmentDetailDTO = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  order: number;
  isActive: boolean;
  teamCount: number;
  updatedAt: string;
};

export async function getOrgDepartmentById(
  departmentId: string
): Promise<OrgDepartmentDetailDTO | null> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return null;
  }

  const department = await prisma.orgDepartment.findFirst({
    where: {
      id: departmentId,
      workspaceId,
    },
  });

  if (!department) {
    return null;
  }

  const teamCount = await prisma.orgTeam.count({
    where: {
      workspaceId,
      departmentId: department.id,
      isActive: true,
    },
  });

  return {
    id: department.id,
    name: department.name,
    description: department.description,
    color: department.color,
    order: department.order,
    isActive: department.isActive,
    teamCount,
    updatedAt: department.updatedAt.toISOString(),
  };
}

