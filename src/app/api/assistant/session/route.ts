import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const { sessionId, draftBody, draftTitle, phase } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

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
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
