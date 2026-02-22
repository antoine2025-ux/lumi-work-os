import { prisma } from "@/lib/db";
import { logOrgAuditEvent } from "@/server/audit/orgAudit";
import { ensureOrgPositionForUser } from "@/lib/org/ensure-org-position";

type AcceptOrgInvitationResult = {
  workspace: {
    id: string;
    name: string | null;
  };
  membershipCreated: boolean;
};

export async function acceptOrgInvitationByToken(
  token: string,
  userId: string
): Promise<AcceptOrgInvitationResult> {
  const invitation = await prisma.orgInvitation.findUnique({
    where: { token },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new Error("This invitation is invalid or no longer exists.");
  }

  const now = new Date();

  // If the invite has an expiresAt in the past, mark as EXPIRED and block acceptance.
  if (invitation.expiresAt && invitation.expiresAt <= now) {
    if (invitation.status !== "EXPIRED") {
      await prisma.orgInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
    }
    throw new Error("This invitation has expired.");
  }

  if (invitation.status === "EXPIRED") {
    throw new Error("This invitation has expired.");
  }

  if (invitation.status === "REJECTED") {
    throw new Error("This invitation has been cancelled by an admin.");
  }

  if (invitation.status === "ACCEPTED") {
    // Already accepted – we still allow navigation into the workspace.
    if (!invitation.workspaceId || !invitation.workspace) {
      throw new Error("Invalid invitation: missing workspace information.");
    }

    const existingMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId,
      },
    });

    if (!existingMembership) {
      // Edge case: mark as member if not already (e.g. imported users).
      await prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: "MEMBER",
        },
      });
      await ensureOrgPositionForUser(prisma, {
        workspaceId: invitation.workspaceId,
        userId,
      });
      return {
        workspace: invitation.workspace,
        membershipCreated: true,
      };
    }

    return {
      workspace: invitation.workspace,
      membershipCreated: false,
    };
  }

  // Optional: if the invitation email matches a known user, ensure this is the same user.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (user?.email) {
    const normalizedUserEmail = user.email.trim().toLowerCase();
    const normalizedInviteEmail = invitation.email.trim().toLowerCase();

    if (normalizedUserEmail !== normalizedInviteEmail) {
      // We allow admins to invite non-existing emails; but for safety,
      // if a user exists and the email does not match, we block the accept.
      throw new Error(
        "This invitation was sent to a different email address. Please sign in with the invited email."
      );
    }
  }

  if (!invitation.workspaceId || !invitation.workspace) {
    throw new Error("Invalid invitation: missing workspace information.");
  }

  const existingMembership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: invitation.workspaceId,
      userId,
    },
  });

  if (existingMembership) {
    // Mark the invitation as accepted for bookkeeping, but do not create a duplicate membership.
    await prisma.orgInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: now,
      },
    });

    return {
      workspace: invitation.workspace,
      membershipCreated: false,
    };
  }

  // Normal path: create membership and mark invitation as accepted.
  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId!,
        userId,
        role: "MEMBER",
      },
    });

    await ensureOrgPositionForUser(tx, {
      workspaceId: invitation.workspaceId!,
      userId,
    });

    await tx.orgInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: now,
      },
    });

    await logOrgAuditEvent(tx as unknown as Parameters<typeof logOrgAuditEvent>[0], {
      workspaceId: invitation.workspaceId!,
      actorUserId: userId,
      targetUserId: userId,
      event: "MEMBER_ADDED",
      metadata: {
        via: "INVITATION",
        invitationId: invitation.id,
        email: invitation.email,
      },
    });
  });

  return {
    workspace: invitation.workspace,
    membershipCreated: true,
  };
}

