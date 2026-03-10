import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { AssistantPublishSchema } from '@/lib/validations/assistant'

export async function POST(request: NextRequest) {
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

    const body = AssistantPublishSchema.parse(await request.json())
    const { sessionId, settings } = body

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
        workspaceId: auth.workspaceId,
        createdById: user.id,
        category: (settings.category as string) || 'general',
        permissionLevel: (settings.visibility as string) || 'public',
        tags: (settings.tags as string[]) || [],
        excerpt: session.draftBody.substring(0, 200) + (session.draftBody.length > 200 ? '...' : '')
      }
    })

    // Update session with wiki URL and phase
    const _updatedSession = await prisma.chatSession.update({
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

  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}