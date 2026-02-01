/**
 * GET /api/org/people/[personId]
 * Get a single person by ID.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { getOrgPerson } from "@/server/org/people/read";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  let userId: string | undefined;
  let workspaceId: string | undefined;
  
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[GET /api/org/people/[personId]] Missing userId or workspaceId", { userId, workspaceId });
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

    // Step 4: Get person (explicitly pass workspaceId since middleware is disabled)
    const { personId } = await ctx.params;
    
    // getOrgPerson now handles both OrgPosition ID and User ID
    const person = await getOrgPerson(personId, workspaceId);

    if (!person) {
      return NextResponse.json(
        { 
          error: "Person not found",
          hint: "The requested person does not exist or you don't have access to them."
        },
        { status: 404 }
      );
    }

    return NextResponse.json(person, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/org/people/[personId]] Error:", error);
    console.error("[GET /api/org/people/[personId]] Error stack:", error?.stack);

    if (!userId || !workspaceId) {
      console.error("[GET /api/org/people/[personId]] Missing userId or workspaceId in catch", { userId, workspaceId });
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to access this resource."
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to load person",
        hint: error?.message || "An unexpected error occurred. Please try again."
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/org/people/[personId]
 * Hard delete a person (OrgPosition).
 * 
 * Requires OWNER role.
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  let userId: string | undefined;
  let workspaceId: string | undefined;
  
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[DELETE /api/org/people/[personId]] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        { 
          ok: false,
          error: "UNAUTHORIZED",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    // Step 2: Assert OWNER/ADMIN access (only workspace owners/admins can delete people)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["OWNER", "ADMIN"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Get personId and verify person exists (using minimal select to avoid schema issues)
    const { personId } = await ctx.params;
    
    // Get only the userId from the position using raw SQL to avoid Prisma schema issues
    const positionResult = await prisma.$queryRaw<Array<{ userId: string | null; workspaceId: string }>>`
      SELECT "userId", "workspaceId"
      FROM org_positions
      WHERE id = ${personId} AND "workspaceId" = ${workspaceId}
      LIMIT 1
    `;

    if (!positionResult || positionResult.length === 0) {
      return NextResponse.json(
        { 
          ok: false,
          error: "NOT_FOUND",
          hint: "The requested person does not exist or you don't have access to them."
        },
        { status: 404 }
      );
    }

    const userIdFromPosition = positionResult[0].userId;

    // Step 5: Hard delete related records and the OrgPosition using raw SQL
    // This avoids Prisma trying to access non-existent fields like roleDescription
    await prisma.$transaction(async (tx) => {
      // Delete availability records if userId exists
      if (userIdFromPosition) {
        // Delete person availability health records
        await tx.$executeRaw`
          DELETE FROM person_availability_health
          WHERE "personId" = ${userIdFromPosition} AND "workspaceId" = ${workspaceId}
        `.catch(() => {
          // Table might not exist, ignore
        });

        // Delete person availability records
        await tx.$executeRaw`
          DELETE FROM person_availability
          WHERE "personId" = ${userIdFromPosition} AND "workspaceId" = ${workspaceId}
        `.catch(() => {
          // Table might not exist, ignore
        });

        // Delete person manager links
        await tx.$executeRaw`
          DELETE FROM person_manager_links
          WHERE ("personId" = ${userIdFromPosition} OR "managerId" = ${userIdFromPosition}) AND "workspaceId" = ${workspaceId}
        `.catch(() => {
          // Table might not exist, ignore
        });
      }

      // Handle self-referential parent/children relationships
      // Set parentId to null for any children of this position
      await tx.$executeRaw`
        UPDATE org_positions
        SET "parentId" = NULL
        WHERE "parentId" = ${personId} AND "workspaceId" = ${workspaceId}
      `;

      // Finally, delete the OrgPosition itself using raw SQL
      // This avoids Prisma trying to read fields that don't exist
      await tx.$executeRaw`
        DELETE FROM org_positions
        WHERE id = ${personId} AND "workspaceId" = ${workspaceId}
      `;
    });

    console.log(`[DELETE /api/org/people/[personId]] Deleted person ${personId} by user ${userId}`);

    return NextResponse.json(
      { ok: true },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[DELETE /api/org/people/[personId]] Error:", error);
    console.error("[DELETE /api/org/people/[personId]] Error stack:", error?.stack);

    if (!userId || !workspaceId) {
      return NextResponse.json(
        { 
          ok: false,
          error: "UNAUTHORIZED",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          ok: false,
          error: "FORBIDDEN",
          hint: "Only workspace owners and admins can delete people."
        },
        { status: 403 }
      );
    }

    if (error?.code === "P2025") {
      // Record not found
      return NextResponse.json(
        { 
          ok: false,
          error: "NOT_FOUND",
          hint: "The person may have already been deleted."
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        ok: false,
        error: "DELETE_FAILED",
        hint: error?.message || "An unexpected error occurred. Please try again."
      },
      { status: 500 }
    );
  }
}
