// src/lib/context/org/loadCurrentWorkspaceOrgContextBundle.ts

import { NextRequest } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { loadOrgContextBundle } from "./loadOrgContextBundle";

/**
 * Load OrgContextBundle for the current workspace.
 *
 * Can be called:
 * - With a NextRequest parameter in API routes
 * - Without parameters in server components (uses cookies from next/headers)
 */
export async function loadCurrentWorkspaceOrgContextBundle(
  request?: NextRequest
) {
  // 1) Resolve the current workspace ID
  const workspaceId = await getCurrentWorkspaceId(request);

  if (!workspaceId) {
    throw new Error(
      "loadCurrentWorkspaceOrgContextBundle: no current workspace found"
    );
  }

  // 2) Load the bundle
  const bundle = await loadOrgContextBundle(workspaceId);

  return {
    workspaceId,
    bundle,
  };
}

