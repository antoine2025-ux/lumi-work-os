import { prisma } from "@/lib/db";

export type OrgMembershipRecord = {
  id: string;
  orgId: string;
  userId: string;
  role: string;
  customRole?: {
    id: string;
    key: string;
    name: string;
    capabilities: any;
  } | null;
};

export type OrgRecord = {
  id: string;
  name: string | null;
  slug: string | null;
};

/**
 * Look up the user's org + membership.
 *
 * ADAPT THIS TO YOUR SCHEMA:
 * - Uses `Workspace` and `WorkspaceMember` models (workspaceId = orgId).
 * - If you store "current org" in session/cookie, pass its id as `currentOrgId`.
 */
export async function getOrgAndMembershipForUser(
  userId: string,
  currentOrgId?: string | null
): Promise<{ org: OrgRecord; membership: OrgMembershipRecord } | null> {
  if (!userId) return null;

  if (!prisma) return null;

  try {

  // If we have an explicit orgId, prefer that.
  if (currentOrgId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: currentOrgId },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
      },
    });

    if (!workspace) return null;

    // Try to include customRole, but handle gracefully if relation doesn't exist yet (before migrations)
    let membership;
    try {
      membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: currentOrgId,
            userId,
          },
        },
        include: {
          customRole: true,
        },
      });
    } catch (error: any) {
      // If customRole relation doesn't exist yet (before migrations), fetch without it
      if (error?.message?.includes('customRole') || error?.code === 'P2025') {
        membership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: currentOrgId,
              userId,
            },
          },
        });
      } else {
        throw error;
      }
    }

    // If user is workspace owner but no membership record exists, treat as OWNER
    if (!membership && workspace.ownerId === userId) {
      return {
        org: {
          id: workspace.id,
          name: workspace.name ?? null,
          slug: workspace.slug ?? null,
        },
        membership: {
          id: `owner-${workspace.id}-${userId}`,
          orgId: workspace.id,
          userId,
          role: "OWNER",
        },
      };
    }

    if (!membership) return null;

    // If user is workspace owner, override membership role to OWNER
    const role = workspace.ownerId === userId ? "OWNER" : membership.role;

    return {
      org: {
        id: workspace.id,
        name: workspace.name ?? null,
        slug: workspace.slug ?? null,
      },
      membership: {
        id: membership.id,
        orgId: membership.workspaceId,
        userId: membership.userId,
        role,
        customRole: membership.customRole,
      },
    };
  }

  // Fallback: pick the earliest org membership for this user.
  // Try to include customRole, but handle gracefully if relation doesn't exist yet
  let membership;
  try {
    membership = await prisma.workspaceMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: "asc" },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
          },
        },
        customRole: true,
      },
    });
  } catch (error: any) {
    // If customRole relation doesn't exist yet (before migrations), fetch without it
    if (error?.message?.includes('customRole') || error?.code === 'P2025') {
      membership = await prisma.workspaceMember.findFirst({
        where: { userId },
        orderBy: { joinedAt: "asc" },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              ownerId: true,
            },
          },
        },
      });
    } else {
      throw error;
    }
  }

  if (!membership || !membership.workspace) {
    // Check if user owns any workspace (even without membership record)
    const ownedWorkspace = await prisma.workspace.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
    });

    if (ownedWorkspace) {
      return {
        org: {
          id: ownedWorkspace.id,
          name: ownedWorkspace.name ?? null,
          slug: ownedWorkspace.slug ?? null,
        },
        membership: {
          id: `owner-${ownedWorkspace.id}-${userId}`,
          orgId: ownedWorkspace.id,
          userId,
          role: "OWNER",
        },
      };
    }

    return null;
  }

  // If user is workspace owner, override membership role to OWNER
  const role =
    membership.workspace.ownerId === userId ? "OWNER" : membership.role;

    return {
      org: {
        id: membership.workspace.id,
        name: membership.workspace.name ?? null,
        slug: membership.workspace.slug ?? null,
      },
      membership: {
        id: membership.id,
        orgId: membership.workspaceId,
        userId: membership.userId,
        role,
        customRole: (membership as any).customRole || null,
      },
    };
  } catch (error) {
    // Gracefully handle database errors
    console.error("[getOrgAndMembershipForUser] Error fetching org membership:", error);
    return null;
  }
}

