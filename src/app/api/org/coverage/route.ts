/**
 * GET/POST /api/org/coverage
 * 
 * List and create role coverage definitions.
 * 
 * GET: List coverage definitions (optional query param: roleType, primaryPersonId)
 * POST: Create a new role coverage
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import {
  getRoleCoverages,
  getRoleCoverageForPerson,
  createRoleCoverage,
} from "@/lib/org/coverage";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Get query params
    const { searchParams } = new URL(request.url);
    const roleType = searchParams.get("roleType");
    const primaryPersonId = searchParams.get("primaryPersonId");

    // Step 5: Fetch coverages
    let coverages;
    if (primaryPersonId) {
      coverages = await getRoleCoverageForPerson(workspaceId, primaryPersonId);
    } else {
      coverages = await getRoleCoverages(workspaceId);
    }

    // Filter by roleType if provided
    if (roleType) {
      coverages = coverages.filter((c) => c.roleType === roleType);
    }

    return NextResponse.json({
      ok: true,
      coverages: coverages.map((c) => ({
        id: c.id,
        roleType: c.roleType,
        roleLabel: c.roleLabel,
        primaryPersonId: c.primaryPersonId,
        secondaryPersonIds: c.secondaryPersonIds,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/coverage] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (require ADMIN for creating coverage)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body
    const body = await request.json();

    if (!body.roleType) {
      return NextResponse.json({ error: "roleType is required" }, { status: 400 });
    }

    if (!body.primaryPersonId) {
      return NextResponse.json({ error: "primaryPersonId is required" }, { status: 400 });
    }

    // Validate secondaryPersonIds if provided
    const secondaryPersonIds = body.secondaryPersonIds ?? [];
    if (!Array.isArray(secondaryPersonIds)) {
      return NextResponse.json(
        { error: "secondaryPersonIds must be an array" },
        { status: 400 }
      );
    }

    // Step 5: Create the coverage
    const coverage = await createRoleCoverage({
      workspaceId,
      roleType: body.roleType,
      roleLabel: body.roleLabel,
      primaryPersonId: body.primaryPersonId,
      secondaryPersonIds,
      createdById: userId,
    });

    return NextResponse.json({
      ok: true,
      coverage: {
        id: coverage.id,
        roleType: coverage.roleType,
        roleLabel: coverage.roleLabel,
        primaryPersonId: coverage.primaryPersonId,
        secondaryPersonIds: coverage.secondaryPersonIds,
        createdAt: coverage.createdAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("[POST /api/org/coverage] Error:", error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Coverage already exists for this roleType and primaryPersonId" },
        { status: 409 }
      );
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
