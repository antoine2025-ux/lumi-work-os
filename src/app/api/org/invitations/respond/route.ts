import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { logOrgAudit } from "@/lib/audit/org-audit";
import { computeChanges } from "@/lib/audit/diff";
import { acceptOrgInvitationByToken } from "@/server/data/acceptOrgInvitation";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token: string; decision: "ACCEPT" | "DECLINE" };
    const { user, isAuthenticated, workspaceId } = await getUnifiedAuth(req);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // When user has workspace, enforce VIEWER role (self-action: accepting/declining own invite)
    if (workspaceId) {
      await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["VIEWER"] });
      setWorkspaceContext(workspaceId);
    }

    const invite = await prisma.orgInvitation.findUnique({ where: { token: body.token } });
    if (!invite) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 404 });
    if (invite.status !== "PENDING") return NextResponse.json({ ok: false, error: "Invite already used" }, { status: 400 });
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      await prisma.orgInvitation.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
      return NextResponse.json({ ok: false, error: "Invite expired" }, { status: 400 });
    }

    if (body.decision === "DECLINE") {
      await prisma.orgInvitation.update({ where: { id: invite.id }, data: { status: "DECLINED" } });
      
      // Log audit entry (fire-and-forget)
      const changes = computeChanges(
        { status: invite.status },
        { status: "DECLINED" },
        ["status"]
      );
      if (changes && workspaceId) {
        logOrgAudit({
          workspaceId,
          entityType: "INVITATION",
          entityId: invite.id,
          entityName: invite.email,
          action: "UPDATED",
          actorId: user.userId,
          changes,
        }).catch((e) => console.error("[POST /api/org/invitations/respond] Audit error:", e));
      }
      
      return NextResponse.json({ ok: true, status: "DECLINED" });
    }

    // ACCEPT: use correct acceptance function
    try {
      const result = await acceptOrgInvitationByToken(body.token, user.userId);
      
      // Ensure the created position has a teamId
      const position = await prisma.orgPosition.findFirst({
        where: { 
          workspaceId: result.workspace.id, 
          userId: user.userId 
        },
      });
      
      if (position && !position.teamId) {
        // Assign to default team
        const defaultTeam = await prisma.orgTeam.findFirst({
          where: { 
            workspaceId: result.workspace.id,
            name: 'Executive Team'
          },
        });
        
        if (defaultTeam) {
          await prisma.orgPosition.update({
            where: { id: position.id },
            data: { teamId: defaultTeam.id },
          });
        }
      }
      
      return NextResponse.json({
        ok: true,
        status: "ACCEPTED",
        workspaceId: result.workspace.id,
        orgName: result.workspace.name || "Organization",
        role: "MEMBER",
      });
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ 
          ok: false, 
          error: error.message 
        }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error, req);
  }
}

