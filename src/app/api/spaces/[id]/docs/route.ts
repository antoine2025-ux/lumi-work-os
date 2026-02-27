import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { canAccessSpace } from '@/lib/spaces'
import { getTeamDocs } from '@/lib/spaces/queries'

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

    const docs = await getTeamDocs(spaceId)
    return NextResponse.json(docs)
  } catch (error) {
    return handleApiError(error, request)
  }
}
