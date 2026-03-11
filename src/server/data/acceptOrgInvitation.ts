import { prisma } from "@/lib/db";
import { logOrgAuditEvent } from "@/server/audit/orgAudit";
import { ensureOrgPositionForUser } from "@/lib/org/ensure-org-position";

function mapOrgRoleToWorkspaceRole(orgRole: string | null | undefined): "ADMIN" | "MEMBER" | "VIEWER" {
  switch (orgRole) {
    case "ADMIN": return "ADMIN";
    case "EDITOR": return "MEMBER";
    case "VIEWER": return "VIEWER";
    default: return "MEMBER";
  }
}

type AcceptOrgInvitationResult = {
  workspace: {
    id: string;
    name: string | null;
  };
  membershipCreated: boolean;
};

type AcceptContext = {
  /** Session email — must match invite to create user or accept */
  sessionEmail?: string;
  /** Session name — used when creating a new user */
  sessionName?: string;
};

export async function acceptOrgInvitationByToken(
  token: string,
  userId: string,
  context?: AcceptContext
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

  // Resolve database user ID. session.user.id can be wrong (e.g. OAuth provider sub) when
  // JWT callback couldn't sync with DB. Fallback: look up by invite email.
  let dbUserId = userId;
  const userById = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!userById) {
    const userByEmail = await prisma.user.findFirst({
      where: {
        email: { equals: invitation.email.trim(), mode: 'insensitive' as const },
      },
      select: { id: true, email: true },
    });
    if (userByEmail) {
      dbUserId = userByEmail.id;
    } else {
      // Create user on invite accept — they signed in (proved email ownership) but User wasn't synced
      const sessionEmail = context?.sessionEmail?.trim().toLowerCase();
      const inviteEmail = invitation.email.trim().toLowerCase();
      if (sessionEmail && sessionEmail === inviteEmail) {
        const newUser = await prisma.user.create({
          data: {
            email: invitation.email.trim().toLowerCase(),
            name: context?.sessionName?.trim() || invitation.fullName?.trim() || invitation.email.split("@")[0],
            emailVerified: new Date(),
          },
        });
        dbUserId = newUser.id;
      } else {
        throw new Error(
          "Your account could not be found. Please sign out and sign in again with the invited email, then try the invite link."
        );
      }
    }
  } else {
    const normalizedUserEmail = userById.email?.trim().toLowerCase();
    const normalizedInviteEmail = invitation.email.trim().toLowerCase();
    if (normalizedUserEmail && normalizedUserEmail !== normalizedInviteEmail) {
      throw new Error(
        "This invitation was sent to a different email address. Please sign in with the invited email."
      );
    }
  }

  if (invitation.status === "ACCEPTED") {
    // Already accepted – we still allow navigation into the workspace.
    if (!invitation.workspaceId || !invitation.workspace) {
      throw new Error("Invalid invitation: missing workspace information.");
    }

    const existingMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId: dbUserId,
      },
    });

    if (!existingMembership) {
      // Edge case: mark as member if not already (e.g. imported users).
      await prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: dbUserId,
          role: mapOrgRoleToWorkspaceRole(invitation.role),
        },
      });
      await ensureOrgPositionForUser(prisma, {
        workspaceId: invitation.workspaceId,
        userId: dbUserId,
        title: invitation.title || undefined,
        teamId: invitation.teamId || undefined,
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

  if (!invitation.workspaceId || !invitation.workspace) {
    throw new Error("Invalid invitation: missing workspace information.");
  }

  const existingMembership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: invitation.workspaceId,
      userId: dbUserId,
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
  const workspaceRole = mapOrgRoleToWorkspaceRole(invitation.role);
  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId!,
        userId: dbUserId,
        role: workspaceRole,
      },
    });

    await ensureOrgPositionForUser(tx, {
      workspaceId: invitation.workspaceId!,
      userId: dbUserId,
      title: invitation.title || undefined,
      teamId: invitation.teamId || undefined,
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
      actorUserId: dbUserId,
      targetUserId: dbUserId,
      event: "MEMBER_ADDED",
      metadata: {
        via: "INVITATION",
        invitationId: invitation.id,
        email: invitation.email,
      },
    });
  });

  // Post-transaction: apply JD linking and auto-create RoleCard (best-effort).
  if (invitation.jobDescriptionId && invitation.workspaceId) {
    try {
      const position = await prisma.orgPosition.findFirst({
        where: { workspaceId: invitation.workspaceId, userId: dbUserId },
        select: { id: true },
      });
      if (position) {
        await prisma.orgPosition.update({
          where: { id: position.id },
          data: { jobDescriptionId: invitation.jobDescriptionId },
        });
        const jd = await prisma.jobDescription.findUnique({
          where: { id: invitation.jobDescriptionId },
        });
        if (jd) {
          const existingRoleCard = await prisma.roleCard.findFirst({
            where: { positionId: position.id },
          });
          if (!existingRoleCard) {
            await prisma.roleCard.create({
              data: {
                workspaceId: invitation.workspaceId,
                positionId: position.id,
                roleName: jd.title,
                jobFamily: jd.jobFamily ?? '',
                level: jd.level ?? '',
                roleDescription: jd.summary ?? '',
                responsibilities: jd.responsibilities,
                requiredSkills: jd.requiredSkills,
                preferredSkills: jd.preferredSkills,
                keyMetrics: jd.keyMetrics,
                createdById: dbUserId,
              },
            });
          }
        }
      }
    } catch (jdError: unknown) {
      console.warn('[acceptOrgInvitationByToken] JD linking failed (non-blocking):', jdError instanceof Error ? jdError.message : String(jdError));
    }
  }

  return {
    workspace: invitation.workspace,
    membershipCreated: true,
  };
}

