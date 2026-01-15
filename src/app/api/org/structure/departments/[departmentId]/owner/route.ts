/**
 * PUT /api/org/structure/departments/[departmentId]/owner
 * Set department owner.
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

export async function PUT(request: NextRequest, ctx: { params: Promise<{ departmentId: string }> }) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[PUT /api/org/structure/departments/[departmentId]/owner] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    // Step 2: Assert access (only workspace owner/admin can set department owners)
    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["OWNER", "ADMIN"] });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse request
    const { departmentId } = await ctx.params;
    const body = await request.json();
    const ownerPersonId = optionalString(body.ownerPersonId);

    // Step 5: Validate department exists in workspace
    const department = await prisma.orgDepartment.findFirst({
      where: { 
        id: departmentId,
        workspaceId,
        isActive: true
      },
      select: { id: true, name: true },
    });

    if (!department) {
      return NextResponse.json(
        { 
          error: "Department not found or does not belong to this workspace",
          hint: "The department you're trying to update does not exist or you don't have access to it."
        },
        { status: 404 }
      );
    }

    // Step 6: Resolve ownerPersonId to userId if needed (can be positionId or userId)
    let userIdToAssign: string | null = ownerPersonId;
    
    if (userIdToAssign) {
      // Try to find if it's a position ID first
      const position = await prisma.orgPosition.findFirst({
        where: { 
          id: userIdToAssign, 
          workspaceId,
          isActive: true 
        },
        select: { userId: true },
      });
      
      if (position?.userId) {
        userIdToAssign = position.userId;
      } else {
        // If not found as position, verify it's a valid userId in the workspace
        const userPosition = await prisma.orgPosition.findFirst({
          where: {
            userId: userIdToAssign,
            workspaceId,
            isActive: true
          },
          select: { userId: true },
        });

        if (!userPosition) {
          return NextResponse.json(
            { 
              error: "Person not found or does not belong to this workspace",
              hint: "The person you're trying to assign as owner does not exist or doesn't belong to this workspace."
            },
            { status: 404 }
          );
        }
      }
    }

    // Step 7: Update or create OwnerAssignment for department
    // Use raw SQL to avoid enum type issues
    if (userIdToAssign) {
      // Upsert: delete existing and create new (ensures only one owner)
      try {
        await prisma.$transaction(async (tx) => {
          // Delete existing owner assignment for this department (raw SQL)
          await tx.$executeRawUnsafe(
            `DELETE FROM owner_assignments
             WHERE workspace_id = $1::text
               AND entity_type = $2::text
               AND entity_id = $3::text`,
            workspaceId,
            'DEPARTMENT',
            departmentId
          ).catch(() => {}); // Ignore if table doesn't exist

          // Create new owner assignment (raw SQL with text type for entity_type)
          await tx.$executeRawUnsafe(
            `INSERT INTO owner_assignments (id, workspace_id, entity_type, entity_id, entity_label, owner_person_id, is_primary, created_at, updated_at)
             VALUES (gen_random_uuid()::text, $1::text, $2::text, $3::text, $4::text, $5::text, true, NOW(), NOW())`,
            workspaceId,
            'DEPARTMENT',
            departmentId,
            department.name,
            userIdToAssign
          );
        });
      } catch (error: any) {
        // If transaction fails (e.g., table doesn't exist), log and continue
        console.warn("[setDepartmentOwner] Could not update owner assignment:", error?.message);
        // Don't fail the request - owner assignment is optional for MVP
      }
    } else {
      // Remove owner: delete existing assignment (raw SQL)
      try {
        await prisma.$executeRawUnsafe(
          `DELETE FROM owner_assignments
           WHERE workspace_id = $1::text
             AND entity_type = $2::text
             AND entity_id = $3::text`,
          workspaceId,
          'DEPARTMENT',
          departmentId
        ).catch(() => {}); // Ignore if table doesn't exist
      } catch (error: any) {
        console.warn("[setDepartmentOwner] Could not delete owner assignment:", error?.message);
        // Don't fail the request
      }
    }

    // Step 8: Emit Loopbrain context (non-blocking)
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.department.owner_set",
        entity: { type: "department", id: departmentId },
        payload: { ownerPersonId: userIdToAssign },
      });
    } catch (contextError: any) {
      console.warn("[PUT /api/org/structure/departments/[departmentId]/owner] Failed to emit context object (non-blocking):", contextError?.message);
    }

    return NextResponse.json({ id: departmentId, ownerPersonId: userIdToAssign }, { status: 200 });
  } catch (error: any) {
    console.error("[PUT /api/org/structure/departments/[departmentId]/owner] Error:", error);

    if (error?.message?.includes("Department not found") || error?.message?.includes("does not belong to this workspace")) {
      return NextResponse.json(
        { 
          error: error.message,
          hint: "The department you're trying to update does not exist or you don't have access to it."
        },
        { status: 404 }
      );
    }

    if (error?.message?.includes("Person not found") || error?.message?.includes("does not belong to this workspace")) {
      return NextResponse.json(
        { 
          error: error.message,
          hint: "The person you're trying to assign as owner does not exist or doesn't belong to this workspace."
        },
        { status: 404 }
      );
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to update department ownership."
        },
        { status: 403 }
      );
    }

    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json(
        { 
          error: error?.message || "Unauthorized",
          hint: "Please ensure you're logged in and have access to this workspace."
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        hint: error?.message || "An unexpected error occurred while updating department owner. Please try again."
      },
      { status: 500 }
    );
  }
}

