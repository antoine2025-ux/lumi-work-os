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
    const position = await prisma.orgPosition.findFirst({
      where: { 
        id: personId,
        workspaceId: workspaceId,
        isActive: true
      },
      select: { id: true, userId: true },
    });

    if (!position) {
      return NextResponse.json(
        { 
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
            error: "Team not found",
            hint: "The team you're trying to assign does not exist or doesn't belong to this workspace."
          },
          { status: 404 }
        );
      }
    }

    // Step 7: Update team assignment
    const updated = await prisma.orgPosition.update({
      where: { id: personId },
      data: { teamId: teamId ?? null },
      select: { id: true, teamId: true },
    });

    // Step 8: Emit Loopbrain context (persist + trigger indexing non-blocking)
    // Wrap in try-catch to handle cases where context_items table doesn't exist yet
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.person.updated",
        entity: { type: "person", id: updated.id },
        payload: { teamId },
      });
    } catch (contextError: any) {
      // Log but don't fail - context emission is non-blocking
      // Common case: context_items table may not exist yet if migrations haven't run
      console.warn("[PUT /api/org/people/[personId]/team] Failed to emit context object (non-blocking):", contextError?.message);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[PUT /api/org/people/[personId]/team] Context error details:", {
          message: contextError?.message,
          code: contextError?.code,
          stack: contextError?.stack,
        });
      }
    }

    return NextResponse.json(
      { id: updated.id, teamId: updated.teamId },
      { status: 200 }
    );
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
          error: error.message || "Person not found",
          hint: "The person you're trying to update does not exist or doesn't belong to this workspace."
        },
        { status: 404 }
      );
    }

    if (error?.message?.includes("Team not found") || error?.message?.includes("does not belong to this workspace")) {
      return NextResponse.json(
        { 
          error: error.message || "Team not found",
          hint: "The team you're trying to assign does not exist or doesn't belong to this workspace."
        },
        { status: 404 }
      );
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
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
          error: "Database error",
          hint: "An error occurred while updating the team assignment. Please try again."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        hint: error?.message || "An unexpected error occurred while updating team assignment. Please try again."
      },
      { status: 500 }
    );
  }
}

