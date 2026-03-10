import { getOrgContext } from "@/server/rbac"
import { NextRequest } from "next/server"
import type { WorkspaceId } from "@/lib/org/types"

/**
 * Require an active workspace ID from the request context.
 * 
 * @param request - Optional NextRequest for context resolution
 * @returns The workspaceId
 * @throws Error if no workspace is found
 */
export async function requireActiveWorkspaceId(request?: NextRequest): Promise<WorkspaceId> {
  const ctx = await getOrgContext(request)
  if (!ctx.workspaceId) {
    const error = new Error("No active organization found")
    ;(error as Error & { status?: number }).status = 401
    throw error
  }
  return ctx.workspaceId as WorkspaceId
}

