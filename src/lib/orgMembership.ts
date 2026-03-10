import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import type { OrgPermissionLevel } from "./orgPermissions";

/**
 * Helper: map a WorkspaceMember record to OrgPermissionLevel.
 * 
 * Logic:
 * - If user is workspace owner → OWNER
 * - If member.role is OWNER → OWNER
 * - If member.role is ADMIN → ADMIN
 * - Otherwise (MEMBER, VIEWER) → MEMBER
 */
function mapMemberToPermissionLevel(
  member: { role: string } | null,
  workspaceOwnerId: string | null,
  userId: string
): OrgPermissionLevel {
  if (!member) return "MEMBER";

  // Check if user is the workspace owner
  if (workspaceOwnerId === userId) {
    return "OWNER";
  }

  const roleName = member.role?.toString().toUpperCase();

  if (roleName === "OWNER") return "OWNER";
  if (roleName === "ADMIN") return "ADMIN";

  // MEMBER and VIEWER both map to MEMBER for Org Center permissions
  return "MEMBER";
}

/**
 * Resolve the current user's org membership and permission level for a given workspaceId.
 * Returns null if there's no logged-in user or no membership.
 */
export async function resolveOrgPermissionForCurrentUser(
  workspaceId: string,
  request?: NextRequest
): Promise<{
  permissionLevel: OrgPermissionLevel;
  memberId: string | null;
} | null> {
  if (!workspaceId) return null;

  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth.user.userId;

    if (!userId) return null;

    // Fetch workspace with owner info and membership
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!workspace) return null;

    // Fetch membership
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });

    // If no membership record exists, user doesn't have access
    if (!member) {
      return null;
    }

    const permissionLevel = mapMemberToPermissionLevel(
      member,
      workspace.ownerId,
      userId
    );

    return {
      permissionLevel,
      memberId: member.id,
    };
  } catch (error) {
    console.error("[resolveOrgPermissionForCurrentUser]", error);
    return null;
  }
}

