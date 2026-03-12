import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { PersonalNoteCreateSchema } from '@/lib/validations/personal-notes'

// GET /api/personal-notes - List notes for current user
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const notes = await prisma.personalNote.findMany({
      where: {
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
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })

    return NextResponse.json(notes)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// POST /api/personal-notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const validatedData = PersonalNoteCreateSchema.parse(body)

    const note = await prisma.personalNote.create({
      data: {
        workspaceId: auth.workspaceId,
        userId: auth.user.userId,
        title: validatedData.title || 'Untitled',
        content: validatedData.content || '',
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

    return NextResponse.json(note)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
