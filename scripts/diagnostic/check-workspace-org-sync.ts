#!/usr/bin/env tsx
/**
 * Diagnostic: Workspace–Org sync and identity gap
 *
 * Confirms root causes for multi-tenancy & assignment issues:
 * - Workspace members vs org positions (identity gap)
 * - Project ownership and membership
 *
 * Run: npx tsx scripts/diagnostic/check-workspace-org-sync.ts
 *      npm run diagnostic:workspace-org-sync
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnose() {
  console.log('=== Workspace-Org Sync Diagnostic ===\n')

  const workspaces = await prisma.workspace.findMany({
    include: {
      members: {
        include: {
          user: { select: { email: true, name: true } },
        },
      },
    },
  })

  for (const workspace of workspaces) {
    console.log(`\n📁 Workspace: ${workspace.name || workspace.slug}`)
    console.log(`   ID: ${workspace.id}`)
    console.log(`   Members: ${workspace.members.length}`)

    for (const member of workspace.members) {
      console.log(`   - ${member.user.email} (${member.user.name}) - Role: ${member.role}`)
    }

    // Org structure = positions in this workspace (schema: OrgPosition.workspaceId, no Org.workspaceId)
    const positions = await prisma.orgPosition.findMany({
      where: { workspaceId: workspace.id },
      include: {
        user: { select: { email: true } },
      },
    })

    if (positions.length > 0) {
      console.log(`\n   🏢 Org positions (workspace-scoped): ${positions.length}`)
      for (const pos of positions) {
        console.log(`      - ${pos.user?.email ?? '(unassigned)'}: ${pos.title ?? '(no title)'}`)
      }
    } else {
      console.log(`\n   ⚠️ NO ORG POSITIONS - This is the problem!`)
    }

    // Identity gap: workspace members not in org (positions with user)
    const memberEmails = workspace.members.map((m) => m.user.email).filter(Boolean) as string[]
    const positionEmails = positions.map((p) => p.user?.email).filter(Boolean) as string[]
    const missingInOrg = memberEmails.filter((e) => !positionEmails.includes(e))

    if (missingInOrg.length > 0) {
      console.log(`\n      ❌ IDENTITY GAP DETECTED:`)
      console.log(`      These workspace members are NOT in org (no position):`)
      for (const email of missingInOrg) {
        console.log(`         - ${email}`)
      }
    }

    // Projects
    const projects = await prisma.project.findMany({
      where: { workspaceId: workspace.id },
      include: {
        members: {
          include: {
            user: { select: { email: true } },
          },
        },
        owner: { select: { email: true } },
      },
    })

    console.log(`\n   📊 Projects: ${projects.length}`)
    for (const proj of projects) {
      console.log(`      - ${proj.name}`)
      console.log(`        Owner: ${proj.owner?.email ?? 'NONE'}`)
      console.log(`        Members: ${proj.members.length}`)
      for (const m of proj.members) {
        console.log(`           - ${m.user.email} (role: ${m.role})`)
      }
    }
  }

  console.log('\n=== End Diagnostic ===')
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
