import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);

    if (!auth.isAuthenticated || !auth.user.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : null;
    const invitationId = typeof body.invitationId === "string" ? body.invitationId : null;

    if (!workspaceId || !invitationId) {
      return NextResponse.json(
        { error: "Missing workspaceId or invitationId." },
        { status: 400 }
      );
    }

    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    });
    setWorkspaceContext(workspaceId);

    const invitation = await prisma.orgInvitation.findFirst({
      where: {
        id: invitationId,
        workspaceId,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found." },
        { status: 404 }
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending invitations can be cancelled." },
        { status: 400 }
      );
    }

    const updated = await prisma.orgInvitation.update({
      where: { id: invitationId },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({ invitation: updated }, { status: 200 });
  } catch (err: unknown) {
    console.error("[ORG_INVITATION_CANCEL_ERROR]", err);
    return NextResponse.json(
      { error: "Something went wrong while cancelling the invitation." },
      { status: 500 }
    );
  }
}

