import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const PersonalNoteUpdateSchema = z.object({
  title: z.string().max(500).optional(),
  content: z.string().max(50000).optional(),
  pinned: z.boolean().optional(),
})

// GET /api/personal-notes/[id] - Get a single note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const note = await prisma.personalNote.findUnique({
      where: {
        id,
        workspaceId: auth.workspaceId,
        userId: auth.user.userId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        pinned: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json(note)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// PUT /api/personal-notes/[id] - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })
    setWorkspaceContext(auth.workspaceId)

    // Verify ownership
    const existingNote = await prisma.personalNote.findUnique({
      where: {
        id,
        workspaceId: auth.workspaceId,
      },
      select: {
        userId: true,
      },
    })

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (existingNote.userId !== auth.user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = PersonalNoteUpdateSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title
    }
    if (validatedData.content !== undefined) {
      updateData.content = validatedData.content
    }
    if (validatedData.pinned !== undefined) {
      updateData.pinned = validatedData.pinned
    }

    const note = await prisma.personalNote.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        content: true,
        pinned: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(note)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// DELETE /api/personal-notes/[id] - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })
    setWorkspaceContext(auth.workspaceId)

    // Verify ownership
    const existingNote = await prisma.personalNote.findUnique({
      where: {
        id,
        workspaceId: auth.workspaceId,
      },
      select: {
        userId: true,
      },
    })

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (existingNote.userId !== auth.user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.personalNote.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, request)
  }
}
