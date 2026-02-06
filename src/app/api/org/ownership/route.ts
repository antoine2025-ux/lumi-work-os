/**
 * GET /api/org/ownership
 * Get ownership coverage and assignments.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { getOrgOwnership } from "@/server/org/ownership/read";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[GET /api/org/ownership] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401, headers: { "Content-Type": "application/json" } }
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

    // Step 4: Query ownership data using canonical resolver
    // SECURITY: workspaceId from auth only
    const data = await getOrgOwnership(workspaceId);

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/org/ownership] Error:", error);
    console.error("[GET /api/org/ownership] Error stack:", error?.stack);
    
    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to access this resource."
        },
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Return empty state instead of 500 for query errors
    if (error?.code?.startsWith('P') || error?.message?.includes('prisma') || error?.message?.includes('database')) {
      console.error("[GET /api/org/ownership] Database error, returning empty state:", error.message);
      return NextResponse.json(
        { 
          coverage: { teams: { total: 0, owned: 0, unowned: 0 }, departments: { total: 0, owned: 0, unowned: 0 } },
          unowned: [],
          assignments: []
        },
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to load ownership",
        hint: error?.message || "An unexpected error occurred. Please try again."
      },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

