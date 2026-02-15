/**
 * PUT /api/org/people/[personId]/update
 * Update an existing person.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { OrgPersonUpdateSchema } from "@/lib/validations/org";
import { updateOrgPerson } from "@/server/org/people/write";
import { handleApiError } from "@/lib/api-errors";

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
    const { fullName, email, title, departmentId, teamId, managerId } =
      OrgPersonUpdateSchema.parse(await request.json());

    // Step 5: Update person
    // Convert Zod optional (undefined) to null for Prisma compatibility
    const updated = await updateOrgPerson(personId, {
      workspaceId,
      fullName,
      email: email ?? null,
      title: title ?? null,
      departmentId: departmentId ?? null,
      teamId: teamId ?? null,
      managerId: managerId ?? undefined,
    });

    // Step 6: Emit Loopbrain context (persist + trigger indexing non-blocking)
    await emitOrgContextObject({
      workspaceId,
      actorUserId: userId,
      action: "org.person.updated",
      entity: { type: "person", id: updated.id },
      payload: { fullName, email, title, departmentId, teamId, managerId },
    });

    return NextResponse.json({ id: updated.id }, { status: 200 });
  } catch (error) {
    return handleApiError(error, request);
  }
}

