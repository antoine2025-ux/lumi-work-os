/**
 * POST /api/org/structure/teams/[teamId]/members/remove
 * Remove a member from a team.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { removeTeamMember } from "@/server/org/structure/write";
import { handleApiError } from "@/lib/api-errors"
import { logOrgAudit } from "@/lib/audit/org-audit"
import { computeChanges } from "@/lib/audit/diff"
import { prisma } from "@/lib/db"
import { RemoveTeamMemberSchema } from "@/lib/validations/org"

export async function POST(request: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[POST /api/org/structure/teams/[teamId]/members/remove] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    // Step 2: Assert access (verifies workspace membership and role)
    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["MEMBER"] });

    // Step 3: Set workspace context (for backward compatibility, though middleware is disabled)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse request
    const { teamId } = await ctx.params;
    const body = RemoveTeamMemberSchema.parse(await request.json());
    const personId = body.personId;

    // Step 4a: Fetch person before update for audit logging
    const personBefore = await prisma.orgPosition.findFirst({
      where: { userId: personId, workspaceId, isActive: true },
      select: { userId: true, title: true, teamId: true },
    });

    // Step 5: Remove team member (with workspaceId validation)
    await removeTeamMember({ teamId, personId, workspaceId });

    // Step 6: Log audit entry (fire-and-forget) - entityType PERSON, track teamId null
    if (personBefore && personBefore.teamId === teamId) {
      const changes = computeChanges(
        { teamId: personBefore.teamId },
        { teamId: null },
        ["teamId"]
      );
      if (changes) {
        logOrgAudit({
          workspaceId,
          entityType: "PERSON",
          entityId: personId,
          entityName: personBefore.title || personId,
          action: "UPDATED",
          actorId: userId,
          changes,
        }).catch((e) => console.error("[POST /api/org/structure/teams/[teamId]/members/remove] Audit error:", e));
      }
    }

    // Step 7: Emit Loopbrain context (persist + trigger indexing non-blocking)
    // Wrap in try-catch to handle cases where context_items table doesn't exist yet
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.team.member_removed",
        entity: { type: "team", id: teamId },
        payload: { personId },
      });
    } catch (contextError: any) {
      // Log but don't fail - context emission is non-blocking
      // Common case: context_items table may not exist yet if migrations haven't run
      console.warn("[POST /api/org/structure/teams/[teamId]/members/remove] Failed to emit context object (non-blocking):", contextError?.message);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[POST /api/org/structure/teams/[teamId]/members/remove] Context error details:", {
          message: contextError?.message,
          code: contextError?.code,
          stack: contextError?.stack,
        });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error, request)
  }
}

