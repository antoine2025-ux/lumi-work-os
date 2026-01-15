/**
 * Fix Index Collision Script
 * 
 * Resolves index name collisions for org_positions indexes
 * by checking which table owns them and either dropping or renaming them.
 * 
 * Usage:
 *   npx tsx scripts/fix-index-collision.ts
 */

import { prismaUnscoped } from '../src/lib/db'

// Indexes that might collide (from schema.prisma)
const INDEXES_TO_CHECK = [
  'idx_org_positions_workspace_active',
  'idx_org_positions_parent_id',
]

async function fixIndexCollision(indexName: string) {
  console.log(`🔧 Fixing index collision for ${indexName}\n`)

  try {
    // Query to find which table owns the index
    const indexInfo = await prismaUnscoped.$queryRaw<Array<{
      indexname: string
      tablename: string
      schemaname: string
    }>>`
      SELECT 
        i.relname AS indexname,
        t.relname AS tablename,
        n.nspname AS schemaname
      FROM pg_index idx
      JOIN pg_class i ON i.oid = idx.indexrelid
      JOIN pg_class t ON t.oid = idx.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE i.relname = ${indexName}
        AND n.nspname = 'public'
    `

    if (indexInfo.length === 0) {
      console.log(`✅ Index ${indexName} does not exist. Nothing to fix.\n`)
      return
    }

    const index = indexInfo[0]
    console.log(`📊 Found index: ${index.indexname}`)
    console.log(`   Table: ${index.tablename}`)
    console.log(`   Schema: ${index.schemaname}\n`)

    if (index.tablename === 'org_positions') {
      // Index belongs to org_positions - safe to drop (will be recreated by db push)
      console.log('✅ Index belongs to org_positions. Dropping it (will be recreated by db push)...')
      await prismaUnscoped.$executeRawUnsafe(
        `DROP INDEX IF EXISTS "${indexName}"`
      )
      console.log('✅ Index dropped successfully\n')
    } else {
      // Index belongs to a different table - rename it to avoid collision
      console.log(`⚠️  Index belongs to ${index.tablename} (not org_positions). Renaming to avoid collision...`)
      await prismaUnscoped.$executeRawUnsafe(
        `ALTER INDEX IF EXISTS "${indexName}" RENAME TO "${indexName}__old"`
      )
      console.log('✅ Index renamed successfully\n')
    }

    // Verify the index is gone
    const verifyInfo = await prismaUnscoped.$queryRaw<Array<{
      indexname: string
    }>>`
      SELECT i.relname AS indexname
      FROM pg_index idx
      JOIN pg_class i ON i.oid = idx.indexrelid
      JOIN pg_namespace n ON n.oid = (SELECT relnamespace FROM pg_class WHERE oid = idx.indrelid)
      WHERE i.relname = ${indexName}
        AND n.nspname = 'public'
    `

    if (verifyInfo.length === 0) {
      console.log(`✅ Verification: Index ${indexName} no longer exists\n`)
    } else {
      console.log(`⚠️  Warning: Index ${indexName} still exists after fix attempt\n`)
    }

  } catch (error) {
    console.error(`❌ Error fixing index collision for ${indexName}:`, error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    throw error
  }
}

async function main() {
  console.log('🔧 Fixing index collisions for org_positions indexes\n')
  console.log('=' .repeat(60) + '\n')

  try {
    for (const indexName of INDEXES_TO_CHECK) {
      await fixIndexCollision(indexName)
      console.log('=' .repeat(60) + '\n')
    }

    console.log('✅ All index collisions fixed!')
  } catch (error) {
    console.error('❌ Error fixing index collisions:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    throw error
  } finally {
    await prismaUnscoped.$disconnect()
    console.log('✅ Prisma client disconnected')
  }
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})

