import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

// GET /api/wiki/pages/[id] - Get a specific wiki page by ID or slug
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
    // Try to find by ID first, then by slug
    let page = await prisma.wikiPage.findUnique({
      where: {
        id: resolvedParams.id
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
          orderBy: {
            order: 'asc'
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        attachments: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        versions: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            version: 'desc'
          }
        }
      }
    })

    // If not found by ID, try to find by slug
    if (!page) {
      page = await prisma.wikiPage.findFirst({
        where: {
          slug: resolvedParams.id
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
            orderBy: {
              order: 'asc'
            }
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          },
          attachments: {
            orderBy: {
              createdAt: 'desc'
            }
          },
          versions: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              version: 'desc'
            }
          }
        }
      })
    }

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error('Error fetching wiki page:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// PUT /api/wiki/pages/[id] - Update a wiki page
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
    const body = await request.json()
    const { title, content, parentId, tags, isPublished, permissionLevel, category } = body

    // Get current page to check permissions and get version info
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

    // Generate new slug if title changed
    let slug = currentPage.slug
    if (title && title !== currentPage.title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      // Check if new slug already exists
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

    // Update the page
    const updatedPage = await prisma.wikiPage.update({
      where: { id: resolvedParams.id },
      data: {
        ...(title && { title }),
        ...(content && { 
          content,
          excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : '')
        }),
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

    // Create new version if content changed
    if (content && content !== currentPage.content) {
      const nextVersion = (currentPage.versions[0]?.version || 0) + 1
      await prisma.wikiVersion.create({
        data: {
          pageId: resolvedParams.id,
          content,
          version: nextVersion,
          createdById: auth.user.userId
        }
      })
    }

    return NextResponse.json(updatedPage)
  } catch (error) {
    console.error('Error updating wiki page:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

// DELETE /api/wiki/pages/[id] - Delete a wiki page
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
    // Check if page exists
    const page = await prisma.wikiPage.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Delete the page (cascade will handle related records)
    await prisma.wikiPage.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({ message: 'Page deleted successfully' })
  } catch (error) {
    console.error('Error deleting wiki page:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
