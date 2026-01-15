import { prisma } from "@/lib/db";

export async function getOrgInvitationsForWorkspace(workspaceId: string) {
  // Auto-mark expired invitations as EXPIRED before returning.
  const now = new Date();
  await prisma.orgInvitation.updateMany({
    where: {
      workspaceId,
      status: "PENDING",
      expiresAt: {
        not: null,
        lt: now,
      },
    },
    data: {
      status: "EXPIRED",
    },
  });

  const invitations = await prisma.orgInvitation.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return invitations;
}

