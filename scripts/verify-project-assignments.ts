#!/usr/bin/env tsx
/**
 * Verify Project Assignment Workflow
 *
 * Verifies that project creation correctly creates ProjectMember and WorkAllocation
 * records with org position linking.
 *
 * Usage:
 *   npx tsx scripts/verify-project-assignments.ts [projectId]
 *
 * If projectId is provided, verifies that existing project.
 * If not provided, prints usage and lists recent projects.
 */

import { prisma } from '../src/lib/db'

async function verifyProject(projectId: string) {
  console.log('\n=== Project Assignment Verification ===\n')
  console.log(`Project ID: ${projectId}\n`)

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          orgPosition: { select: { id: true, title: true } },
        },
      },
    },
  })

  if (!project) {
    console.error('Project not found')
    process.exit(1)
  }

  console.log('Project:', project.name)
  console.log('Owner:', project.owner?.name ?? project.owner?.email ?? project.ownerId)
  console.log('')

  console.log('--- ProjectMember Records ---')
  if (project.members.length === 0) {
    console.log('  WARNING: No ProjectMember records found')
  } else {
    for (const m of project.members) {
      const orgLink = m.orgPositionId ? `(orgPositionId: ${m.orgPositionId})` : '(no org position)'
      console.log(`  - ${m.user.name ?? m.user.email}: role=${m.role} ${orgLink}`)
    }
  }
  console.log('')

  const workAllocations = await prisma.workAllocation.findMany({
    where: {
      contextType: 'PROJECT',
      contextId: projectId,
    },
    select: {
      id: true,
      personId: true,
      allocationPercent: true,
      contextLabel: true,
      startDate: true,
    },
  })

  console.log('--- WorkAllocation Records ---')
  if (workAllocations.length === 0) {
    console.log('  WARNING: No WorkAllocation records found')
    console.log('  (Users without OrgPositions will not have WorkAllocations)')
  } else {
    for (const a of workAllocations) {
      const user = await prisma.user.findUnique({
        where: { id: a.personId },
        select: { name: true, email: true },
      })
      const hours = Math.round(a.allocationPercent * 40 * 100) / 100
      console.log(`  - ${user?.name ?? user?.email ?? a.personId}: ${hours}h/week (${a.contextLabel})`)
    }
  }
  console.log('')

  console.log('--- Summary ---')
  const membersWithOrg = project.members.filter((m) => m.orgPositionId)
  const membersWithoutOrg = project.members.filter((m) => !m.orgPositionId)

  console.log(`  ProjectMembers: ${project.members.length}`)
  console.log(`  With org position: ${membersWithOrg.length}`)
  console.log(`  Without org position: ${membersWithoutOrg.length}`)
  console.log(`  WorkAllocations: ${workAllocations.length}`)

  if (membersWithoutOrg.length > 0) {
    console.log('\n  Members without org positions (no capacity tracking):')
    for (const m of membersWithoutOrg) {
      console.log(`    - ${m.user.name ?? m.user.email}`)
    }
  }

  console.log('\n=== Verification Complete ===\n')
}

async function main() {
  const projectId = process.argv[2]

  if (projectId) {
    await verifyProject(projectId)
    return
  }

  console.log('Project Assignment Verification\n')
  console.log('Usage: npx tsx scripts/verify-project-assignments.ts <projectId>\n')
  console.log('Recent projects:')

  const recent = await prisma.project.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      ownerId: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  })

  for (const p of recent) {
    console.log(`  ${p.id}  ${p.name} (${p._count.members} members)`)
  }
  console.log('\nRun with a project ID to verify assignments.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
