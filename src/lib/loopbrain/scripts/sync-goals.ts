/**
 * Script to backfill all existing goals into Loopbrain context store
 * Run once to index existing goals
 */

import { syncMultipleGoals } from '@/lib/goals/loopbrain-integration'
import { prisma } from '@/lib/db'

export async function syncAllGoalsForWorkspace(workspaceId: string): Promise<void> {
  console.log(`[GoalSync] Starting bulk sync for workspace ${workspaceId}`)
  
  const startTime = Date.now()
  await syncMultipleGoals(workspaceId)
  const duration = Date.now() - startTime
  
  const count = await prisma.goal.count({ where: { workspaceId } })
  console.log(`[GoalSync] Synced ${count} goals in ${duration}ms`)
}

// CLI usage: npx tsx src/lib/loopbrain/scripts/sync-goals.ts <workspaceId>
if (require.main === module) {
  const workspaceId = process.argv[2]
  if (!workspaceId) {
    console.error('Usage: npx tsx src/lib/loopbrain/scripts/sync-goals.ts <workspaceId>')
    process.exit(1)
  }
  
  syncAllGoalsForWorkspace(workspaceId)
    .then(() => {
      console.log('✅ Goal sync complete')
      process.exit(0)
    })
    .catch((err) => {
      console.error('❌ Goal sync failed:', err)
      process.exit(1)
    })
}
