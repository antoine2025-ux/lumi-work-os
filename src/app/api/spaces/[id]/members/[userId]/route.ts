import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { canEditSpace } from '@/lib/spaces'

type Params = { params: Promise<{ id: string; userId: string }> }

// DELETE /api/spaces/[id]/members/[userId] — remove a member (owner/EDITOR only)
// A user may also remove themselves from any space they belong to.
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id: spaceId, userId: targetUserId } = await params
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const isSelf = auth.user.userId === targetUserId
    const canEdit = await canEditSpace(auth.user.userId, spaceId)

    if (!isSelf && !canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure the membership exists
    const membership = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: targetUserId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
    }

    await prisma.spaceMember.delete({
      where: { spaceId_userId: { spaceId, userId: targetUserId } },
    })

    return NextResponse.json({ message: 'Member removed.' })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
