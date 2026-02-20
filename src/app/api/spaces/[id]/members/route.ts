import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { AddSpaceMemberSchema } from '@/lib/validations/spaces'
import { canAccessSpace, canEditSpace } from '@/lib/spaces'

type Params = { params: Promise<{ id: string }> }

// GET /api/spaces/[id]/members — list members of a space
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: spaceId } = await params
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const accessible = await canAccessSpace(auth.user.userId, spaceId)
    if (!accessible) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const members = await prisma.spaceMember.findMany({
      where: { spaceId },
      include: { user: { select: { id: true, name: true, image: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ members })
  } catch (error) {
    return handleApiError(error, request)
  }
}

// POST /api/spaces/[id]/members — add a member (or update role) — owner/EDITOR only
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: spaceId } = await params
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const canEdit = await canEditSpace(auth.user.userId, spaceId)
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, role } = AddSpaceMemberSchema.parse(await request.json())

    // Verify the target user is a workspace member
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: auth.workspaceId, userId } },
    })
    if (!wsMember) {
      return NextResponse.json(
        { error: 'User is not a member of this workspace.' },
        { status: 400 },
      )
    }

    const member = await prisma.spaceMember.upsert({
      where: { spaceId_userId: { spaceId, userId } },
      create: { spaceId, userId, role },
      update: { role },
      include: { user: { select: { id: true, name: true, image: true, email: true } } },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
