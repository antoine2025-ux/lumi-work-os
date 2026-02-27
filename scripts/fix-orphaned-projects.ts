#!/usr/bin/env tsx
/**
 * Fix Orphaned Projects (spaceId=null)
 *
 * Assigns orphaned projects to a default "General" Space per workspace.
 * Idempotent — safe to run multiple times.
 *
 * Run: npm run fix:orphaned-projects
 *      npx tsx scripts/fix-orphaned-projects.ts
 */

import { prismaUnscoped } from '@/lib/db'

async function getOrCreateGeneralSpace(
  workspaceId: string,
  ownerId: string
): Promise<string> {
  const existing = await prismaUnscoped.space.findFirst({
    where: { workspaceId, isPersonal: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await prismaUnscoped.space.create({
    data: {
      workspaceId,
      ownerId,
      name: 'General',
      visibility: 'PUBLIC',
      isPersonal: false,
      type: 'TEAM',
      icon: 'home',
      color: '#6366f1',
    },
    select: { id: true },
  })
  return created.id
}

async function fixOrphanedProjects() {
  const orphanedProjects = await prismaUnscoped.project.findMany({
    where: { spaceId: null },
    include: { workspace: { select: { id: true, ownerId: true } } },
  })

  console.log(`Found ${orphanedProjects.length} orphaned projects\n`)

  let fixed = 0
  for (const project of orphanedProjects) {
    const spaceId = await getOrCreateGeneralSpace(
      project.workspaceId,
      project.workspace.ownerId
    )

    await prismaUnscoped.project.update({
      where: { id: project.id },
      data: { spaceId },
    })

    console.log(`Fixed: ${project.name} → General (space ${spaceId})`)
    fixed++
  }

  console.log(`\nDone! Fixed ${fixed} orphaned projects.`)
}

fixOrphanedProjects()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prismaUnscoped.$disconnect())
