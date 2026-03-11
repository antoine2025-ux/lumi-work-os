/**
 * ensureOrgContextSynced
 * 
 * Helper function to lazily ensure org context is synced for a workspace.
 * Checks if ContextItems exist, and if not, triggers a background sync.
 * 
 * This is used by:
 * - Org layout to proactively sync when users visit org pages
 * - API endpoints as a fallback for direct Loopbrain queries
 */

import { prisma } from '@/lib/db'

/**
 * Check if org context is synced and trigger sync if needed.
 * Non-blocking: returns immediately, sync happens in background.
 * 
 * @param workspaceId - The workspace ID to check
 */
export async function ensureOrgContextSynced(workspaceId: string): Promise<void> {
  try {
    // Check if any org-related ContextItems exist for this workspace
    const count = await prisma.contextItem.count({
      where: {
        workspaceId,
        type: {
          in: ['workspace', 'org', 'department', 'team', 'person', 'role'],
        },
      },
    })

    // If no context items exist, trigger sync in background
    if (count === 0) {
      // Fire-and-forget: don't wait for sync to complete
      triggerSyncInBackground(workspaceId).catch(_err => {
        // Background sync failure is non-fatal
      })
    }
  } catch (error: unknown) {
    console.error('[ensureOrgContextSynced] Error checking context:', error)
    // Don't throw - this is a best-effort optimization
  }
}

/**
 * Trigger sync in background by calling the sync functions directly.
 * This avoids HTTP overhead when running server-side.
 */
async function triggerSyncInBackground(workspaceId: string): Promise<void> {
  // Import sync functions dynamically to avoid circular dependencies
  const { syncOrgContext } = await import('@/lib/context/org/syncOrgContext')
  const { syncDepartmentContexts } = await import('@/lib/context/org/syncDepartmentContexts')
  const { syncTeamContexts } = await import('@/lib/context/org/syncTeamContexts')
  const { syncPersonContexts } = await import('@/lib/context/org/syncPersonContexts')
  const { syncRoleContexts } = await import('@/lib/context/org/syncRoleContexts')

  // Sync all org context types for this workspace
  await syncOrgContext(workspaceId)
  await syncDepartmentContexts(workspaceId)
  await syncTeamContexts(workspaceId)
  await syncPersonContexts(workspaceId)
  await syncRoleContexts(workspaceId)

}

/**
 * Synchronous version that waits for sync to complete.
 * Use this in API endpoints where you need the data immediately.
 * 
 * @param workspaceId - The workspace ID to check and sync
 * @returns true if sync was triggered, false if context already exists
 */
export async function ensureOrgContextSyncedSync(workspaceId: string): Promise<boolean> {
  try {
    // Check if any org-related ContextItems exist for this workspace
    const count = await prisma.contextItem.count({
      where: {
        workspaceId,
        type: {
          in: ['workspace', 'org', 'department', 'team', 'person', 'role'],
        },
      },
    })

    // If count is very low (< 2), sync is likely missing or incomplete
    if (count < 2) {
      await triggerSyncInBackground(workspaceId)
      return true
    }

    return false
  } catch (error: unknown) {
    console.error('[ensureOrgContextSyncedSync] Error:', error)
    throw error
  }
}
