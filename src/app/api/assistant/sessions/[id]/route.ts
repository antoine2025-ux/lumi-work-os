import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/assistant/sessions/[id] - Get a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const session = await prisma.chatSession.findUnique({
      where: {
        id: resolvedParams.id,
        userId: 'dev-user-1' // TODO: Get from session
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
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/assistant/sessions/[id] - Update a session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const body = await request.json()
    
    const { phase, requirementNotes, draftTitle, draftBody, draftFormat, pageSettings, wikiUrl } = body

    const session = await prisma.chatSession.update({
      where: {
        id: resolvedParams.id,
        userId: 'dev-user-1' // TODO: Get from session
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
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/assistant/sessions/[id] - Delete a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    
    await prisma.chatSession.delete({
      where: {
        id: resolvedParams.id,
        userId: 'dev-user-1' // TODO: Get from session
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
