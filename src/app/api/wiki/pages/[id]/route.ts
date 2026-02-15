import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { emitEvent } from '@/lib/events/emit'
import { ACTIVITY_EVENTS } from '@/lib/events/activityEvents'
import { logger } from '@/lib/logger'
import { WikiPageUpdateSchema } from '@/lib/validations/wiki'

// Shared include clause for wiki page queries (DRY)
const WIKI_PAGE_INCLUDE = {
  createdBy: {
    select: { id: true, name: true, email: true }
  },
  parent: {
    select: { id: true, title: true, slug: true }
  },
  children: {
    select: {
      id: true,
      title: true,
      slug: true,
      order: true,
      excerpt: true,
      updatedAt: true
    },
    orderBy: { order: 'asc' } as const
  },
  comments: {
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'asc' } as const
  },
  attachments: {
    orderBy: { createdAt: 'desc' } as const
  },
  versions: {
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { version: 'desc' } as const
  }
} as const

// GET /api/wiki/pages/[id] - Get a specific wiki page by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)

    if (!auth.workspaceId) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 400 })
    }

    // VIEWER and above can read wiki pages
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER']
    })

    setWorkspaceContext(auth.workspaceId)

    const resolvedParams = await params
    const pageIdOrSlug = decodeURIComponent(resolvedParams.id)

    // RLS defense-in-depth: set app.user_id so RLS policies pass
    // (Prisma service role bypasses RLS, but this guards against config changes)
    const page = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${auth.user.userId}, true)`

      // Try to find by ID first (for direct ID lookups)
      let found = await tx.wikiPage.findFirst({
        where: {
          id: pageIdOrSlug,
          workspaceId: auth.workspaceId
        },
        include: WIKI_PAGE_INCLUDE
      })

      // If not found by ID, try by slug using the compound unique key
      if (!found) {
        found = await tx.wikiPage.findUnique({
          where: {
            workspaceId_slug: {
              workspaceId: auth.workspaceId,
              slug: pageIdOrSlug
            }
          },
          include: WIKI_PAGE_INCLUDE
        })
      }

      return found
    })

    if (!page) {
      return NextResponse.json({
        error: 'Page not found'
      }, { status: 404 })
    }

    // SECURITY: Personal pages are only visible to their creator.
    // Return 404 (not 403) to avoid revealing the page exists.
    const pageWorkspaceType = (page as any).workspace_type
    if (pageWorkspaceType === 'personal' && page.createdById !== auth.user.userId) {
      return NextResponse.json({
        error: 'Page not found'
      }, { status: 404 })
    }

    // Ensure contentFormat has a default value
    const response = {
      ...page,
      contentFormat: (page as any).contentFormat || 'HTML'
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in GET /api/wiki/pages/[id]:', error)
    return handleApiError(error, request)
  }
}

// PUT /api/wiki/pages/[id] - Update a wiki page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const resolvedParams = await params
    const body = WikiPageUpdateSchema.parse(await request.json())
    const { title, content, contentJson, contentFormat, parentId, tags, isPublished, permissionLevel, category } = body

    // RLS defense-in-depth: set app.user_id so RLS policies pass
    const currentPage = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${auth.user.userId}, true)`
      return tx.wikiPage.findUnique({
        where: { id: resolvedParams.id },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1
          }
        }
      })
    })

    if (!currentPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // SECURITY: Personal pages can only be edited by their creator
    const currentPageWorkspaceType = (currentPage as any).workspace_type
    if (currentPageWorkspaceType === 'personal' && currentPage.createdById !== auth.user.userId) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own personal pages' }, { status: 403 })
    }

    const existingFormat = (currentPage as any).contentFormat as string | null
    
    if (contentFormat && contentFormat !== existingFormat) {
      return NextResponse.json({ 
        error: `Cannot change content format. Page is ${existingFormat}. Use upgrade endpoint to convert.` 
      }, { status: 400 })
    }
    
    if (existingFormat === 'HTML' && contentJson) {
      return NextResponse.json({ 
        error: 'This page uses HTML format. Use content field instead of contentJson.' 
      }, { status: 400 })
    }
    
    if (existingFormat === 'JSON' && content && !contentJson) {
      return NextResponse.json({ 
        error: 'This page uses JSON format. Use contentJson field instead of content, or omit content to update title/metadata only.' 
      }, { status: 400 })
    }

    let slug = currentPage.slug
    if (title && title !== currentPage.title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      const existingPage = await prisma.wikiPage.findFirst({
        where: {
          workspaceId: currentPage.workspaceId,
          slug,
          id: { not: resolvedParams.id }
        }
      })

      if (existingPage) {
        return NextResponse.json({ error: 'Page with this title already exists' }, { status: 409 })
      }
    }

    const finalFormat = existingFormat
    
    let hasContentChange = false
    if (finalFormat === 'JSON') {
      if (contentJson) {
        hasContentChange = JSON.stringify(contentJson) !== JSON.stringify((currentPage as any).contentJson)
      }
    } else {
      if (content) {
        hasContentChange = content !== currentPage.content
      }
    }
    
    const { extractTextFromProseMirror } = await import('@/lib/wiki/text-extract')
    
    let textContent: string | undefined
    let excerpt: string | undefined
    
    if (hasContentChange) {
      if (finalFormat === 'JSON' && contentJson) {
        textContent = extractTextFromProseMirror(contentJson)
      } else if (content) {
        textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      }
      
      if (textContent) {
        excerpt = textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '')
      }
    }
    
    const updatedPage = await prisma.wikiPage.update({
      where: { id: resolvedParams.id },
      data: {
        ...(title && { title }),
        ...(finalFormat === 'JSON' && contentJson
          ? { 
              contentJson: contentJson as object, 
              ...(textContent && { textContent }),
              ...(excerpt && { excerpt })
            }
          : finalFormat === 'HTML' && content
          ? { 
              content,
              ...(textContent && { textContent }),
              ...(excerpt && { excerpt })
            }
          : {}
        ),
        ...(parentId !== undefined && { parentId }),
        ...(tags && { tags }),
        ...(isPublished !== undefined && { isPublished }),
        ...(permissionLevel && { permissionLevel }),
        ...(category && { category }),
        ...(slug !== currentPage.slug && { slug })
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        parent: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    })

    if (hasContentChange) {
      const nextVersion = (currentPage.versions[0]?.version || 0) + 1
      await (prisma.wikiVersion.create as Function)({
        data: {
          pageId: resolvedParams.id,
          content: finalFormat === 'JSON' 
            ? JSON.stringify(contentJson) 
            : (content || ''),
          contentJson: finalFormat === 'JSON' ? contentJson : null,
          contentFormat: finalFormat,
          textContent: textContent || null,
          version: nextVersion,
          createdById: auth.user.userId,
          workspaceId: auth.workspaceId
        }
      })
    }

    // Emit activity event
    emitEvent(ACTIVITY_EVENTS.WIKI_PAGE_EDITED, {
      workspaceId: auth.workspaceId,
      userId: auth.user.userId,
      wikiPageId: resolvedParams.id,
      timestamp: new Date()
    }).catch((err) => 
      logger.error('Failed to emit wiki page edited event', { pageId: resolvedParams.id, error: err })
    )

    return NextResponse.json(updatedPage)
  } catch (error: any) {
    console.error('Error updating wiki page:', error)
    return handleApiError(error, request)
  }
}

// DELETE /api/wiki/pages/[id] - Delete a wiki page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const resolvedParams = await params

    // RLS defense-in-depth: set app.user_id so RLS policies pass
    const deleted = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${auth.user.userId}, true)`

      const page = await tx.wikiPage.findUnique({
        where: { id: resolvedParams.id }
      })

      if (!page) {
        return null
      }

      // SECURITY: Personal pages can only be deleted by their creator
      const delPageWorkspaceType = (page as any).workspace_type
      if (delPageWorkspaceType === 'personal' && page.createdById !== auth.user.userId) {
        throw new Error('Forbidden: You can only delete your own personal pages')
      }

      await tx.wikiPage.delete({
        where: { id: resolvedParams.id }
      })

      return page
    })

    if (!deleted) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Page deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting wiki page:', error)
    return handleApiError(error, request)
  }
}
