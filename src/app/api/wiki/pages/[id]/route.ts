import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { emitEvent } from '@/lib/events/emit'
import { ACTIVITY_EVENTS } from '@/lib/events/activityEvents'
import { logger } from '@/lib/logger'

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
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    setWorkspaceContext(auth.workspaceId)
    
    const resolvedParams = await params
    const pageIdOrSlug = resolvedParams.id
    
    // Try to find by ID first (with workspaceId filter for security)
    let page = await prisma.wikiPage.findFirst({
      where: { 
        id: pageIdOrSlug,
        workspaceId: auth.workspaceId
      },
      include: {
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
          orderBy: { order: 'asc' }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: {
          orderBy: { createdAt: 'desc' }
        },
        versions: {
          include: {
            createdBy: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { version: 'desc' }
        }
      }
    })

    // If not found by ID, try by slug
    if (!page) {
      page = await prisma.wikiPage.findFirst({
        where: {
          slug: pageIdOrSlug,
          workspaceId: auth.workspaceId
        },
        include: {
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
            orderBy: { order: 'asc' }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          attachments: {
            orderBy: { createdAt: 'desc' }
          },
          versions: {
            include: {
              createdBy: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { version: 'desc' }
          }
        }
      })
    }

    if (!page) {
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
    const body = await request.json()
    const { title, content, contentJson, contentFormat, parentId, tags, isPublished, permissionLevel, category } = body

    const currentPage = await prisma.wikiPage.findUnique({
      where: { id: resolvedParams.id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    })

    if (!currentPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
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
              contentJson, 
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
          createdById: auth.user.userId
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
    const page = await prisma.wikiPage.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    await prisma.wikiPage.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({ message: 'Page deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting wiki page:', error)
    return handleApiError(error, request)
  }
}
