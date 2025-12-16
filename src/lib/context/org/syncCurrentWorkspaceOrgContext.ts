// src/lib/context/org/syncCurrentWorkspaceOrgContext.ts

import { NextRequest } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { syncOrgWorkspaceContext } from "./syncOrgWorkspaceContext";

/**
 * Resolve the current workspace for the authenticated user
 * and sync its Org Workspace context into context_items.
 *
 * Can be called:
 * - With a NextRequest parameter in API routes
 * - Without parameters in server components (uses cookies from next/headers)
 *
 * Throws if:
 *  - There is no current workspace
 *  - syncOrgWorkspaceContext fails
 */
export async function syncCurrentWorkspaceOrgContext(request?: NextRequest) {
  // 1) Resolve the current workspace ID (implementation is app-specific)
  const workspaceId = await getCurrentWorkspaceId(request);

  if (!workspaceId) {
    throw new Error("syncCurrentWorkspaceOrgContext: no current workspace found");
  }

  // 2) Delegate to the core sync helper
  const saved = await syncOrgWorkspaceContext(workspaceId);

  return saved;
}

