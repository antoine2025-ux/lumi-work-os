import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, settings } = await request.json()

    if (!sessionId || !settings) {
      return NextResponse.json({ error: 'Session ID and settings are required' }, { status: 400 })
    }

    // Get the session
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    })

    if (!session || !session.draftTitle || !session.draftBody) {
      return NextResponse.json({ error: 'Session or draft not found' }, { status: 404 })
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { email: 'dev@example.com' }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'dev@example.com',
          name: 'Dev User'
        }
      })
    }

    // Generate unique slug from title
    const baseSlug = session.draftTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()
    
    // Add timestamp to make it unique
    const timestamp = Date.now()
    const slug = `${baseSlug}-${timestamp}`

    // Create wiki page using existing API
    const wikiPage = await prisma.wikiPage.create({
      data: {
        title: session.draftTitle,
        content: session.draftBody,
        slug: slug,
        workspaceId: 'cmgl0f0wa00038otlodbw5jhn',
        createdById: user.id,
        category: settings.category || 'general',
        permissionLevel: settings.visibility || 'public',
        tags: settings.tags || [],
        excerpt: session.draftBody.substring(0, 200) + (session.draftBody.length > 200 ? '...' : '')
      }
    })

    // Update session with wiki URL and phase
    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        wikiUrl: `/wiki/${wikiPage.slug}`,
        phase: 'published'
      }
    })

    return NextResponse.json({
      success: true,
      url: `/wiki/${wikiPage.slug}`,
      wikiPage: {
        id: wikiPage.id,
        title: wikiPage.title,
        slug: wikiPage.slug
      }
    })

  } catch (error) {
    console.error('Error publishing wiki page:', error)
    return NextResponse.json({ 
      error: 'Failed to publish wiki page', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}