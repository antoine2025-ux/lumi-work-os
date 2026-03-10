import { redirect } from 'next/navigation'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { getAccessibleSpaces } from '@/lib/spaces'
import { TeamSpacesDashboard } from './TeamSpacesDashboard'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export default async function TeamSpacesPage({ params }: Props) {
  const { workspaceSlug } = await params
  const auth = await getUnifiedAuth()

  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  if (!auth.workspaceId) {
    redirect('/home')
  }

  await assertAccess({
    userId: auth.user.userId,
    workspaceId: auth.workspaceId,
    scope: 'workspace',
    requireRole: ['VIEWER'],
  })

  setWorkspaceContext(auth.workspaceId)

  const spaces = await getAccessibleSpaces(auth.user.userId, auth.workspaceId)

  const teamSpaces = spaces.filter(
    (s) =>
      !s.isPersonal &&
      (s.type !== 'WIKI' || !s.type) &&
      !s.parentId &&
      s.slug !== 'company-wiki'
  )

  return (
    <TeamSpacesDashboard
      spaces={teamSpaces.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        color: s.color,
        icon: s.icon,
        visibility: s.visibility,
        isPersonal: s.isPersonal,
        ownerId: s.ownerId,
        owner: s.owner,
        updatedAt: s.updatedAt.toISOString(),
        _count: {
          projects: s._count.projects,
          wikiPages: s._count.wikiPages,
          children: s._count.children,
          members: s._count.members,
        },
      }))}
    />
  )
}
