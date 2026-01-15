/**
 * GET /api/org/flags
 * Get Org feature flags for the current workspace.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { isOrgFlagEnabled } from "@/server/org/flags";

export async function GET(request: NextRequest) {
  let userId: string | undefined;
  let workspaceId: string | undefined;

  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[GET /api/org/flags] Missing userId or workspaceId", { userId, workspaceId });
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

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Return flags
    const peopleWrite = isOrgFlagEnabled("org.people.write");
    const flags = {
      peopleWrite,
      structureWrite: isOrgFlagEnabled("org.structure.write"),
      ownershipWrite: isOrgFlagEnabled("org.ownership.write"),
      reportingWrite: isOrgFlagEnabled("org.reporting.write"),
      availabilityWrite: isOrgFlagEnabled("org.availability.write"),
    };

    return NextResponse.json(
      { flags },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[GET /api/org/flags] Error:", error);
    console.error("[GET /api/org/flags] Error stack:", error?.stack);
    
    if (!userId || !workspaceId) {
      console.error("[GET /api/org/flags] Missing userId or workspaceId in catch", { userId, workspaceId });
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }
    
    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to access this resource."
        },
        { status: 403 }
      );
    }
    
    // Return default flags on error to prevent UI breakage
    console.error("[GET /api/org/flags] Returning default flags due to error:", error.message);
    return NextResponse.json(
      { 
        flags: {
          peopleWrite: false,
          structureWrite: false,
          ownershipWrite: false,
          reportingWrite: false,
          availabilityWrite: false,
        }
      },
      { status: 200 }
    );
  }
}

