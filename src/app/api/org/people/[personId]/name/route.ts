/**
 * PUT /api/org/people/[personId]/name
 * Update the name (fullName) for a person.
 * This updates the underlying User.name field.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors";
import { UpdatePersonNameSchema } from "@/lib/validations/org";

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
    const body = UpdatePersonNameSchema.parse(await request.json());
    const name = body.name;

    // Step 4: Verify person exists and get userId
    const position = await prisma.orgPosition.findUnique({
      where: { id: personId },
      select: { id: true, userId: true, workspaceId: true },
    });

    if (!position) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    if (!position.userId) {
      return NextResponse.json({ error: "Person is not linked to a user" }, { status: 400 });
    }

    // Step 5: Assert access — position owner may update their own name; otherwise ADMIN required
    if (position.userId !== userId) {
      await assertAccess({
        userId,
        workspaceId,
        scope: "workspace",
        requireRole: ["ADMIN"],
      });
    }

    // Step 6: Update User.name (not OrgPosition)
    const updatedUser = await prisma.user.update({
      where: { id: position.userId },
      data: { name },
      select: { id: true, name: true },
    });

    // Step 7: Emit Loopbrain context (persist + trigger indexing non-blocking)
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.person.updated",
        entity: { type: "person", id: personId },
        payload: { name },
      });
    } catch (loopbrainError: any) {
      // Log but don't fail the request if Loopbrain indexing fails
      console.error("[PUT /api/org/people/[personId]/name] Loopbrain indexing error (non-fatal):", loopbrainError);
    }

    return NextResponse.json(
      { id: personId, fullName: updatedUser.name },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, request)
  }
}

