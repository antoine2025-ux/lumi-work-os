/**
 * POST /api/org/structure/teams/[teamId]/members/add
 * Add a member to a team.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { addTeamMember } from "@/server/org/structure/write";
import { handleApiError } from "@/lib/api-errors"
import { logOrgAudit } from "@/lib/audit/org-audit"
import { computeChanges } from "@/lib/audit/diff"
import { prisma } from "@/lib/db"
import { AddTeamMemberSchema } from "@/lib/validations/org"

export async function POST(request: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[POST /api/org/structure/teams/[teamId]/members/add] Missing userId or workspaceId", { userId, workspaceId });
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
    const body = AddTeamMemberSchema.parse(await request.json());
    const personId = body.personId;

    // Step 4a: Fetch person before update for audit logging
    const personBefore = await prisma.orgPosition.findFirst({
      where: { userId: personId, workspaceId, isActive: true },
      select: { userId: true, title: true, teamId: true },
    });

    // Step 5: Add team member (with workspaceId validation)
    const created = await addTeamMember({ teamId, personId, workspaceId });

    // Step 6: Log audit entry (fire-and-forget) - entityType PERSON, track teamId change
    if (personBefore) {
      const changes = computeChanges(
        { teamId: personBefore.teamId },
        { teamId: teamId },
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
        }).catch((e) => console.error("[POST /api/org/structure/teams/[teamId]/members/add] Audit error:", e));
      }
    }

    // Step 7: Emit Loopbrain context (persist + trigger indexing non-blocking)
    // Wrap in try-catch to handle cases where context_items table doesn't exist yet
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.team.member_added",
        entity: { type: "team", id: teamId },
        payload: { personId },
      });
    } catch (contextError: unknown) {
      const message = contextError instanceof Error ? contextError.message : String(contextError);
      const code = contextError && typeof contextError === 'object' && 'code' in contextError ? (contextError as { code: string }).code : undefined;
      const stack = contextError instanceof Error ? contextError.stack : undefined;
      console.warn("[POST /api/org/structure/teams/[teamId]/members/add] Failed to emit context object (non-blocking):", message);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[POST /api/org/structure/teams/[teamId]/members/add] Context error details:", {
          message,
          code,
          stack,
        });
      }
    }

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

