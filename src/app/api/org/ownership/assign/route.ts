/**
 * POST /api/org/ownership/assign
 * Assign ownership to a team or department.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { assignOwnership } from "@/server/org/ownership/write";
import { deriveOwnershipIssuesForEntity } from "@/lib/org/deriveIssues";
import { getOrgOwnership } from "@/server/org/ownership/read";
import {
  buildResponseMeta,
  type OwnershipPatch,
  type MutationResult,
} from "@/lib/org/mutations/types";
import { computeIssueResolution } from "@/lib/org/mutations/utils";
import { handleApiError } from "@/lib/api-errors";
import { AssignOwnershipSchema } from '@/lib/validations/org';

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  let workspaceId: string | undefined;
  
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[POST /api/org/ownership/assign] Missing userId or workspaceId", { userId, workspaceId });
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

    const workspaceRecord = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });
    const workspaceSlug = workspaceRecord?.slug ?? workspaceId;

    // Step 4: Parse and validate request body
    const body = AssignOwnershipSchema.parse(await request.json());
    const { entityType, entityId, ownerId: ownerPersonId } = body;

    // Validate entityType is TEAM or DEPARTMENT for this route
    if (entityType !== 'TEAM' && entityType !== 'DEPARTMENT') {
      return NextResponse.json(
        { ok: false, error: "Invalid entityType: must be 'TEAM' or 'DEPARTMENT'" },
        { status: 400 }
      );
    }

    // Step 5: Compute issues BEFORE mutation (scoped to affected entity)
    const issuesBefore = await deriveOwnershipIssuesForEntity(
      workspaceId,
      entityType as "TEAM" | "DEPARTMENT",
      entityId,
      workspaceSlug
    );

    // Step 6: Assign ownership (returns previous owner for audit logging)
    const record = await assignOwnership({
      workspaceId, // Pass workspaceId for resolver
      entityType: entityType as "TEAM" | "DEPARTMENT",
      entityId,
      ownerPersonId,
    });

    // Step 7: Compute issues AFTER mutation (same scoped set)
    const issuesAfter = await deriveOwnershipIssuesForEntity(
      workspaceId,
      entityType as "TEAM" | "DEPARTMENT",
      entityId,
      workspaceSlug
    );

    // Step 8: Build response metadata (includes mutationId for resolution)
    const responseMeta = buildResponseMeta("mutation:ownership-assign:v1");

    // Step 9: Diff issues to determine active vs resolved
    const affectedIssues = computeIssueResolution(
      issuesBefore,
      issuesAfter,
      responseMeta.mutationId
    );

    // Step 10: Log audit event (only critical fields: ownerId)
    const { logOrgMutation } = await import("@/server/org/audit/write");
    await logOrgMutation({
      workspaceId,
      actorUserId: userId,
      action: "OWNERSHIP_ASSIGNED",
      entityType,
      entityId,
      before: { ownerId: record.previousOwnerId },
      after: { ownerId: ownerPersonId },
    });

    // Step 11: Get updated ownership coverage
    const ownershipData = await getOrgOwnership(workspaceId);

    // Step 12: Emit Loopbrain context (persist + trigger indexing non-blocking)
    await emitOrgContextObject({
      workspaceId,
      actorUserId: userId,
      action: "org.ownership.assigned",
      entity: { type: "ownership", id: record.id },
      payload: { entityType, entityId, ownerPersonId },
    });

    // Step 13: Return canonical MutationResult shape
    const response: MutationResult<{ id: string }, OwnershipPatch> = {
      ok: true,
      data: { id: record.id },
      patch: {
        patchVersion: 1,
        updatedCoverage: ownershipData.coverage,
      },
      scope: {
        entityType,
        entityId,
        related: [], // Could include sibling entities in same department
      },
      affectedIssues,
      // affectedSignals omitted - client derives from issues via getSignalsFromMutationResult()
      responseMeta,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
