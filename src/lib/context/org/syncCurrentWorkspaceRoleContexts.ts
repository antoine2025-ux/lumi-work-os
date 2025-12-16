// src/lib/context/org/syncCurrentWorkspaceRoleContexts.ts

import { NextRequest } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { syncRoleContexts } from "./syncRoleContexts";

/**
 * Sync role-level ContextItems for the current workspace.
 *
 * Can be called:
 * - With a NextRequest parameter in API routes
 * - Without parameters in server components (uses cookies from next/headers)
 */
export async function syncCurrentWorkspaceRoleContexts(request?: NextRequest) {
  // 1) Resolve the current workspace ID (implementation is app-specific)
  const workspaceId = await getCurrentWorkspaceId(request);

  if (!workspaceId) {
    throw new Error(
      "syncCurrentWorkspaceRoleContexts: no current workspace found"
    );
  }

  // 2) Delegate to the core sync helper
  const savedItems = await syncRoleContexts(workspaceId);

  return savedItems;
}

