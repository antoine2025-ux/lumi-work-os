/**
 * GET /api/org/people
 * List all people in the organization.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { listOrgPeople } from "@/server/org/people/read";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[GET /api/org/people] Missing userId or workspaceId", { userId, workspaceId });
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
    console.log("[GET /api/org/people] Fetching people for workspaceId:", workspaceId);
    const data = await listOrgPeople(workspaceId);
    console.log("[GET /api/org/people] Found", data.people.length, "people");

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/org/people] Error:", error);
    console.error("[GET /api/org/people] Error stack:", error?.stack);
    
    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to access this resource."
        },
        { status: 403 }
      );
    }
    
    // Return empty state instead of 500 for query errors
    if (error?.code?.startsWith('P') || error?.message?.includes('prisma') || error?.message?.includes('database')) {
      console.error("[GET /api/org/people] Database error, returning empty state:", error.message);
      return NextResponse.json({ people: [] }, { status: 200 });
    }
    return NextResponse.json(
      { 
        error: "Failed to load people",
        hint: error?.message || "An unexpected error occurred. Please try again."
      },
      { status: 500 }
    );
  }
}
