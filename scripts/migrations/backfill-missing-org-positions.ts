#!/usr/bin/env tsx
/**
 * Backfill missing OrgPositions for existing workspace members.
 * Uses ensureOrgPositionForUser to create positions for members who have none.
 *
 * Run: npm run migrate:backfill-org-positions
 *      npx tsx scripts/migrations/backfill-missing-org-positions.ts
 */

import { PrismaClient } from '@prisma/client'
import { ensureOrgPositionForUser } from '@/lib/org/ensure-org-position'

const prisma = new PrismaClient()

async function backfillOrgPositions() {
  console.log('🔄 Backfilling missing OrgPositions...\n')

  let created = 0
  let skipped = 0
  let errors = 0

  const workspaces = await prisma.workspace.findMany({
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  })

  console.log(`Found ${workspaces.length} workspaces\n`)

  for (const workspace of workspaces) {
    console.log(`📁 Workspace: ${workspace.name || workspace.slug}`)
    console.log(`   Members: ${workspace.members.length}`)

    for (const member of workspace.members) {
      const email = member.user?.email ?? 'unknown'

      const existingPosition = await prisma.orgPosition.findFirst({
        where: {
          userId: member.userId,
          workspaceId: workspace.id,
        },
      })

      if (existingPosition) {
        console.log(`   ✓ ${email} - already has position`)
        skipped++
        continue
      }

      try {
        await ensureOrgPositionForUser(prisma, {
          workspaceId: workspace.id,
          userId: member.userId,
          title: 'Team Member',
        })

        const verified = await prisma.orgPosition.findFirst({
          where: {
            userId: member.userId,
            workspaceId: workspace.id,
          },
        })

        if (verified) {
          console.log(`   + ${email} - created position`)
          created++
        } else {
          console.log(`   = ${email} - position now exists (race?)`)
          skipped++
        }
      } catch (error) {
        console.error(`   ✗ ${email} - error:`, error)
        errors++
      }
    }
    console.log('')
  }

  console.log('='.repeat(60))
  console.log('📊 Backfill Summary')
  console.log('='.repeat(60))
  console.log(`✅ Created:  ${created}`)
  console.log(`⏭️  Skipped:  ${skipped}`)
  console.log(`❌ Errors:   ${errors}`)
  console.log('')

  if (created > 0) {
    console.log('✨ Run diagnostic to verify:')
    console.log('   npm run diagnostic:workspace-org-sync')
  }
}

backfillOrgPositions()
  .then(() => {
    console.log('✅ Backfill complete\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Backfill failed:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
