#!/usr/bin/env npx tsx
/**
 * Spaces Data Integrity Checks (Test Suite 8)
 * Run: npx tsx scripts/spaces-data-integrity.ts
 */
import { prisma } from '../src/lib/db'

async function main() {
  console.log('=== SPACES DATA INTEGRITY CHECKS ===\n')

  // Test 8.1: Orphaned wiki pages (no space, not personal note)
  // WikiPage: spaceId, type (PERSONAL_NOTE), permissionLevel; no project_id (project docs are in ProjectDocumentation)
  const orphanedPages = await prisma.wikiPage.findMany({
    where: {
      spaceId: null,
      type: { not: 'PERSONAL_NOTE' },
    },
    select: { id: true, title: true, workspaceId: true, type: true },
    take: 30,
  })
  console.log('8.1 Orphaned wiki pages (space_id=null, type!=PERSONAL_NOTE):')
  console.log(`  Count: ${orphanedPages.length}`)
  orphanedPages.forEach((p) => console.log(`  - ${p.id}: "${p.title}" type=${p.type} (ws: ${p.workspaceId})`))
  console.log('')

  // Test 8.2: Orphaned projects (no spaceId)
  const orphanedProjects = await prisma.project.findMany({
    where: { spaceId: null },
    select: { id: true, name: true, workspaceId: true },
  })
  console.log('8.2 Orphaned projects (space_id=null):')
  console.log(`  Count: ${orphanedProjects.length}`)
  orphanedProjects.slice(0, 10).forEach((p) => console.log(`  - ${p.id}: "${p.name}" (ws: ${p.workspaceId})`))
  if (orphanedProjects.length > 10) console.log(`  ... and ${orphanedProjects.length - 10} more`)
  console.log('')

  // Test 8.3: Company Wiki space per workspace
  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      companyWikiSpaceId: true,
      companyWikiSpace: { select: { id: true, name: true, type: true, slug: true } },
    },
  })
  const wikiSpaces = await prisma.space.findMany({
    where: { type: 'WIKI' },
    select: { id: true, workspaceId: true, name: true, slug: true },
  })
  console.log('8.3 Company Wiki space per workspace:')
  workspaces.forEach((w) => {
    const wikiCount = wikiSpaces.filter((s) => s.workspaceId === w.id).length
    const status =
      wikiCount === 0
        ? 'NO Company Wiki'
        : wikiCount === 1
          ? 'OK (exactly 1)'
          : `WARNING: ${wikiCount} Company Wiki spaces`
    console.log(`  ${w.name} (${w.id}): ${status}`)
    if (w.companyWikiSpace) {
      console.log(`    -> companyWikiSpaceId: ${w.companyWikiSpace.id}, slug: ${w.companyWikiSpace.slug}`)
    }
  })
  console.log('')

  // Extra: Spaces with type and parent
  const spacesSummary = await prisma.space.groupBy({
    by: ['type', 'isPersonal'],
    _count: { id: true },
  })
  console.log('Spaces summary by type:')
  spacesSummary.forEach((s) =>
    console.log(`  type=${s.type ?? 'null'}, isPersonal=${s.isPersonal}: ${s._count.id}`)
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
