/**
 * PUT /api/org/people/[personId]/manager
 * Set the manager (reporting line) for a person.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { OrgPersonManagerSchema } from "@/lib/validations/org";
import { setOrgPersonManager } from "@/server/org/people/write";
import { logOrgAudit } from "@/lib/audit/org-audit";
import { isPersonManagerExempt } from "@/lib/org/manager-exemption";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors";
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
  let personId: string | undefined;
  let managerId: string | null | undefined;
  
  try {
    const params = await ctx.params;
    personId = params.personId;

    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (verifies workspace membership and role)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body (Zod)
    const parsed = OrgPersonManagerSchema.parse(await request.json());
    managerId = parsed.managerId ?? null;

    // Step 5: Check if person is exempt from manager requirement (using centralized exemption)
    // Note: personId is actually userId (User.id), so we can pass it directly
    const isExempt = await isPersonManagerExempt(personId, workspaceId);
    if (isExempt && managerId !== null) {
      // Allow setting manager for exempt persons (optional), but don't require it
      // This check is informational - we don't block the request
    }

    // Step 6: Get current position (personId may be OrgPosition ID or User ID)
    const position = await prisma.orgPosition.findFirst({
      where: {
        OR: [
          { id: personId },
          { userId: personId, workspaceId, isActive: true },
        ],
        workspaceId,
      },
      select: { id: true, userId: true },
    });

    if (!position) {
      return NextResponse.json({ ok: false, error: "Person position not found" }, { status: 404 });
    }

    // Step 7: Compute issues BEFORE mutation (scoped to person + direct reports)
    // TODO [BACKLOG]: Derive actual issues for person and direct reports
    // For now, use empty array - maintains contract structure
    const issuesBefore: OrgIssueMetadata[] = [];

    // Step 8: Set manager (returns previous managerId for audit logging)
    const updated = await setOrgPersonManager(position.id, managerId);

    // Step 9: Get direct reports (parentId = this position's id)
    const directReports = await prisma.orgPosition.findMany({
      where: {
        parentId: position.id,
        workspaceId,
        isActive: true,
      },
      select: { userId: true },
    });

    // Step 10: Compute issues AFTER mutation (same scoped set)
    // TODO [BACKLOG]: Derive actual issues for person and direct reports
    const issuesAfter: OrgIssueMetadata[] = [];

    // Step 11: Build response metadata
    const responseMeta = buildResponseMeta("mutation:person-manager:v1");

    // Step 12: Diff issues to determine active vs resolved
    const affectedIssues = computeIssueResolution(
      issuesBefore,
      issuesAfter,
      responseMeta.mutationId
    );

    // Step 13: Log audit event (manager link assignment)
    logOrgAudit({
      workspaceId,
      entityType: "MANAGER_LINK",
      entityId: position.id,
      action: managerId ? "ASSIGNED" : "UNASSIGNED",
      actorId: userId,
      changes: {
        managerId: { from: updated.previousManagerId, to: updated.managerId },
      },
    }).catch((e) => console.error("[PUT /api/org/people/[personId]/manager] Audit log error (non-fatal):", e));

    // Step 14: Emit Loopbrain context (non-blocking)
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.person.manager_set",
        entity: { type: "person", id: updated.id },
        payload: { managerId },
      });
    } catch (loopbrainError: any) {
      console.error("[PUT /api/org/people/[personId]/manager] Loopbrain error (non-fatal):", loopbrainError);
    }

    // Step 15: Get manager name for response
    let managerName: string | null = null;
    if (managerId) {
      const managerUser = await prisma.user.findUnique({
        where: { id: managerId },
        select: { name: true },
      });
      managerName = managerUser?.name ?? null;
    }

    // Step 16: Return canonical MutationResult
    const response: MutationResult<{ personId: string; managerId: string | null; managerName: string | null }, EmptyPatch> = {
      ok: true,
      data: { personId, managerId: updated.managerId, managerName },
      patch: {},
      scope: {
        entityType: "PERSON",
        entityId: personId,
        related: directReports
          .filter((dr) => dr.userId !== null)
          .map((dr) => ({ entityType: "PERSON", entityId: dr.userId! })),
      },
      affectedIssues,
      responseMeta,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleApiError(error, request);
  }
}

