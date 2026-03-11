import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/appUrl";
import { createErrorResponse, createSuccessResponse } from "@/server/api/responses";
import { sendWorkspaceInvite } from "@/lib/email/send-invite";
import { handleApiError } from "@/lib/api-errors";

const INVITATION_EXPIRY_DAYS = 14;

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return null;
  return email;
}

type OrgRoleValue = "VIEWER" | "EDITOR" | "ADMIN";

type Body = {
  workspaceId?: string;
  email?: string;
  fullName?: string;
  role?: OrgRoleValue;
  title?: string;
  departmentId?: string;
  teamId?: string;
  managerId?: string;
  jobDescriptionId?: string;
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
    const VALID_ORG_ROLES: OrgRoleValue[] = ["VIEWER", "EDITOR", "ADMIN"];
    const role: OrgRoleValue =
      body.role && VALID_ORG_ROLES.includes(body.role) ? body.role : "VIEWER";

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

    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    });
    setWorkspaceContext(workspaceId);

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
        fullName: body.fullName?.trim() || null,
        role,
        status: "PENDING",
        invitedById: auth.user.userId,
        expiresAt,
        title: body.title,
        departmentId: body.departmentId,
        teamId: body.teamId,
        managerId: body.managerId,
        jobDescriptionId: body.jobDescriptionId ?? null,
      },
    });

    const baseUrl = getAppBaseUrl();
    const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

    const updatedInvitation = await prisma.orgInvitation.update({
      where: { id: invitation.id },
      data: { inviteUrl },
    });

    // Send invite email (best-effort — invitation is created regardless of email outcome)
    const [workspace, inviter] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: auth.user.userId }, select: { name: true, email: true } }),
    ]);
    sendWorkspaceInvite({
      to: email,
      workspaceName: workspace?.name ?? "your workspace",
      inviterName: inviter?.name ?? inviter?.email ?? "A team member",
      inviteToken: updatedInvitation.token,
      role: updatedInvitation.role ?? "MEMBER",
    }).catch((emailErr) => {
      console.error("[ORG_INVITATION_EMAIL_ERROR]", emailErr);
    });

    return createSuccessResponse(
      {
        invitation: updatedInvitation,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return handleApiError(err, req);
  }
}

