import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";

/**
 * Get the current workspace ID for the authenticated user
 * This is a convenience wrapper around getUnifiedAuth
 * 
 * Can be called:
 * - With a NextRequest parameter in API routes
 * - Without parameters in server components (uses cookies from next/headers)
 */
export async function getCurrentWorkspaceId(request?: NextRequest): Promise<string> {
  const auth = await getUnifiedAuth(request);
  return auth.workspaceId;
}

