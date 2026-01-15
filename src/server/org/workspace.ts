import { getCurrentWorkspaceId } from "@/lib/current-workspace";

/**
 * Get the active workspace ID for Org operations.
 * This is the canonical source of truth for workspace context in Org pages.
 * 
 * If you later add "active org workspace" selection, update only here.
 * 
 * Throws an error if no workspace is found (for use in contexts where workspace is required).
 */
export async function requireOrgWorkspaceId(): Promise<string> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new Error('No workspace found - user needs to create a workspace');
  }
  return workspaceId;
}

