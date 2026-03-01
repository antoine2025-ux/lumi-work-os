import { prisma } from '@/lib/db'
import { getCompanyWikiSpaceId } from './company-wiki'

/**
 * Spaces query layer for Personal and Team Space views.
 * Personal = aggregated work across ALL teams.
 * Team Space = team's own projects + collaborations + team docs.
 */

/** Get projects user is involved in (any team) */
export async function getMyProjects(userId: string, workspaceId: string) {
  return prisma.project.findMany({
    where: {
      workspaceId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
        { tasks: { some: { assigneeId: userId } } },
      ],
    },
    include: {
      space: { select: { id: true, name: true } },
      tasks: {
        where: { assigneeId: userId },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 6,
  })
}

/** Get pages user created (recently updated). Note: no updatedById in schema. */
export async function getMyRecentPages(userId: string, workspaceId: string) {
  return prisma.wikiPage.findMany({
    where: {
      workspaceId,
      createdById: userId,
    },
    include: {
      space: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  })
}

/** Get user's personal notes (in personal space or permissionLevel personal) */
export async function getMyPersonalNotes(userId: string, workspaceId: string) {
  return prisma.wikiPage.findMany({
    where: {
      workspaceId,
      OR: [
        { space: { isPersonal: true, ownerId: userId } },
        { permissionLevel: 'personal', createdById: userId },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  })
}

/** Get project tasks due soon for user */
export async function getMyDueTasks(userId: string, workspaceId: string) {
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  return prisma.task.findMany({
    where: {
      workspaceId,
      assigneeId: userId,
      status: { not: 'DONE' },
      dueDate: { lte: nextWeek },
    },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 5,
  })
}

/** Get projects owned by this space */
export async function getTeamProjects(spaceId: string) {
  return prisma.project.findMany({
    where: { spaceId },
    include: {
      tasks: { select: { id: true, status: true } },
      members: { select: { id: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

/** Get projects this team is collaborating on (owned by other spaces) */
export async function getTeamCollaborations(spaceId: string, workspaceId: string) {
  const teamMembers = await prisma.spaceMember.findMany({
    where: { spaceId },
    select: { userId: true },
  })
  const memberIds = teamMembers.map((m) => m.userId)

  if (memberIds.length === 0) return []

  return prisma.project.findMany({
    where: {
      workspaceId,
      spaceId: { not: spaceId },
      OR: [
        { members: { some: { userId: { in: memberIds } } } },
        { tasks: { some: { assigneeId: { in: memberIds } } } },
      ],
    },
    include: {
      space: { select: { id: true, name: true } },
      members: {
        where: { userId: { in: memberIds } },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

/** Get team's documentation. Note: WikiPage has createdBy, no updatedBy. */
export async function getTeamDocs(spaceId: string) {
  return prisma.wikiPage.findMany({
    where: { spaceId },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { children: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

/** Get Company Wiki space ID for workspace (creates if needed). */
export async function getCompanyWikiSpace(workspaceId: string, ownerId: string) {
  const { getOrCreateCompanyWikiSpace } = await import('./company-wiki')
  return getOrCreateCompanyWikiSpace(workspaceId, ownerId)
}

/** Recent activity feed for Company Wiki — all pages regardless of parentId, with parent section info. */
export async function getCompanyWikiPages(
  workspaceId: string,
  options?: { limit?: number },
) {
  const spaceId = await getCompanyWikiSpaceId(workspaceId)
  if (!spaceId) return []

  const limit = options?.limit ?? 10

  return prisma.wikiPage.findMany({
    where: {
      workspaceId,
      spaceId,
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      updatedAt: true,
      parentId: true,
      parent: { select: { id: true, title: true, slug: true } },
      createdBy: { select: { name: true } },
      _count: { select: { children: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })
}

/** Get top-level Company Wiki sections (folders). WikiPage where parentId null in company wiki space. */
export async function getCompanyWikiFolders(workspaceId: string) {
  const spaceId = await getCompanyWikiSpaceId(workspaceId)
  if (!spaceId) return []

  return prisma.wikiPage.findMany({
    where: {
      workspaceId,
      spaceId,
      parentId: null,
      isPublished: true,
    },
    include: {
      _count: { select: { children: true } },
    },
    orderBy: { order: 'asc' },
  })
}

/** Sections with eagerly-loaded children for the Company Wiki main view. */
export async function getCompanyWikiFoldersWithChildren(workspaceId: string) {
  const spaceId = await getCompanyWikiSpaceId(workspaceId)
  if (!spaceId) return []

  return prisma.wikiPage.findMany({
    where: {
      workspaceId,
      spaceId,
      parentId: null,
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      order: true,
      updatedAt: true,
      children: {
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          updatedAt: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { order: 'asc' },
      },
      _count: { select: { children: true } },
    },
    orderBy: { order: 'asc' },
  })
}
