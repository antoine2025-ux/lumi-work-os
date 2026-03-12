/**
 * PUT /api/org/structure/teams/[teamId]/owner
 * Set team owner.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { setTeamOwner } from "@/server/org/structure/write";
import { logOrgAudit } from "@/lib/audit/org-audit";
import { computeChanges } from "@/lib/audit/diff";
import { deriveOwnershipIssuesForEntity } from "@/lib/org/deriveIssues";
import { getOrgOwnership } from "@/server/org/ownership/read";
import {
  buildResponseMeta,
  type OwnershipPatch,
  type MutationResult,
} from "@/lib/org/mutations/types";
import { computeIssueResolution } from "@/lib/org/mutations/utils";
import { handleApiError } from "@/lib/api-errors"
import { UpdateTeamOwnerSchema } from "@/lib/validations/org"

export async function PUT(request: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[PUT /api/org/structure/teams/[teamId]/owner] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        { 
          ok: false,
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    // Step 2: Assert access (verifies workspace membership and role)
    // Only workspace owner/admin can set team owners
    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["OWNER", "ADMIN"] });

    // Step 3: Set workspace context (for backward compatibility, though middleware is disabled)
    setWorkspaceContext(workspaceId);

    const workspaceRecord = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });
    const workspaceSlug = workspaceRecord?.slug ?? workspaceId;

    // Step 4: Parse request
    const { teamId } = await ctx.params;
    const body = UpdateTeamOwnerSchema.parse(await request.json());
    const ownerPersonId = body.ownerPersonId;

    // Step 5: Compute issues BEFORE mutation + fetch before for audit
    const [issuesBefore, beforeTeam] = await Promise.all([
      deriveOwnershipIssuesForEntity(workspaceId, "TEAM", teamId, workspaceSlug),
      prisma.orgTeam.findUnique({ where: { id: teamId }, select: { name: true, ownerPersonId: true } }),
    ]);

    // Step 6: Update team owner (with workspaceId validation)
    const updated = await setTeamOwner({ teamId, ownerPersonId, workspaceId });

    // Step 7: Compute issues AFTER mutation
    const issuesAfter = await deriveOwnershipIssuesForEntity(workspaceId, "TEAM", teamId, workspaceSlug);

    // Step 8: Build response metadata
    const responseMeta = buildResponseMeta("mutation:team-owner:v1");

    // Step 9: Diff issues to determine active vs resolved
    const affectedIssues = computeIssueResolution(
      issuesBefore,
      issuesAfter,
      responseMeta.mutationId
    );

    // Step 10: Get updated ownership coverage
    const ownershipData = await getOrgOwnership(workspaceId);

    // Step 11: Emit Loopbrain context (persist + trigger indexing non-blocking)
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.team.owner_set",
        entity: { type: "team", id: updated.id },
        payload: { ownerPersonId },
      });
    } catch (contextError: unknown) {
      const err = contextError as { message?: string };
      console.warn("[PUT /api/org/structure/teams/[teamId]/owner] Failed to emit context object (non-blocking):", err?.message);
    }

    const changes = beforeTeam
      ? computeChanges(
          { ownerPersonId: beforeTeam.ownerPersonId ?? null },
          { ownerPersonId: updated.ownerPersonId ?? null },
          ["ownerPersonId"]
        )
      : null;
    if (changes) {
      logOrgAudit({
        workspaceId,
        entityType: "TEAM",
        entityId: teamId,
        entityName: beforeTeam?.name ?? updated.id,
        action: "UPDATED",
        actorId: userId,
        changes,
      }).catch((e) => console.error("[PUT /api/org/structure/teams/[teamId]/owner] Audit log error (non-fatal):", e));
    }

    // Step 12: Return canonical MutationResult
    const response: MutationResult<{ id: string; ownerPersonId: string | null }, OwnershipPatch> = {
      ok: true,
      data: { id: updated.id, ownerPersonId: updated.ownerPersonId },
      patch: {
        patchVersion: 1,
        updatedCoverage: ownershipData.coverage,
      },
      scope: {
        entityType: "TEAM",
        entityId: teamId,
      },
      affectedIssues,
      responseMeta,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

