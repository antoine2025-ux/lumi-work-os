/**
 * Phase 1: Backfill Canonical Spaces
 * 
 * This script creates canonical Space records and backfills spaceId fields
 * for Projects and WikiPages. It's idempotent and safe to run multiple times.
 * 
 * Usage:
 *   ts-node scripts/backfill-canonical-spaces.ts
 * 
 * Or via npm:
 *   npm run backfill:spaces
 */

import { PrismaClient, SpaceType, SpaceVisibility } from '@prisma/client'

const prisma = new PrismaClient()

interface LegacyMapping {
  projectSpaceId?: string
  wikiWorkspaceId?: string
}

/**
 * Get or create canonical TEAM space for a workspace
 */
async function getOrCreateTeamSpace(workspaceId: string): Promise<string> {
  const existing = await prisma.space.findFirst({
    where: {
      workspaceId,
      type: SpaceType.TEAM
    }
  })

  if (existing) {
    return existing.id
  }

  const teamSpace = await prisma.space.create({
    data: {
      workspaceId,
      name: 'Team Space',
      description: 'Default team space for all workspace members',
      type: SpaceType.TEAM,
      visibility: SpaceVisibility.PUBLIC,
      ownerId: null
    }
  })

  console.log(`✅ Created TEAM space for workspace ${workspaceId}: ${teamSpace.id}`)
  return teamSpace.id
}

/**
 * Get or create canonical PERSONAL space for a user in a workspace
 */
async function getOrCreatePersonalSpace(
  workspaceId: string,
  userId: string
): Promise<string> {
  const existing = await prisma.space.findFirst({
    where: {
      workspaceId,
      type: SpaceType.PERSONAL,
      ownerId: userId
    }
  })

  if (existing) {
    return existing.id
  }

  const personalSpace = await prisma.space.create({
    data: {
      workspaceId,
      name: 'Personal Space',
      description: `Personal space for user ${userId}`,
      type: SpaceType.PERSONAL,
      visibility: SpaceVisibility.PRIVATE,
      ownerId: userId
    }
  })

  console.log(`✅ Created PERSONAL space for user ${userId} in workspace ${workspaceId}: ${personalSpace.id}`)
  return personalSpace.id
}

/**
 * Map ProjectSpace to canonical Space
 */
async function mapProjectSpaceToSpace(projectSpaceId: string): Promise<string> {
  const projectSpace = await prisma.projectSpace.findUnique({
    where: { id: projectSpaceId },
    include: {
      workspace: true,
      members: true
    }
  })

  if (!projectSpace) {
    throw new Error(`ProjectSpace ${projectSpaceId} not found`)
  }

  // Check if already mapped
  const existing = await prisma.space.findFirst({
    where: {
      workspaceId: projectSpace.workspaceId,
      legacySource: {
        path: ['projectSpaceId'],
        equals: projectSpaceId
      }
    }
  })

  if (existing) {
    return existing.id
  }

  // Create canonical Space
  const visibility = projectSpace.visibility === 'PUBLIC' 
    ? SpaceVisibility.PUBLIC 
    : SpaceVisibility.TARGETED

  const canonicalSpace = await prisma.space.create({
    data: {
      workspaceId: projectSpace.workspaceId,
      name: projectSpace.name,
      description: projectSpace.description,
      type: SpaceType.CUSTOM,
      visibility,
      ownerId: null,
      legacySource: {
        projectSpaceId: projectSpace.id
      } as LegacyMapping
    }
  })

  // Migrate ProjectSpaceMember to SpaceMember
  for (const member of projectSpace.members) {
    await prisma.spaceMember.upsert({
      where: {
        spaceId_userId: {
          spaceId: canonicalSpace.id,
          userId: member.userId
        }
      },
      create: {
        spaceId: canonicalSpace.id,
        userId: member.userId,
        role: null,
        joinedAt: member.joinedAt
      },
      update: {} // No update needed if exists
    })
  }

  console.log(`✅ Mapped ProjectSpace ${projectSpaceId} to Space ${canonicalSpace.id}`)
  return canonicalSpace.id
}

/**
 * Map wiki_workspaces entry to canonical Space
 */
async function mapWikiWorkspaceToSpace(
  wikiWorkspaceId: string,
  workspaceId: string
): Promise<string | null> {
  // Note: wiki_workspaces is not a Prisma model, so we need to query raw SQL
  const wikiWorkspace = await prisma.$queryRaw<Array<{
    id: string
    workspace_id: string
    name: string
    type: string | null
    is_private: boolean | null
    created_by_id: string
  }>>`
    SELECT id, workspace_id, name, type, is_private, created_by_id
    FROM wiki_workspaces
    WHERE id = ${wikiWorkspaceId} AND workspace_id = ${workspaceId}
    LIMIT 1
  `

  if (!wikiWorkspace || wikiWorkspace.length === 0) {
    console.warn(`⚠️  wiki_workspaces entry ${wikiWorkspaceId} not found`)
    return null
  }

  const ws = wikiWorkspace[0]

  // Check if already mapped
  const existing = await prisma.space.findFirst({
    where: {
      workspaceId: ws.workspace_id,
      legacySource: {
        path: ['wikiWorkspaceId'],
        equals: wikiWorkspaceId
      }
    }
  })

  if (existing) {
    return existing.id
  }

  // Determine space type and visibility
  let spaceType: SpaceType
  let visibility: SpaceVisibility
  let ownerId: string | null = null

  if (ws.type === 'personal') {
    spaceType = SpaceType.PERSONAL
    visibility = SpaceVisibility.PRIVATE
    ownerId = ws.created_by_id
  } else if (ws.type === 'team') {
    spaceType = SpaceType.TEAM
    visibility = SpaceVisibility.PUBLIC
  } else {
    spaceType = SpaceType.CUSTOM
    visibility = ws.is_private ? SpaceVisibility.PRIVATE : SpaceVisibility.PUBLIC
  }

  const canonicalSpace = await prisma.space.create({
    data: {
      workspaceId: ws.workspace_id,
      name: ws.name,
      description: null,
      type: spaceType,
      visibility,
      ownerId,
      legacySource: {
        wikiWorkspaceId: ws.id
      } as LegacyMapping
    }
  })

  console.log(`✅ Mapped wiki_workspaces ${wikiWorkspaceId} to Space ${canonicalSpace.id}`)
  return canonicalSpace.id
}

/**
 * Backfill Projects with spaceId
 */
async function backfillProjectSpaces() {
  console.log('\n📦 Backfilling Project.spaceId...')

  const projects = await prisma.project.findMany({
    where: {
      spaceId: null // Only process projects without spaceId
    },
    include: {
      projectSpace: true,
      workspace: true
    }
  })

  let updated = 0
  let skipped = 0

  for (const project of projects) {
    let spaceId: string | null = null

    if (project.projectSpaceId) {
      // Map ProjectSpace to canonical Space
      try {
        spaceId = await mapProjectSpaceToSpace(project.projectSpaceId)
      } catch (error) {
        console.error(`❌ Error mapping ProjectSpace ${project.projectSpaceId}:`, error)
        skipped++
        continue
      }
    } else {
      // Default to TEAM space
      spaceId = await getOrCreateTeamSpace(project.workspaceId)
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { spaceId }
    })

    updated++
  }

  console.log(`✅ Updated ${updated} projects, skipped ${skipped}`)
}

/**
 * Backfill WikiPages with spaceId
 */
async function backfillWikiPageSpaces() {
  console.log('\n📄 Backfilling WikiPage.spaceId...')

  const pages = await prisma.wikiPage.findMany({
    where: {
      spaceId: null // Only process pages without spaceId
    },
    include: {
      workspace: true,
      createdBy: true
    }
  })

  let updated = 0
  const skipped = 0

  for (const page of pages) {
    let spaceId: string | null = null

    if (page.workspace_type === 'personal') {
      // Map to user's PERSONAL space
      if (page.createdById) {
        spaceId = await getOrCreatePersonalSpace(page.workspaceId, page.createdById)
      } else {
        // Fallback to TEAM if no creator
        spaceId = await getOrCreateTeamSpace(page.workspaceId)
      }
    } else if (page.workspace_type === 'team' || !page.workspace_type) {
      // Map to TEAM space
      spaceId = await getOrCreateTeamSpace(page.workspaceId)
    } else {
      // Custom workspace_type - try to map via wiki_workspaces
      try {
        const mappedSpaceId = await mapWikiWorkspaceToSpace(
          page.workspace_type,
          page.workspaceId
        )
        spaceId = mappedSpaceId || await getOrCreateTeamSpace(page.workspaceId)
      } catch (error) {
        console.error(`❌ Error mapping wiki_workspaces ${page.workspace_type}:`, error)
        // Fallback to TEAM
        spaceId = await getOrCreateTeamSpace(page.workspaceId)
      }
    }

    await prisma.wikiPage.update({
      where: { id: page.id },
      data: { spaceId }
    })

    updated++
  }

  console.log(`✅ Updated ${updated} wiki pages, skipped ${skipped}`)
}

/**
 * Main backfill function
 */
async function main() {
  console.log('🚀 Starting canonical Spaces backfill...\n')

  try {
    // Step 1: Ensure canonical TEAM spaces exist for all workspaces
    console.log('📋 Step 1: Creating canonical TEAM spaces...')
    const workspaces = await prisma.workspace.findMany()
    for (const workspace of workspaces) {
      await getOrCreateTeamSpace(workspace.id)
    }

    // Step 2: Ensure canonical PERSONAL spaces exist for all workspace members
    console.log('\n👤 Step 2: Creating canonical PERSONAL spaces...')
    const workspaceMembers = await prisma.workspaceMember.findMany({
      distinct: ['workspaceId', 'userId']
    })
    for (const member of workspaceMembers) {
      await getOrCreatePersonalSpace(member.workspaceId, member.userId)
    }

    // Step 3: Map ProjectSpaces to canonical Spaces
    console.log('\n🗂️  Step 3: Mapping ProjectSpaces to canonical Spaces...')
    const projectSpaces = await prisma.projectSpace.findMany()
    for (const ps of projectSpaces) {
      try {
        await mapProjectSpaceToSpace(ps.id)
      } catch (error) {
        console.error(`❌ Error mapping ProjectSpace ${ps.id}:`, error)
      }
    }

    // Step 4: Map wiki_workspaces to canonical Spaces
    console.log('\n📚 Step 4: Mapping wiki_workspaces to canonical Spaces...')
    // Note: We can't use Prisma for wiki_workspaces, so we'll do this during page backfill

    // Step 5: Backfill Project.spaceId
    await backfillProjectSpaces()

    // Step 6: Backfill WikiPage.spaceId
    await backfillWikiPageSpaces()

    console.log('\n✅ Backfill complete!')
  } catch (error) {
    console.error('❌ Backfill failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { main as backfillCanonicalSpaces }
