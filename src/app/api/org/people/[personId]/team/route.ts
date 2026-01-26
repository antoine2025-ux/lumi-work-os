/**
 * PUT /api/org/people/[personId]/team
 * Assign a team to a person.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { optionalString } from "@/server/org/validate";
import { prisma } from "@/lib/db";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import {
  buildResponseMeta,
  type MutationResult,
  type EmptyPatch,
} from "@/lib/org/mutations/types";
import { computeIssueResolution } from "@/lib/org/mutations/utils";

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await ctx.params;

    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[PUT /api/org/people/[personId]/team] Missing userId or workspaceId", { userId, workspaceId });
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
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body
    const body = await request.json();
    const teamId = optionalString(body.teamId);

    // Step 5: Verify person exists and belongs to workspace
    // personId from URL can be either OrgPosition ID or User ID (userId)
    // Try to find by OrgPosition ID first, then by User ID if not found
    let position = await prisma.orgPosition.findFirst({
      where: { 
        id: personId,
        workspaceId: workspaceId,
        isActive: true
      },
      select: { id: true, userId: true },
    });
    
    // If not found by ID, try by userId (personId might be a User ID)
    if (!position) {
      position = await prisma.orgPosition.findFirst({
        where: { 
          userId: personId,
          workspaceId: workspaceId,
          isActive: true
        },
        select: { id: true, userId: true },
      });
    }

    if (!position) {
      return NextResponse.json(
        { 
          ok: false,
          error: "Person not found",
          hint: "The person you're trying to update does not exist or doesn't belong to this workspace."
        },
        { status: 404 }
      );
    }

    // Step 6: Validate team exists and belongs to workspace if teamId provided
    if (teamId) {
      const team = await prisma.orgTeam.findFirst({
        where: { 
          id: teamId,
          workspaceId: workspaceId,
          isActive: true
        },
        select: { id: true, name: true },
      });

      if (!team) {
        return NextResponse.json(
          { 
            ok: false,
            error: "Team not found",
            hint: "The team you're trying to assign does not exist or doesn't belong to this workspace."
          },
          { status: 404 }
        );
      }
    }

    // Step 7: Compute issues BEFORE mutation (scoped to person)
    // TODO: Enhance to derive actual MISSING_TEAM issues for person
    const issuesBefore: OrgIssueMetadata[] = [];

    // Step 8: Update team assignment
    const updated = await prisma.orgPosition.update({
      where: { id: position.id },
      data: { teamId: teamId ?? null },
      select: { id: true, teamId: true, userId: true },
    });

    // Step 9: Compute issues AFTER mutation (same scoped set)
    // TODO: Enhance to derive actual MISSING_TEAM issues for person
    const issuesAfter: OrgIssueMetadata[] = [];

    // Step 10: Build response metadata
    const responseMeta = buildResponseMeta("mutation:person-team:v1");

    // Step 11: Diff issues to determine active vs resolved
    const affectedIssues = computeIssueResolution(
      issuesBefore,
      issuesAfter,
      responseMeta.mutationId
    );

    // Step 12: Emit Loopbrain context (non-blocking)
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.person.team.updated",
        entity: { type: "person", id: updated.id },
        payload: { teamId },
      });
    } catch (contextError: any) {
      console.warn("[PUT /api/org/people/[personId]/team] Failed to emit context object (non-blocking):", contextError?.message);
    }

    // Step 13: Return canonical MutationResult
    const response: MutationResult<{ personId: string; teamId: string | null }, EmptyPatch> = {
      ok: true,
      data: { personId: updated.userId ?? personId, teamId: updated.teamId },
      patch: {},
      scope: {
        entityType: "PERSON",
        entityId: updated.userId ?? personId,
      },
      affectedIssues,
      responseMeta,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("[PUT /api/org/people/[personId]/team] Error:", error);
    console.error("[PUT /api/org/people/[personId]/team] Error stack:", error?.stack);
    console.error("[PUT /api/org/people/[personId]/team] Error meta:", {
      code: error?.code,
      meta: error?.meta,
      cause: error?.cause,
    });

    // Handle specific error cases with structured responses
    if (error?.message?.includes("Person not found") || error?.message?.includes("does not belong to this workspace")) {
      return NextResponse.json(
        { 
          ok: false,
          error: error.message || "Person not found",
          hint: "The person you're trying to update does not exist or doesn't belong to this workspace."
        },
        { status: 404 }
      );
    }

    if (error?.message?.includes("Team not found") || error?.message?.includes("does not belong to this workspace")) {
      return NextResponse.json(
        { 
          ok: false,
          error: error.message || "Team not found",
          hint: "The team you're trying to assign does not exist or doesn't belong to this workspace."
        },
        { status: 404 }
      );
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          ok: false,
          error: error.message || "Forbidden",
          hint: "You don't have permission to update team assignments."
        },
        { status: 403 }
      );
    }

    // Handle assertAccess errors
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json(
        { 
          ok: false,
          error: error?.message || "Unauthorized",
          hint: "Please ensure you're logged in and have access to this workspace."
        },
        { status: error.status }
      );
    }

    // Handle Prisma errors
    if (error?.code?.startsWith('P') || error?.message?.includes('prisma') || error?.message?.includes('database')) {
      console.error("[PUT /api/org/people/[personId]/team] Database error:", error.message);
      return NextResponse.json(
        { 
          ok: false,
          error: "Database error",
          hint: "An error occurred while updating the team assignment. Please try again."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        ok: false,
        error: "Internal server error",
        hint: error?.message || "An unexpected error occurred while updating team assignment. Please try again."
      },
      { status: 500 }
    );
  }
}

