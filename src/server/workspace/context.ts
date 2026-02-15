import { getCurrentWorkspaceId } from "@/lib/current-workspace";

/**
 * Require workspace ID for server-side operations.
 * Throws if workspace ID cannot be resolved.
 */
export async function requireWorkspaceId(): Promise<string> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new Error("No workspace found. User must be a member of a workspace.");
  }
  return workspaceId;
}

