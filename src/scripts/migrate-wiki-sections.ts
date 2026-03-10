import { prisma } from '@/lib/db'
import { getCompanyWikiSpaceId } from '@/lib/spaces/company-wiki'

async function migrateWikiSections() {
  console.log('Starting wiki sections migration...')
  
  const workspaces = await prisma.workspace.findMany({ select: { id: true } })
  console.log(`Found ${workspaces.length} workspaces`)
  
  let totalMigrated = 0
  
  for (const workspace of workspaces) {
    const spaceId = await getCompanyWikiSpaceId(workspace.id)
    if (!spaceId) {
      console.log(`Workspace ${workspace.id}: No company wiki space found, skipping`)
      continue
    }
    
    const topLevelPages = await prisma.wikiPage.findMany({
      where: {
        workspaceId: workspace.id,
        spaceId,
        parentId: null,
        isPublished: true,
      },
      select: { id: true, title: true },
    })
    
    if (topLevelPages.length === 0) {
      console.log(`Workspace ${workspace.id}: No top-level pages found`)
      continue
    }
    
    const result = await prisma.wikiPage.updateMany({
      where: { id: { in: topLevelPages.map(p => p.id) } },
      data: { isSection: true },
    })
    
    console.log(`Workspace ${workspace.id}: Migrated ${result.count} pages to sections`)
    console.log(`  Pages: ${topLevelPages.map(p => p.title).join(', ')}`)
    totalMigrated += result.count
  }
  
  console.log(`\nMigration complete! Total pages migrated: ${totalMigrated}`)
}

migrateWikiSections()
  .then(() => {
    console.log('Success!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
