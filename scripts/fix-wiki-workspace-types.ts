import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixWorkspaceTypes() {
  try {
    console.log('🔍 Fetching all wiki pages...')
    
    const pages = await prisma.wikiPage.findMany({
      include: {
        createdBy: true
      }
    })
    
    console.log(`Found ${pages.length} pages total`)
    
    // Get all wiki workspaces
    const workspaces = await prisma.wiki_workspaces.findMany()
    console.log(`Found ${workspaces.length} workspaces`)
    
    // Track updates
    let updated = 0
    let skipped = 0
    
    for (const page of pages) {
      // Check if workspace_type is missing or incorrect
      if (!page.workspace_type || page.workspace_type === 'team' || page.workspace_type === 'personal') {
        // Try to determine the correct workspace based on page metadata
        // For pages created recently, we might need to manually assign them
        
        console.log(`\nPage: "${page.title}"`)
        console.log(`  Current workspace_type: ${page.workspace_type || 'NULL'}`)
        console.log(`  Permission Level: ${page.permissionLevel}`)
        console.log(`  Created: ${page.createdAt}`)
        
        // Determine workspace based on permission level
        let newWorkspaceType = page.workspace_type
        
        if (page.permissionLevel === 'personal') {
          newWorkspaceType = 'personal'
        } else if (!page.workspace_type || page.workspace_type === 'team') {
          // For team pages without workspace_type, leave as 'team'
          newWorkspaceType = 'team'
        }
        
        // Only update if it's different
        if (newWorkspaceType !== page.workspace_type) {
          await prisma.wikiPage.update({
            where: { id: page.id },
            data: { workspace_type: newWorkspaceType }
          })
          console.log(`  ✅ Updated to: ${newWorkspaceType}`)
          updated++
        } else {
          console.log(`  ⏭️  No change needed`)
          skipped++
        }
      } else {
        skipped++
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`  Updated: ${updated}`)
    console.log(`  Skipped: ${skipped}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixWorkspaceTypes()



