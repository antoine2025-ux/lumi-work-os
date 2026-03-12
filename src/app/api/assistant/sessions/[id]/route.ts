import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { AssistantSessionUpdateByIdSchema } from '@/lib/validations/assistant'

// GET /api/assistant/sessions/[id] - Get a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const resolvedParams = await params
    const session = await prisma.chatSession.findUnique({
      where: {
        id: resolvedParams.id,
        userId: auth.user.userId
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// PUT /api/assistant/sessions/[id] - Update a session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const resolvedParams = await params
    const rawBody = await request.json()
    const body = AssistantSessionUpdateByIdSchema.parse(rawBody)
    
    const { phase, draftTitle, draftBody } = body
    // Additional fields not in schema but may be in raw body
    const { requirementNotes, draftFormat, pageSettings, wikiUrl } = rawBody as any

    const session = await prisma.chatSession.update({
      where: {
        id: resolvedParams.id,
        userId: auth.user.userId
      },
      data: {
        ...(phase && { phase }),
        ...(requirementNotes !== undefined && { requirementNotes }),
        ...(draftTitle !== undefined && { draftTitle }),
        ...(draftBody !== undefined && { draftBody }),
        ...(draftFormat && { draftFormat }),
        ...(pageSettings !== undefined && { pageSettings }),
        ...(wikiUrl && { wikiUrl }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(session)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// DELETE /api/assistant/sessions/[id] - Delete a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const resolvedParams = await params
    
    await prisma.chatSession.delete({
      where: {
        id: resolvedParams.id,
        userId: auth.user.userId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
