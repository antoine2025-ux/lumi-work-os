import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { UpdateSpaceSchema } from '@/lib/validations/spaces'
import { canAccessSpace, canEditSpace, canDeleteSpace } from '@/lib/spaces'

type Params = { params: Promise<{ id: string }> }

// GET /api/spaces/[id] — fetch a single space with member list and counts
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const accessible = await canAccessSpace(auth.user.userId, id)
    if (!accessible) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const space = await prisma.space.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        parent: { select: { id: true, name: true } },
        members: {
          include: { user: { select: { id: true, name: true, image: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        children: {
          include: {
            owner: { select: { id: true, name: true, image: true } },
            _count: { select: { projects: true, wikiPages: true, children: true } },
          },
          orderBy: { name: 'asc' },
        },
        projects: {
          select: { id: true, name: true, status: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        },
        wikiPages: {
          select: { id: true, title: true, slug: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        },
        _count: { select: { projects: true, wikiPages: true, children: true } },
      },
    })

    if (!space || space.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(space)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// PUT /api/spaces/[id] — update space metadata (owner or EDITOR)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const canEdit = await canEditSpace(auth.user.userId, id)
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = UpdateSpaceSchema.parse(await request.json())

    const updated = await prisma.space.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.visibility !== undefined && { visibility: body.visibility }),
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        _count: { select: { projects: true, wikiPages: true, children: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// DELETE /api/spaces/[id] — delete space (owner only)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const canDelete = await canDeleteSpace(auth.user.userId, id)
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Confirm the space belongs to this workspace before deleting
    const space = await prisma.space.findUnique({ where: { id } })
    if (!space || space.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Personal spaces cannot be deleted
    if (space.isPersonal) {
      return NextResponse.json(
        { error: 'Personal spaces cannot be deleted.' },
        { status: 400 },
      )
    }

    await prisma.space.delete({ where: { id } })

    return NextResponse.json({ message: 'Space deleted.' })
  } catch (error) {
    return handleApiError(error, request)
  }
}
