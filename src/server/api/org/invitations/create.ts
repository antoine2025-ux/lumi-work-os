import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { prisma } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/appUrl";
import { createErrorResponse, createSuccessResponse } from "@/server/api/responses";

const INVITATION_EXPIRY_DAYS = 14;

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return null;
  return email;
}

type Body = {
  workspaceId?: string;
  email?: string;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);

    if (!auth.isAuthenticated || !auth.user.userId) {
      return createErrorResponse(
        "UNAUTHENTICATED",
        "You must be signed in to invite members."
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : null;
    const email = normalizeEmail(body.email);

    if (!workspaceId) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing workspace id (workspaceId)."
      );
    }

    if (!email) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Please provide a valid email address."
      );
    }

    if (auth.user.email && email === auth.user.email.toLowerCase()) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "You cannot invite yourself."
      );
    }

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: auth.user.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!member) {
      return createErrorResponse(
        "ORG_NOT_MEMBER",
        "You are not a member of this workspace."
      );
    }

    if (member.role !== "ADMIN" && member.role !== "OWNER") {
      return createErrorResponse(
        "FORBIDDEN",
        "Only admins can invite new members."
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const existingMembership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: existingUser.id,
        },
      });

      if (existingMembership) {
        return createErrorResponse(
          "CONFLICT",
          "This user is already a member of the workspace."
        );
      }
    }

    const existingInvitation = await prisma.orgInvitation.findFirst({
      where: {
        workspaceId,
        email,
        status: "PENDING",
      },
    });

    if (existingInvitation) {
      return createErrorResponse(
        "CONFLICT",
        "A pending invitation for this email already exists."
      );
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    const invitation = await prisma.orgInvitation.create({
      data: {
        workspaceId,
        email,
        status: "PENDING",
        invitedById: auth.user.userId,
        expiresAt,
      },
    });

    const baseUrl = getAppBaseUrl();
    const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

    const updatedInvitation = await prisma.orgInvitation.update({
      where: { id: invitation.id },
      data: { inviteUrl },
    });

    return createSuccessResponse(
      {
        invitation: updatedInvitation,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[ORG_INVITATION_CREATE_ERROR]", err);
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "Something went wrong while creating the invitation."
    );
  }
}

