import { prisma } from '@/lib/db'

/**
 * Gets or creates the Company Wiki space for a workspace.
 * One workspace has exactly one Company Wiki space (type=WIKI).
 */
export async function getOrCreateCompanyWikiSpace(
  workspaceId: string,
  ownerId: string,
) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { companyWikiSpace: true },
  })
  if (workspace?.companyWikiSpace) return workspace.companyWikiSpace

  const existing = await prisma.space.findFirst({
    where: { workspaceId, type: 'WIKI' },
  })
  if (existing) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { companyWikiSpaceId: existing.id },
    })
    return existing
  }

  const space = await prisma.space.create({
    data: {
      workspaceId,
      ownerId,
      name: 'Company Wiki',
      slug: 'company-wiki',
      description: 'Company-wide documentation and wiki pages',
      visibility: 'PUBLIC',
      isPersonal: false,
      type: 'WIKI',
      icon: 'globe',
      color: '#3b82f6',
    },
  })

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { companyWikiSpaceId: space.id },
  })

  return space
}

/**
 * Returns the Company Wiki space ID for a workspace, or null if not yet created.
 */
export async function getCompanyWikiSpaceId(
  workspaceId: string,
): Promise<string | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { companyWikiSpaceId: true },
  })
  if (workspace?.companyWikiSpaceId) return workspace.companyWikiSpaceId

  const space = await prisma.space.findFirst({
    where: { workspaceId, type: 'WIKI' },
    select: { id: true },
  })
  return space?.id ?? null
}
