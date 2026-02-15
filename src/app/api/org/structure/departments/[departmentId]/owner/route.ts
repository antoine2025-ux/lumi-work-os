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
import { deriveOwnershipIssuesForEntity } from "@/lib/org/deriveIssues";
import { getOrgOwnership } from "@/server/org/ownership/read";
import {
  buildResponseMeta,
  type OwnershipPatch,
  type MutationResult,
} from "@/lib/org/mutations/types";
import { computeIssueResolution } from "@/lib/org/mutations/utils";
import { handleApiError } from "@/lib/api-errors"

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
          ok: false,
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
          ok: false,
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
              ok: false,
              error: "Person not found or does not belong to this workspace",
              hint: "The person you're trying to assign as owner does not exist or doesn't belong to this workspace."
            },
            { status: 404 }
          );
        }
      }
    }

    // Step 7: Compute issues BEFORE mutation
    const issuesBefore = await deriveOwnershipIssuesForEntity(workspaceId, "DEPARTMENT", departmentId);

    // Step 8: Update or create OwnerAssignment for department
    // Use raw SQL to avoid enum type issues
    if (userIdToAssign) {
      // Upsert: delete existing and create new (ensures only one owner)
      try {
        await prisma.$transaction(async (tx) => {
          // Delete existing owner assignment for this department (raw SQL)
          // Note: Column names must be quoted for camelCase in PostgreSQL
          // Note: entityType is an enum, must cast to text for comparison
          const deleteResult = await tx.$executeRawUnsafe(
            `DELETE FROM owner_assignments
             WHERE "workspaceId" = $1::text
               AND "entityType"::text = $2::text
               AND "entityId" = $3::text`,
            workspaceId,
            'DEPARTMENT',
            departmentId
          ).catch((e: Error) => { 
            console.warn("[setDepartmentOwner] Delete failed:", e?.message);
            return -1; 
          });

          // Create new owner assignment (raw SQL)
          // Note: Column names must be quoted for camelCase in PostgreSQL
          // Note: entityType must be cast to the OwnedEntityType enum
          const insertResult = await tx.$executeRawUnsafe(
            `INSERT INTO owner_assignments (id, "workspaceId", "entityType", "entityId", "entityLabel", "ownerPersonId", "isPrimary", "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1::text, $2::"OwnedEntityType", $3::text, $4::text, $5::text, true, NOW(), NOW())`,
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
      // Note: Column names must be quoted for camelCase in PostgreSQL
      // Note: entityType is an enum, must cast to text for comparison
      try {
        await prisma.$executeRawUnsafe(
          `DELETE FROM owner_assignments
           WHERE "workspaceId" = $1::text
             AND "entityType"::text = $2::text
             AND "entityId" = $3::text`,
          workspaceId,
          'DEPARTMENT',
          departmentId
        ).catch(() => {}); // Ignore if table doesn't exist
      } catch (error: any) {
        console.warn("[setDepartmentOwner] Could not delete owner assignment:", error?.message);
        // Don't fail the request
      }
    }

    // Step 9: Compute issues AFTER mutation
    const issuesAfter = await deriveOwnershipIssuesForEntity(workspaceId, "DEPARTMENT", departmentId);

    // Step 10: Build response metadata
    const responseMeta = buildResponseMeta("mutation:department-owner:v1");

    // Step 11: Diff issues to determine active vs resolved
    const affectedIssues = computeIssueResolution(
      issuesBefore,
      issuesAfter,
      responseMeta.mutationId
    );

    // Step 12: Get updated ownership coverage
    const ownershipData = await getOrgOwnership(workspaceId);

    // Step 13: Emit Loopbrain context (non-blocking)
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

    // Step 14: Return canonical MutationResult
    const response: MutationResult<{ id: string; ownerPersonId: string | null }, OwnershipPatch> = {
      ok: true,
      data: { id: departmentId, ownerPersonId: userIdToAssign },
      patch: {
        patchVersion: 1,
        updatedCoverage: ownershipData.coverage,
      },
      scope: {
        entityType: "DEPARTMENT",
        entityId: departmentId,
      },
      affectedIssues,
      responseMeta,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleApiError(error, request)
  }
}

