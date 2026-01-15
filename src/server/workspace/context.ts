import { getCurrentWorkspaceId } from "@/lib/current-workspace";

/**
 * Require workspace ID for server-side operations.
 * Throws if workspace ID cannot be resolved.
 */
export async function requireWorkspaceId(): Promise<string> {
  return await getCurrentWorkspaceId();
}

