import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { canAccessSpace } from '@/lib/spaces'
import { getTeamCollaborations } from '@/lib/spaces/queries'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: spaceId } = await params
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const accessible = await canAccessSpace(auth.user.userId, spaceId)
    if (!accessible) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: { workspaceId: true },
    })
    if (!space || space.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const collaborations = await getTeamCollaborations(spaceId, auth.workspaceId)
    return NextResponse.json(collaborations)
  } catch (error) {
    return handleApiError(error, request)
  }
}
