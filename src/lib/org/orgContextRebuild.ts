/**
 * Safe Org Context Rebuild Helper
 * 
 * Wraps rebuildOrgContextForWorkspace in error handling to avoid
 * crashing user-facing flows when context sync fails.
 */

import { rebuildOrgContextForWorkspace } from "./orgContextStoreSync";

/**
 * Feature flag to enable/disable Org context sync.
 * Set ORG_CONTEXT_SYNC_ENABLED=true in .env to enable.
 */
const ORG_CONTEXT_SYNC_ENABLED =
  process.env.ORG_CONTEXT_SYNC_ENABLED !== "false"; // Default to true unless explicitly disabled

/**
 * Safely rebuild Org context for a workspace.
 * 
 * This is a fire-and-forget operation that:
 * - Wraps the rebuild in try/catch to prevent user-facing failures
 * - Logs errors for debugging
 * - Can be disabled via feature flag
 * 
 * Use this in mutation handlers after successful DB writes.
 */
export async function safeRebuildOrgContext(workspaceId: string): Promise<void> {
  if (!ORG_CONTEXT_SYNC_ENABLED) {
    return;
  }

  try {
    await rebuildOrgContextForWorkspace(workspaceId);
  } catch (error: unknown) {
    console.error("[OrgContext] Failed to rebuild Org context for workspace", {
      workspaceId,
      error,
    });
    // Intentionally swallow the error to avoid user-facing failures
  }
}

