#!/usr/bin/env ts-node

/**
 * Audit script to detect TARGETED ProjectSpaces with zero members
 * 
 * Usage:
 *   npx ts-node scripts/audit-targeted-spaces.ts
 * 
 * Or with workspace filter:
 *   WORKSPACE_ID=xxx npx ts-node scripts/audit-targeted-spaces.ts
 */

import { PrismaClient, ProjectSpaceVisibility } from '@prisma/client'

const prisma = new PrismaClient()

interface AuditResult {
  projectSpaceId: string
  projectSpaceName: string
  workspaceId: string
  visibility: ProjectSpaceVisibility
  memberCount: number
  projects: Array<{
    projectId: string
    projectName: string
  }>
}

async function auditTargetedSpaces() {
  try {
    const workspaceId = process.env.WORKSPACE_ID

    console.log('🔍 Auditing TARGETED ProjectSpaces...\n')

    // Find all TARGETED ProjectSpaces
    const where: any = {
      visibility: ProjectSpaceVisibility.TARGETED
    }

    if (workspaceId) {
      where.workspaceId = workspaceId
      console.log(`Filtering by workspace: ${workspaceId}\n`)
    }

    const targetedSpaces = await prisma.projectSpace.findMany({
      where,
      include: {
        members: {
          select: {
            id: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const results: AuditResult[] = []

    for (const space of targetedSpaces) {
      const memberCount = space.members.length
      
      if (memberCount === 0) {
        results.push({
          projectSpaceId: space.id,
          projectSpaceName: space.name,
          workspaceId: space.workspaceId,
          visibility: space.visibility,
          memberCount: 0,
          projects: space.projects.map(p => ({
            projectId: p.id,
            projectName: p.name
          }))
        })
      }
    }

    // Output results
    if (results.length === 0) {
      console.log('✅ No issues found! All TARGETED ProjectSpaces have at least one member.\n')
    } else {
      console.log(`⚠️  Found ${results.length} TARGETED ProjectSpace(s) with zero members:\n`)
      
      results.forEach((result, index) => {
        console.log(`${index + 1}. ProjectSpace: "${result.projectSpaceName}"`)
        console.log(`   ID: ${result.projectSpaceId}`)
        console.log(`   Workspace: ${result.workspaceId}`)
        console.log(`   Visibility: ${result.visibility}`)
        console.log(`   Members: ${result.memberCount}`)
        console.log(`   Projects (${result.projects.length}):`)
        result.projects.forEach(project => {
          console.log(`     - ${project.projectName} (${project.projectId})`)
        })
        console.log('')
      })

      console.log('\n💡 Recommendation: Add at least one member to each TARGETED ProjectSpace')
      console.log('   to ensure projects are accessible.\n')
    }

    // Summary
    console.log('📊 Summary:')
    console.log(`   Total TARGETED spaces: ${targetedSpaces.length}`)
    console.log(`   Spaces with zero members: ${results.length}`)
    console.log(`   Spaces with members: ${targetedSpaces.length - results.length}`)

  } catch (error) {
    console.error('❌ Error auditing ProjectSpaces:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if executed directly
if (require.main === module) {
  auditTargetedSpaces()
    .then(() => {
      console.log('\n✅ Audit complete')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Audit failed:', error)
      process.exit(1)
    })
}

export { auditTargetedSpaces }
