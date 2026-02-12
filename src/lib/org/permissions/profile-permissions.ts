import { prisma } from "@/lib/db";

export type ProfileField =
  | "name"
  | "email"
  | "title"
  | "department"
  | "team"
  | "startDate"
  | "employmentType"
  | "location"
  | "timezone"
  | "weeklyCapacity"
  | "skills"
  | "bio";

export type PermissionLevel = "none" | "view" | "edit" | "admin";

export interface ProfilePermissions {
  canEditField: (field: ProfileField) => boolean;
  canRequestTimeOff: boolean;
  canApproveTimeOff: boolean;
  canEditCapacity: boolean;
  permissionLevel: PermissionLevel;
}

export async function getProfilePermissions(
  viewerId: string,
  targetUserId: string,
  workspaceId: string
): Promise<ProfilePermissions> {
  const [viewerMember, managerLink] = await Promise.all([
    prisma.workspaceMember.findFirst({
      where: { userId: viewerId, workspaceId },
      select: { role: true },
    }),
    prisma.personManagerLink.findFirst({
      where: {
        workspaceId,
        managerId: viewerId,
        personId: targetUserId,
      },
    }),
  ]);

  const isAdmin = ["ADMIN", "OWNER"].includes(viewerMember?.role ?? "");
  const isSelf = viewerId === targetUserId;
  const isManager = !!managerLink;

  let permissionLevel: PermissionLevel = "none";
  if (isAdmin) permissionLevel = "admin";
  else if (isManager) permissionLevel = "edit";
  else if (isSelf) permissionLevel = "view";

  const fieldPermissions: Record<ProfileField, PermissionLevel[]> = {
    name: ["admin"],
    email: ["admin"],
    startDate: ["admin"],
    employmentType: ["admin"],
    title: ["admin", "edit"],
    department: ["admin", "edit"],
    team: ["admin", "edit"],
    weeklyCapacity: ["admin", "edit"],
    location: ["admin", "edit", "view"],
    timezone: ["admin", "edit", "view"],
    skills: ["admin", "edit", "view"],
    bio: ["admin", "edit", "view"],
  };

  return {
    canEditField: (field: ProfileField) => {
      const allowedLevels = fieldPermissions[field] ?? [];
      return allowedLevels.includes(permissionLevel);
    },
    canRequestTimeOff: isSelf || isAdmin,
    canApproveTimeOff: isManager || isAdmin,
    canEditCapacity: isManager || isAdmin,
    permissionLevel,
  };
}

export async function canEditProfile(
  editorId: string,
  targetUserId: string,
  workspaceId: string
): Promise<boolean> {
  const perms = await getProfilePermissions(editorId, targetUserId, workspaceId);
  return perms.permissionLevel !== "none";
}

export async function isManagerOf(
  managerId: string,
  reportId: string,
  workspaceId: string
): Promise<boolean> {
  const link = await prisma.personManagerLink.findFirst({
    where: {
      workspaceId,
      managerId,
      personId: reportId,
    },
  });
  return !!link;
}
