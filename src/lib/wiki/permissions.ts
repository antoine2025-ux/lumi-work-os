import { prisma } from '@/lib/db'

/**
 * Check if a user can access a wiki workspace.
 * - Creator always has access
 * - PUBLIC: everyone has access
 * - PERSONAL: only creator (handled by creator check)
 * - PRIVATE: must be in members list
 */
export async function canAccessWikiWorkspace(
  userId: string,
  wikiWorkspaceId: string
): Promise<boolean> {
  const workspace = await prisma.wiki_workspaces.findUnique({
    where: { id: wikiWorkspaceId },
    include: {
      members: { where: { userId } },
    },
  })

  if (!workspace) return false
  if (workspace.created_by_id === userId) return true
  if (workspace.visibility === 'PUBLIC') return true
  if (workspace.visibility === 'PERSONAL') return false
  if (workspace.visibility === 'PRIVATE') return workspace.members.length > 0
  return false
}
