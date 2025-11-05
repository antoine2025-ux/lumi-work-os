/**
 * Migration script to fix workspace_type values for existing wiki pages
 * 
 * This script:
 * - Only UPDATES existing pages (doesn't delete anything)
 * - Fixes pages that have incorrect workspace_type values
 * - Is safe to run multiple times (idempotent)
 * - Logs all changes for review
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface PageFix {
  pageId: string
  title: string
  oldWorkspaceType: string | null
  newWorkspaceType: string
  reason: string
}

async function fixWikiWorkspaceTypes() {
  console.log('🔧 Starting wiki workspace_type migration...\n')

  try {
    // Get all wiki pages
    const allPages = await prisma.wikiPage.findMany({
      select: {
        id: true,
        title: true,
        workspace_type: true,
        permissionLevel: true,
        workspaceId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log(`📊 Found ${allPages.length} total wiki pages\n`)

    const fixes: PageFix[] = []
    let pagesToUpdate: Array<{ id: string; workspace_type: string }> = []

    // Analyze each page and determine what needs to be fixed
    for (const page of allPages) {
      const currentWorkspaceType = page.workspace_type
      let newWorkspaceType: string | null = null
      let reason = ''

      // Check if workspace_type is null or empty
      if (!currentWorkspaceType || currentWorkspaceType === '' || currentWorkspaceType === null) {
        // Legacy pages: infer from permissionLevel
        if (page.permissionLevel === 'personal') {
          newWorkspaceType = 'personal'
          reason = 'Legacy page with permissionLevel=personal, setting workspace_type=personal'
        } else {
          newWorkspaceType = 'team'
          reason = 'Legacy page without workspace_type, defaulting to team'
        }
      } else if (currentWorkspaceType === 'team' || currentWorkspaceType === 'personal') {
        // Already correct, skip
        continue
      } else {
        // Custom workspace - verify it's a valid workspace ID
        // Check if this looks like a custom workspace ID (starts with 'wiki-' or similar)
        if (currentWorkspaceType.startsWith('wiki-') || currentWorkspaceType.length > 20) {
          // Likely a custom workspace ID - keep it
          continue
        } else {
          // Invalid workspace_type value - might be corrupted
          // Default to 'team' for safety
          newWorkspaceType = 'team'
          reason = `Invalid workspace_type value "${currentWorkspaceType}", resetting to team`
        }
      }

      if (newWorkspaceType) {
        fixes.push({
          pageId: page.id,
          title: page.title,
          oldWorkspaceType: currentWorkspaceType,
          newWorkspaceType,
          reason
        })

        pagesToUpdate.push({
          id: page.id,
          workspace_type: newWorkspaceType
        })
      }
    }

    console.log(`📝 Found ${fixes.length} pages that need updates:\n`)

    // Display what will be changed
    fixes.forEach((fix, index) => {
      console.log(`${index + 1}. "${fix.title}"`)
      console.log(`   Old: ${fix.oldWorkspaceType || '(null)'}`)
      console.log(`   New: ${fix.newWorkspaceType}`)
      console.log(`   Reason: ${fix.reason}\n`)
    })

    if (fixes.length === 0) {
      console.log('✅ No pages need updates. All workspace_type values are correct!')
      return
    }

    // Check for dry-run mode
    const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true'
    
    if (isDryRun) {
      console.log(`\n🔍 DRY RUN MODE - No changes will be made`)
      console.log(`   Would update ${fixes.length} pages`)
      console.log(`   Run without --dry-run to apply changes\n`)
      return
    }

    // Ask for confirmation
    console.log(`\n⚠️  This will update ${fixes.length} pages.`)
    console.log('   The changes are safe and reversible.')
    console.log('   Only the workspace_type field will be updated.')
    console.log('   No data will be deleted.\n')
    
    // For safety, require explicit confirmation via environment variable
    if (process.env.CONFIRM_MIGRATION !== 'true') {
      console.log('⚠️  To run this migration, set CONFIRM_MIGRATION=true')
      console.log('   Example: CONFIRM_MIGRATION=true npx tsx scripts/fix-wiki-workspace-types.ts\n')
      return
    }

    // Update pages in batches
    console.log('🔄 Updating pages...\n')

    let updatedCount = 0
    for (const pageUpdate of pagesToUpdate) {
      try {
        await prisma.wikiPage.update({
          where: { id: pageUpdate.id },
          data: { workspace_type: pageUpdate.workspace_type }
        })
        updatedCount++
        if (updatedCount % 10 === 0) {
          console.log(`   Updated ${updatedCount}/${pagesToUpdate.length} pages...`)
        }
      } catch (error) {
        console.error(`   ❌ Error updating page ${pageUpdate.id}:`, error)
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} pages!`)
    console.log('\n📊 Summary:')
    console.log(`   Total pages: ${allPages.length}`)
    console.log(`   Pages updated: ${updatedCount}`)
    console.log(`   Pages unchanged: ${allPages.length - updatedCount}`)

  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
if (require.main === module) {
  fixWikiWorkspaceTypes()
    .then(() => {
      console.log('\n✅ Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error)
      process.exit(1)
    })
}

export { fixWikiWorkspaceTypes }
