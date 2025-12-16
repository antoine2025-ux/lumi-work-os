// src/lib/context/org/syncCurrentWorkspaceOrgContextOrg.ts

import { NextRequest } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { syncOrgContext } from "./syncOrgContext";

/**
 * Sync the ORG-LEVEL context for the current workspace.
 *
 * Can be called:
 * - With a NextRequest parameter in API routes
 * - Without parameters in server components (uses cookies from next/headers)
 *
 * This is a convenience wrapper for server-side usage and dev tools.
 */
export async function syncCurrentWorkspaceOrgContextOrg(request?: NextRequest) {
  // 1) Resolve the current workspace ID (implementation is app-specific)
  const workspaceId = await getCurrentWorkspaceId(request);

  if (!workspaceId) {
    throw new Error("syncCurrentWorkspaceOrgContextOrg: no current workspace found");
  }

  // 2) Delegate to the core sync helper
  const saved = await syncOrgContext(workspaceId);

  return saved;
}

