#!/usr/bin/env tsx
/**
 * Project-Org Scope Audit
 *
 * Audits current data scope for project-org integration pre-flight checks.
 * Counts projects, members, assignees, work allocations, org positions.
 * Identifies users in projects but not in org.
 *
 * Usage:
 *   npm run audit:project-org-scope
 *   npx tsx scripts/audit-project-org-scope.ts
 *
 * Before applying migrations: stop dev server and Prisma Studio to avoid
 * advisory lock timeout (P1002). Then run: npm run db:migrate:deploy
 */

import { prisma } from '@/lib/db'

async function auditScope() {
  const counts = {
    totalProjects: await prisma.project.count(),
    projectsWithOwner: await prisma.project.count({ where: { ownerId: { not: null } } }),
    totalProjectMembers: await prisma.projectMember.count(),
    totalProjectAssignees: await prisma.projectAssignee.count(),
    totalWorkAllocations: await prisma.workAllocation.count(),
    totalOrgPositions: await prisma.orgPosition.count(),
    orgPositionsWithUser: await prisma.orgPosition.count({ where: { userId: { not: null } } }),
  }

  console.log('Current State:', counts)

  const projectUsers = await prisma.project.findMany({
    where: { ownerId: { not: null } },
    select: { ownerId: true },
    distinct: ['ownerId'],
  })

  const orgUserIds = await prisma.orgPosition.findMany({
    select: { userId: true },
  }).then((positions) => positions.map((p) => p.userId).filter(Boolean) as string[])

  const usersInProjectsNotInOrg = projectUsers.filter(
    (p) => p.ownerId && !orgUserIds.includes(p.ownerId)
  )

  console.log('Users in projects but not in org:', usersInProjectsNotInOrg.length)

  return counts
}

auditScope()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
