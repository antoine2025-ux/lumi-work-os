import { getUnifiedAuth } from "@/lib/unified-auth";
import { prisma } from "@/lib/db";

export async function getWorkspaceForCurrentUser(workspaceId: string) {
  const auth = await getUnifiedAuth();

  if (!auth.isAuthenticated || !auth.user.userId) {
    throw new Error("Not authenticated");
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: auth.user.userId,
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    throw new Error("Not authorized to access this workspace.");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  return workspace;
}

