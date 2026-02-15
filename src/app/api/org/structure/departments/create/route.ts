/**
 * POST /api/org/structure/departments/create
 * Create a new department.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { requireNonEmptyString } from "@/server/org/validate";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { createDepartment } from "@/server/org/structure/write";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors"

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  let workspaceId: string | undefined;
  
  try {
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;
    if (!userId || !workspaceId) {
      console.error("[POST /api/org/structure/departments/create] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    await setWorkspaceContext(workspaceId);

    const body = await request.json();
    const name = requireNonEmptyString(body.name, "name");
    const ownerPersonId = body.ownerPersonId || null;

    // Validate ownerPersonId if provided
    if (ownerPersonId && typeof ownerPersonId !== "string") {
      return NextResponse.json(
        { error: "Invalid ownerPersonId" },
        { status: 400 }
      );
    }

    // Check for duplicate department name
    const existingDepartment = await prisma.orgDepartment.findFirst({
      where: {
        workspaceId,
        name,
      },
    });

    if (existingDepartment) {
      return NextResponse.json(
        { error: "A department with this name already exists." },
        { status: 409 }
      );
    }

    const dept = await createDepartment({ name, workspaceId, ownerPersonId });

    // Emit context object (non-blocking - don't fail the request if this errors)
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.department.created",
        entity: { type: "department", id: dept.id },
        payload: { name },
      });
    } catch (contextError: any) {
      // Log but don't fail - context emission is non-blocking
      console.warn("[POST /api/org/structure/departments/create] Failed to emit context object (non-blocking):", contextError?.message);
    }

    return NextResponse.json(dept, { status: 201 });
  } catch (error) {
    return handleApiError(error, request)
  }
}

