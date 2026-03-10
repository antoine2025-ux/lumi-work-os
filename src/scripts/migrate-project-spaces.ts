/**
 * One-time migration: Assign all projects with null spaceId to General space
 * 
 * Usage: npx tsx src/scripts/migrate-project-spaces.ts
 */

import { prisma } from '@/lib/db'

async function migrateProjectSpaces() {
  console.log('🔄 Starting project space migration...\n')
  
  // Find all projects with null spaceId using raw SQL
  // (Schema now enforces spaceId as required, but this migration handles pre-migration state)
  const projectsWithoutSpace = await prisma.$queryRaw<Array<{
    id: string
    name: string
    workspaceId: string
    teamId: string | null
  }>>`
    SELECT id, name, "workspaceId", "teamId"
    FROM "projects"
    WHERE "spaceId" IS NULL
  `
  
  console.log(`Found ${projectsWithoutSpace.length} projects without spaces\n`)
  
  if (projectsWithoutSpace.length === 0) {
    console.log('✅ No migration needed - all projects already have spaces')
    return
  }
  
  // Group projects by workspace
  const byWorkspace = projectsWithoutSpace.reduce((acc, project) => {
    if (!acc[project.workspaceId]) {
      acc[project.workspaceId] = []
    }
    acc[project.workspaceId].push(project)
    return acc
  }, {} as Record<string, typeof projectsWithoutSpace>)
  
  // For each workspace, find or create General space, then assign projects
  for (const [workspaceId, projects] of Object.entries(byWorkspace)) {
    console.log(`Processing workspace: ${workspaceId}`)
    console.log(`  Projects to migrate: ${projects.length}`)
    
    // Find General space
    let generalSpace = await prisma.space.findFirst({
      where: {
        workspaceId,
        name: 'General',
      }
    })
    
    // Create General space if it doesn't exist
    if (!generalSpace) {
      console.log('  General space not found, creating...')
      
      // Need an ownerId - try workspace owner first, then any admin, then any member
      let workspaceOwner = await prisma.workspaceMember.findFirst({
        where: { 
          workspaceId,
          role: 'OWNER'
        },
        select: { userId: true }
      })
      
      // Fallback to ADMIN if no OWNER
      if (!workspaceOwner) {
        console.log('  No OWNER found, trying ADMIN...')
        workspaceOwner = await prisma.workspaceMember.findFirst({
          where: { 
            workspaceId,
            role: 'ADMIN'
          },
          select: { userId: true }
        })
      }
      
      // Fallback to any member if no ADMIN
      if (!workspaceOwner) {
        console.log('  No ADMIN found, trying any MEMBER...')
        workspaceOwner = await prisma.workspaceMember.findFirst({
          where: { workspaceId },
          select: { userId: true }
        })
      }
      
      if (!workspaceOwner) {
        console.error(`  ❌ ERROR: No workspace members found for ${workspaceId}`)
        console.error(`  This workspace appears to be orphaned`)
        console.error(`  Skipping ${projects.length} projects in this workspace`)
        continue
      }
      
      generalSpace = await prisma.space.create({
        data: {
          workspaceId,
          name: 'General',
          slug: 'general',
          type: 'TEAM',
          visibility: 'PUBLIC',
          ownerId: workspaceOwner.userId,
        }
      })
      
      console.log(`  ✅ Created General space: ${generalSpace.id}`)
    } else {
      console.log(`  ✅ Found existing General space: ${generalSpace.id}`)
    }
    
    // Assign all projects in this workspace to General space using raw SQL
    const result = await prisma.$executeRaw`
      UPDATE "projects"
      SET "spaceId" = ${generalSpace.id}
      WHERE "workspaceId" = ${workspaceId}
        AND "spaceId" IS NULL
    `
    
    console.log(`  ✅ Migrated ${result} projects to General space`)
    
    // List migrated projects
    projects.forEach(p => {
      console.log(`     - "${p.name}" (${p.id})`)
    })
    console.log('')
  }
  
  console.log('✅ Migration complete!\n')
  
  // Final verification using raw SQL
  const remainingResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "projects"
    WHERE "spaceId" IS NULL
  `
  const remaining = Number(remainingResult[0]?.count ?? 0)
  
  if (remaining === 0) {
    console.log('✅ Verification passed: All projects now have spaces')
  } else {
    console.error(`❌ WARNING: ${remaining} projects still have null spaceId!`)
  }
}

migrateProjectSpaces()
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
