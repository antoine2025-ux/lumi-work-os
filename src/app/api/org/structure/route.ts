/**
 * GET /api/org/structure
 * Get the full organizational structure (departments and teams).
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { getOrgStructure } from "@/server/org/structure/read";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[GET /api/org/structure] Missing userId or workspaceId", { userId, workspaceId });
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
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context (for backward compatibility, though middleware is disabled)
    setWorkspaceContext(workspaceId);

    // Step 4: Query Prisma (explicitly pass workspaceId since middleware is disabled)
    console.log("[GET /api/org/structure] Fetching structure for workspaceId:", workspaceId);
    const data = await getOrgStructure(workspaceId);
    console.log("[GET /api/org/structure] Found", data.departments.length, "departments and", data.teams.length, "teams");

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/org/structure] Error:", error);
    console.error("[GET /api/org/structure] Error stack:", error?.stack);
    
    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to access this resource."
        },
        { status: 403 }
      );
    }
    
    // For database errors, return proper error (not empty state)
    // Empty state should only be returned when there's actually no data, not when there's an error
    if (error?.code?.startsWith('P') || error?.message?.includes('prisma') || error?.message?.includes('database')) {
      console.error("[GET /api/org/structure] Database error:", error.message);
      return NextResponse.json(
        { 
          error: "Database error",
          hint: error?.message || "Failed to query database. Please try again."
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to load structure",
        hint: error?.message || "An unexpected error occurred. Please try again."
      },
      { status: 500 }
    );
  }
}

