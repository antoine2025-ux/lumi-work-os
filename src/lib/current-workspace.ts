import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";

/**
 * Get the current workspace ID for the authenticated user
 * This is a convenience wrapper around getUnifiedAuth
 * 
 * Can be called:
 * - With a NextRequest parameter in API routes
 * - Without parameters in server components (uses cookies from next/headers)
 * 
 * Returns null if no workspace is found (instead of throwing)
 * 
 * Side effect: Sets workspace context for Prisma scoping middleware.
 */
export async function getCurrentWorkspaceId(request?: NextRequest): Promise<string | null> {
  try {
    const auth = await getUnifiedAuth(request);
    // Set workspace context for Prisma scoping middleware
    if (auth.workspaceId) {
      setWorkspaceContext(auth.workspaceId);
    }
    return auth.workspaceId;
  } catch (error: unknown) {
    // If getUnifiedAuth throws (e.g., "No workspace found"), return null
    // This allows callers to handle the no-workspace case gracefully
    if (error instanceof Error && error.message.includes('No workspace found')) {
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

