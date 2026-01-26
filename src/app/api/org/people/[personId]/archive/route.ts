/**
 * PATCH /api/org/people/[personId]/archive
 * Archive a person (soft delete).
 * 
 * Validates person belongs to workspace and is not an owner of any team/department.
 * Returns 409 if person is an owner and cannot be archived.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    // Step 2: Assert access (TODO: add org:write/admin permission check)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"], // TODO: restrict to admin/write permissions
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Get personId
    const { personId } = await ctx.params;

    // Step 5: Verify person exists and belongs to workspace
    const position = await prisma.orgPosition.findFirst({
      where: {
        id: personId,
        workspaceId,
        userId: { not: null },
      },
      select: {
        id: true,
        userId: true,
        archivedAt: true,
        team: {
          select: {
            id: true,
            name: true,
            ownerPersonId: true,
          },
        },
      },
    });

    if (!position || !position.userId) {
      return NextResponse.json(
        { 
          error: "Person not found",
          hint: "The requested person does not exist or you don't have access to them."
        },
        { status: 404 }
      );
    }

    // Check if already archived
    if (position.archivedAt) {
      return NextResponse.json(
        { 
          ok: true,
          message: "Person is already archived",
        },
        { status: 200 }
      );
    }

    // Step 6: Check if person is an owner of any team or department
    const [ownedTeams, ownedDepartmentAssignments] = await Promise.all([
      prisma.orgTeam.findMany({
        where: {
          workspaceId,
          ownerPersonId: position.id,
        },
        select: {
          id: true,
          name: true,
        },
      }),
      // Check owner_assignments table for department ownership
      prisma.ownerAssignment.findMany({
        where: {
          workspaceId,
          ownerPersonId: position.id,
          entityType: "DEPARTMENT",
        },
        select: {
          entityId: true,
          entityLabel: true,
        },
      }).catch(() => []), // Handle case where table might not exist
    ]);

    // Fetch department names for owned departments
    const ownedDepartmentIds = ownedDepartmentAssignments.map(a => a.entityId);
    const ownedDepartments = ownedDepartmentIds.length > 0
      ? await prisma.orgDepartment.findMany({
          where: {
            id: { in: ownedDepartmentIds },
            workspaceId,
          },
          select: {
            id: true,
            name: true,
          },
        }).catch(() => [])
      : [];

    if (ownedTeams.length > 0 || ownedDepartments.length > 0) {
      const entityNames: string[] = [
        ...ownedTeams.map(t => `team "${t.name}"`),
        ...ownedDepartments.map(d => `department "${d.name}"`),
      ];
      
      return NextResponse.json(
        { 
          error: "Cannot archive person with active ownership",
          hint: `Unassign ownership from ${entityNames.join(", ")} before archiving.`,
        },
        { status: 409 }
      );
    }

    // Step 7: Archive the person
    const updated = await prisma.orgPosition.update({
      where: { id: personId },
      data: {
        archivedAt: new Date(),
        archivedById: userId,
      },
      select: {
        id: true,
        archivedAt: true,
      },
    });

    return NextResponse.json(
      { 
        ok: true,
        person: {
          id: updated.id,
          archivedAt: updated.archivedAt?.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[PATCH /api/org/people/[personId]/archive] Error:", error);

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to perform this action.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to archive person",
        hint: error?.message || "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}

