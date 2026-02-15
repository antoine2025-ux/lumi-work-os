/**
 * POST /api/org/people/create
 * Create a new person in the organization.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { OrgPersonCreateSchema } from "@/lib/validations/org";
import { createOrgPerson } from "@/server/org/people/write";
import { handleApiError } from "@/lib/api-errors";

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  let workspaceId: string | undefined;
  
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[POST /api/org/people/create] Missing userId or workspaceId", { userId, workspaceId });
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
      requireRole: ["ADMIN"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body (Zod)
    const { fullName, email, title, departmentId, teamId, managerId } =
      OrgPersonCreateSchema.parse(await request.json());

    // Step 5: Create person (explicitly pass workspaceId for database truth compliance)
    console.log("[POST /api/org/people/create] Creating person with workspaceId:", workspaceId, { fullName, email, title });
    const created = await createOrgPerson({
      workspaceId,
      fullName,
      email: email ?? null,
      title: title ?? null,
      departmentId: departmentId ?? null,
      teamId: teamId ?? null,
      managerId: managerId || null,
    });
    console.log("[POST /api/org/people/create] Person created successfully:", created.id);

    // Step 6: Emit Loopbrain context (persist + trigger indexing non-blocking)
    // Wrap in try-catch to handle cases where context_items table doesn't exist yet
    // This is non-blocking, so errors should not fail the person creation
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.person.created",
        entity: { type: "person", id: created.id },
        payload: { fullName, email, title, departmentId, teamId, managerId },
      });
    } catch (contextError: any) {
      // Log but don't fail - context emission is non-blocking
      // Common case: context_items table may not exist yet if migrations haven't run
      console.warn("[POST /api/org/people/create] Failed to emit context object (non-blocking):", contextError?.message);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[POST /api/org/people/create] Context error details:", {
          message: contextError?.message,
          code: contextError?.code,
        });
      }
    }

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error, request);
  }
}

