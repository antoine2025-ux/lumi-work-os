#!/usr/bin/env tsx
/**
 * Diagnostic: Check project-org integration status at database level
 *
 * Run: npx tsx scripts/diagnostic/check-project-org-links.ts
 *      npm run diagnostic:project-org
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnose() {
  console.log('=== Project-Org Integration Diagnostic ===\n')

  // 1. Check schema
  console.log('1. Checking if schema changes are applied...')
  const project = await prisma.project.findFirst({
    include: {
      members: true,
      assignees: true,
    },
  })

  if (project) {
    console.log('Sample project:', {
      id: project.id,
      name: project.name,
      ownerId: project.ownerId,
      memberCount: project.members.length,
      assigneeCount: project.assignees.length,
    })

    if (project.members.length > 0) {
      const member = project.members[0]
      console.log('Sample member:', {
        id: member.id,
        userId: member.userId,
        orgPositionId: member.orgPositionId ?? 'NULL',
      })
    }

    if (project.assignees.length > 0) {
      const assignee = project.assignees[0]
      console.log('Sample assignee:', {
        id: assignee.id,
        userId: assignee.userId,
        orgPositionId: assignee.orgPositionId ?? 'NULL',
        estimatedHours: assignee.estimatedHours ?? 'NULL',
      })
    }
  } else {
    console.log('No projects found in database.')
  }

  // 2. Check if any WorkAllocations exist
  const allocations = await prisma.workAllocation.findMany({
    take: 5,
  })
  console.log('\n2. WorkAllocations found:', allocations.length)
  if (allocations.length > 0) {
    const a = allocations[0]
    console.log('Sample allocation:', {
      id: a.id,
      orgPositionId: a.orgPositionId ?? 'NULL',
      personId: a.personId,
      projectId: a.projectId ?? 'NULL',
      hoursAllocated: a.hoursAllocated ?? 'NULL',
      allocationPercent: a.allocationPercent,
      source: a.source,
    })
  }

  // 3. Check recent projects
  console.log('\n3. Recent projects (created after migration):')
  const recentProjects = await prisma.project.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: {
      members: {
        include: {
          user: { select: { email: true } },
        },
      },
      assignees: {
        include: {
          user: { select: { email: true } },
        },
      },
    },
  })

  for (const p of recentProjects) {
    console.log(`\nProject: ${p.name}`)
    console.log(`  Created: ${p.createdAt}`)
    console.log(`  Owner: ${p.ownerId ?? 'NULL'}`)
    console.log(`  Members: ${p.members.length}`)
    for (const m of p.members) {
      console.log(`    - ${m.user.email}: orgPositionId = ${m.orgPositionId ?? 'NULL'}`)
    }
    console.log(`  Assignees: ${p.assignees.length}`)
    for (const a of p.assignees) {
      console.log(`    - ${a.user.email}: orgPositionId = ${a.orgPositionId ?? 'NULL'}`)
    }
  }

  // 4. Check OrgPositions exist
  console.log('\n4. OrgPositions in system:')
  const orgPositions = await prisma.orgPosition.findMany({
    take: 5,
    include: { user: { select: { email: true } } },
  })
  console.log(`  Found ${orgPositions.length} OrgPositions (showing up to 5)`)
  for (const op of orgPositions) {
    console.log(`    - ${op.user?.email ?? 'N/A'}: ${op.title ?? 'No title'} (id: ${op.id})`)
  }

  // 5. Count totals
  const [projectCount, memberCount, assigneeCount, allocationCount, orgPositionCount] =
    await Promise.all([
      prisma.project.count(),
      prisma.projectMember.count(),
      prisma.projectAssignee.count(),
      prisma.workAllocation.count(),
      prisma.orgPosition.count(),
    ])

  console.log('\n5. Total counts:')
  console.log(`  Projects: ${projectCount}`)
  console.log(`  ProjectMembers: ${memberCount}`)
  console.log(`  ProjectAssignees: ${assigneeCount}`)
  console.log(`  WorkAllocations: ${allocationCount}`)
  console.log(`  OrgPositions: ${orgPositionCount}`)

  console.log('\n=== End Diagnostic ===')
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
