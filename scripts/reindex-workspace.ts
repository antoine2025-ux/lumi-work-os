/**
 * Reindex Workspace Script
 * 
 * Bulk rebuild of ContextItems for a workspace.
 * Operational safety net for fixing sync issues.
 * 
 * Usage:
 *   npx tsx scripts/reindex-workspace.ts --workspaceId=... --types=project,task,page
 */

import { prisma } from '../src/lib/db'
import { indexOne, type IndexEntityType } from '../src/lib/loopbrain/indexing/indexer'

interface ReindexOptions {
  workspaceId: string
  types?: IndexEntityType[]
  batchSize?: number
}

const DEFAULT_BATCH_SIZE = 50
const ALL_TYPES: IndexEntityType[] = ['project', 'task', 'page', 'epic', 'person', 'team', 'role', 'time_off']

async function reindexWorkspace(options: ReindexOptions) {
  const { workspaceId, types = ALL_TYPES, batchSize = DEFAULT_BATCH_SIZE } = options

  console.log(`\n🔄 Reindexing workspace: ${workspaceId}`)
  console.log(`   Types: ${types.join(', ')}`)
  console.log(`   Batch size: ${batchSize}\n`)

  const stats = {
    total: 0,
    ok: 0,
    failed: 0,
    skipped: 0,
  }

  // Process each entity type
  for (const entityType of types) {
    console.log(`\n📦 Processing ${entityType}...`)

    let entityIds: string[] = []

    try {
      switch (entityType) {
        case 'project':
          const projects = await prisma.project.findMany({
            where: { workspaceId },
            select: { id: true },
          })
          entityIds = projects.map(p => p.id)
          break

        case 'task':
          const tasks = await prisma.task.findMany({
            where: { workspaceId },
            select: { id: true },
          })
          entityIds = tasks.map(t => t.id)
          break

        case 'page':
          const pages = await prisma.wikiPage.findMany({
            where: { workspaceId },
            select: { id: true },
          })
          entityIds = pages.map(p => p.id)
          break

        case 'epic':
          const epics = await prisma.epic.findMany({
            where: { workspaceId },
            select: { id: true },
          })
          entityIds = epics.map(e => e.id)
          break

        case 'person':
          // Get users with active positions in workspace
          const users = await prisma.user.findMany({
            where: {
              orgPositions: {
                some: {
                  workspaceId,
                  isActive: true,
                },
              },
            },
            select: { id: true },
            distinct: ['id'],
          })
          entityIds = users.map(u => u.id)
          break

        case 'team':
          const teams = await prisma.orgTeam.findMany({
            where: { workspaceId },
            select: { id: true },
          })
          entityIds = teams.map(t => t.id)
          break

        case 'role':
          const roles = await prisma.orgPosition.findMany({
            where: { workspaceId },
            select: { id: true },
          })
          entityIds = roles.map(r => r.id)
          break

        case 'time_off':
          const timeOffs = await prisma.timeOff.findMany({
            where: { workspaceId },
            select: { id: true },
          })
          entityIds = timeOffs.map(t => t.id)
          break

        default:
          console.log(`   ⚠️  Unknown entity type: ${entityType}`)
          continue
      }

      console.log(`   Found ${entityIds.length} ${entityType} entities`)

      // Process in batches
      for (let i = 0; i < entityIds.length; i += batchSize) {
        const batch = entityIds.slice(i, i + batchSize)
        const batchNum = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(entityIds.length / batchSize)

        console.log(`   Batch ${batchNum}/${totalBatches} (${batch.length} items)...`)

        const results = await Promise.all(
          batch.map(entityId =>
            indexOne({
              workspaceId,
              userId: 'system', // System user for bulk operations
              entityType,
              entityId,
              action: 'upsert',
              reason: 'script:reindex-workspace',
              requestId: `reindex-${Date.now()}-${entityId}`,
            })
          )
        )

        for (const result of results) {
          stats.total++
          if (result.ok) {
            stats.ok++
          } else {
            stats.failed++
            console.log(`     ❌ Failed: ${result.entityId} - ${result.error?.message || 'Unknown error'}`)
          }
        }
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${entityType}:`, error)
      stats.failed += entityIds.length
      stats.total += entityIds.length
    }
  }

  // Print summary
  console.log(`\n✅ Reindex complete!`)
  console.log(`   Total: ${stats.total}`)
  console.log(`   OK: ${stats.ok}`)
  console.log(`   Failed: ${stats.failed}`)
  console.log(`   Skipped: ${stats.skipped}\n`)

  return stats
}

// Parse command line arguments
const args = process.argv.slice(2)
const options: Partial<ReindexOptions> = {}

for (const arg of args) {
  if (arg.startsWith('--workspaceId=')) {
    options.workspaceId = arg.split('=')[1]
  } else if (arg.startsWith('--types=')) {
    const typesStr = arg.split('=')[1]
    options.types = typesStr.split(',') as IndexEntityType[]
  } else if (arg.startsWith('--batchSize=')) {
    options.batchSize = parseInt(arg.split('=')[1], 10)
  }
}

if (!options.workspaceId) {
  console.error('❌ Error: --workspaceId is required')
  console.error('Usage: npx tsx scripts/reindex-workspace.ts --workspaceId=... [--types=project,task,page] [--batchSize=50]')
  process.exit(1)
}

// Run reindex
reindexWorkspace(options as ReindexOptions)
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

