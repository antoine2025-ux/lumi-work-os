import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { AssistantUpdateSessionAltSchema } from '@/lib/validations/assistant'

export async function PUT(request: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })
    setWorkspaceContext(workspaceId)

    const body = AssistantUpdateSessionAltSchema.parse(await request.json())
    const { sessionId, draftBody, draftTitle, phase } = body

    const updateData: any = {}
    if (draftBody !== undefined) updateData.draftBody = draftBody
    if (draftTitle !== undefined) updateData.draftTitle = draftTitle
    if (phase !== undefined) updateData.phase = phase

    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: updateData
    })

    return NextResponse.json(updatedSession)

  } catch (error) {
    return handleApiError(error, request)
  }
}
