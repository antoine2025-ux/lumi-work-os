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

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["MEMBER"] });
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
  } catch (error: any) {
    console.error("[POST /api/org/structure/departments/create] Error:", error);
    console.error("[POST /api/org/structure/departments/create] Error stack:", error?.stack);

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

    // Handle Prisma unique constraint errors (fallback if duplicate check missed it)
    if (error?.code === "P2002" || error?.message?.includes("Unique constraint")) {
      return NextResponse.json(
        { 
          error: "A department with this name already exists.",
          hint: "Department names must be unique within a workspace."
        },
        { status: 409 }
      );
    }

    if (error?.message?.includes("Invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(
        { 
          error: error.message,
          hint: "Please check the input fields and try again."
        },
        { status: 400 }
      );
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to create departments in this workspace."
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to create department",
        hint: error?.message || "An unexpected error occurred. Please try again."
      },
      { status: 500 }
    );
  }
}

