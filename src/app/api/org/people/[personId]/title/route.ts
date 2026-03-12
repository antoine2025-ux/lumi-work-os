/**
 * PUT /api/org/people/[personId]/title
 * Update the title (role) for a person.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { OrgPersonTitleUpdateSchema } from "@/lib/validations/org";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors";
import { logOrgAudit } from "@/lib/audit/org-audit";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 3: Parse and validate request body
    const body = await request.json();
    const { title } = OrgPersonTitleUpdateSchema.parse(body);

    // Step 4: Verify person exists (fetch before state for audit)
    const position = await prisma.orgPosition.findUnique({
      where: { id: personId },
      select: { 
        id: true, 
        userId: true,
        title: true,
        user: { select: { name: true } },
      },
    });

    if (!position) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Step 5: Assert access — position owner may update their own title; otherwise ADMIN required
    if (position.userId !== userId) {
      await assertAccess({
        userId,
        workspaceId,
        scope: "workspace",
        requireRole: ["ADMIN"],
      });
    }

    // Step 6: Update title
    const updated = await prisma.orgPosition.update({
      where: { id: personId },
      data: { title },
      select: { id: true, title: true },
    });

    // Step 7: Log audit entry
    logOrgAudit({
      workspaceId,
      entityType: "PERSON",
      entityId: updated.id,
      entityName: position.user?.name ?? undefined,
      action: "UPDATED",
      actorId: userId,
      changes: {
        title: { from: position.title, to: updated.title },
      },
    }).catch((e) => console.error("[PUT /api/org/people/[personId]/title] Audit log error (non-fatal):", e));

    // Step 8: Emit Loopbrain context (persist + trigger indexing non-blocking)
    // Wrap in try-catch to prevent Loopbrain errors from breaking the update
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.person.title.updated",
        entity: { type: "person", id: updated.id },
        payload: { title },
      });
    } catch (loopbrainError: unknown) {
      // Log but don't fail the request if Loopbrain indexing fails
      console.error("[PUT /api/org/people/[personId]/title] Loopbrain indexing error (non-fatal):", loopbrainError);
    }

    return NextResponse.json(
      { id: updated.id, title: updated.title },
      { status: 200 }
    );
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

