import { getOrgContext } from "@/server/rbac"
import { NextRequest } from "next/server"
import type { WorkspaceId } from "@/lib/org/types"

/**
 * Require an active org ID from the request context.
 * 
 * IMPORTANT: In this codebase, orgId === workspaceId. This function
 * returns a workspaceId (the canonical identifier), but accepts the
 * parameter name "orgId" for API ergonomics and backward compatibility.
 * 
 * @param request - Optional NextRequest for context resolution
 * @returns The workspaceId (same as orgId in this codebase)
 * @throws Error if no org/workspace is found
 */
export async function requireActiveOrgId(request?: NextRequest): Promise<WorkspaceId> {
  const ctx = await getOrgContext(request)
  if (!ctx.orgId) {
    const error = new Error("No active organization found")
    ;(error as any).status = 401
    throw error
  }
  // orgId IS workspaceId in this codebase
  return ctx.orgId as WorkspaceId
}

