// src/lib/context/org/syncCurrentWorkspaceTeamContexts.ts

import { NextRequest } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { syncTeamContexts } from "./syncTeamContexts";

/**
 * Sync team-level ContextItems for the current workspace.
 *
 * Can be called:
 * - With a NextRequest parameter in API routes
 * - Without parameters in server components (uses cookies from next/headers)
 */
export async function syncCurrentWorkspaceTeamContexts(request?: NextRequest) {
  // 1) Resolve the current workspace ID (implementation is app-specific)
  const workspaceId = await getCurrentWorkspaceId(request);

  if (!workspaceId) {
    throw new Error(
      "syncCurrentWorkspaceTeamContexts: no current workspace found"
    );
  }

  // 2) Delegate to the core sync helper
  const savedItems = await syncTeamContexts(workspaceId);

  return savedItems;
}

