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
import { requireNonEmptyString, optionalString } from "@/server/org/validate";
import { updateOrgPerson } from "@/server/org/people/write";

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
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body
    const body = await request.json();
    const fullName = requireNonEmptyString(body.fullName, "fullName");
    const email = optionalString(body.email);
    const title = optionalString(body.title);
    const departmentId = optionalString(body.departmentId);
    const teamId = optionalString(body.teamId);
    const managerId = optionalString(body.managerId);

    // Step 5: Update person
    const updated = await updateOrgPerson(personId, {
      workspaceId,
      fullName,
      email,
      title,
      departmentId,
      teamId,
      managerId: managerId !== null ? managerId : undefined,
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
  } catch (error: any) {
    console.error("[PUT /api/org/people/[personId]/update] Error:", error);

    if (error?.message?.includes("Invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error?.message?.includes("Person not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

