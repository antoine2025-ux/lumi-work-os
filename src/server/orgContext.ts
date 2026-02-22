import { getServerSession } from "next-auth";
import { authOptions } from "@/server/authOptions";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { NextRequest } from "next/server";

export async function getActiveOrgContext(request?: NextRequest) {
  try {
    // In API routes, getServerSession automatically reads from request headers
    // But we can pass headers explicitly if request is provided
    const session = request 
      ? await getServerSession(authOptions)
      : await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | null | undefined)?.id;
    const activeOrgId = (session as { activeOrgId?: string } | null | undefined)?.activeOrgId;

    if (!userId) return { userId: null, orgId: null, orgName: null, role: "VIEWER" as const };

    // Ensure prisma is initialized
    if (!prisma) {
      console.error("[getActiveOrgContext] Prisma client is undefined");
      return { userId, orgId: null, orgName: null, role: "VIEWER" as const };
    }

    // Try to get org from OrgMembership first (new system)
    // Wrapped in try/catch as a safety net during schema transitions
    try {
      if (prisma.orgMembership) {
        const membership = activeOrgId
          ? await prisma.orgMembership.findUnique({
              where: { orgId_userId: { orgId: activeOrgId, userId } },
              select: { role: true, org: { select: { id: true, name: true } } },
            })
          : await prisma.orgMembership.findFirst({
              where: { userId },
              orderBy: { createdAt: "asc" },
              select: { role: true, org: { select: { id: true, name: true } } },
            });

        if (membership) {
          return {
            userId,
            orgId: membership.org.id,
            orgName: membership.org.name,
            role: membership.role as string,
          };
        }
      }
    } catch (orgMembershipError) {
      // Table may not exist during migration - fall through to workspace-based resolution
      console.warn("[getActiveOrgContext] OrgMembership query failed, falling back to workspace:", 
        orgMembershipError instanceof Error ? orgMembershipError.message : "Unknown error");
    }

    // Fallback: Use workspace-based org resolution (legacy system)
    // This matches the behavior of /api/org/current
    try {
      let workspaceId: string | null = null;
      
      // Try to get workspace ID - getCurrentWorkspaceId can be called with or without request
      if (request) {
        workspaceId = await getCurrentWorkspaceId(request);
      } else {
        // In server components, we can try to get workspace from user's memberships
        // This is a fallback when request is not available
        const { prisma: dbPrisma } = await import("@/lib/db");
        const membership = await dbPrisma.workspaceMember.findFirst({
          where: { userId },
          include: { workspace: { select: { id: true, name: true } } },
          orderBy: { joinedAt: "asc" },
        });
        
        if (membership?.workspace) {
          return {
            userId,
            orgId: membership.workspace.id,
            orgName: membership.workspace.name || "Unnamed Organization",
            role: "VIEWER" as const, // Default role for workspace-based access
          };
        }
      }
        
      if (workspaceId) {
        // Check if this workspace exists and use it as the org
        // Use the db client from @/lib/db which has the workspace model
        const { prisma: dbPrisma } = await import("@/lib/db");
        const workspace = await dbPrisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { id: true, name: true },
        });

        if (workspace) {
          return {
            userId,
            orgId: workspace.id,
            orgName: workspace.name || "Unnamed Organization",
            role: "VIEWER" as const, // Default role for workspace-based access
          };
        }
      }
    } catch (_error) {
      // getCurrentWorkspaceId may throw if no workspace found, that's ok
      // This is expected for users without workspaces
    }

    // No org found in either system
    return { userId, orgId: null, orgName: null, role: "VIEWER" as const };
  } catch (error) {
    console.error("[getActiveOrgContext] Error:", error);
    return { userId: null, orgId: null, orgName: null, role: "VIEWER" as const };
  }
}

