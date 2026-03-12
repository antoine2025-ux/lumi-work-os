import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { TaskWikiLinkCreateSchema } from '@/lib/validations/tasks'
import { prisma } from '@/lib/db'

type TaskWikiLinkDto = {
  id: string
  wikiPageId: string
  order: number
  createdAt: string
  wikiPage: {
    id: string
    title: string
    slug: string
    workspace_type: string | null
    updatedAt: string
    projectDocumentation?: Array<{
      project: {
        id: string
        name: string
      }
    }>
  }
}

// GET /api/tasks/[id]/wiki-links - List all linked wiki pages for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(auth.workspaceId)
    const resolvedParams = await params
    const taskId = resolvedParams.id

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Verify task exists and belongs to this workspace
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, workspaceId: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Fetch all wiki links for this task
    const wikiLinks = await prisma.taskWikiLink.findMany({
      where: { taskId },
      include: {
        wikiPage: {
          select: {
            id: true,
            title: true,
            slug: true,
            workspace_type: true,
            updatedAt: true,
            projectDocumentation: {
              select: {
                project: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    })

    // Transform to DTO format
    const links: TaskWikiLinkDto[] = wikiLinks.map(link => ({
      id: link.id,
      wikiPageId: link.wikiPageId,
      order: link.order,
      createdAt: link.createdAt.toISOString(),
      wikiPage: {
        id: link.wikiPage.id,
        title: link.wikiPage.title,
        slug: link.wikiPage.slug,
        workspace_type: link.wikiPage.workspace_type,
        updatedAt: link.wikiPage.updatedAt.toISOString(),
        projectDocumentation: link.wikiPage.projectDocumentation
      }
    }))

    return NextResponse.json(links)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// POST /api/tasks/[id]/wiki-links - Link a wiki page to a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })
    setWorkspaceContext(auth.workspaceId)
    const resolvedParams = await params
    const taskId = resolvedParams.id

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Validate request body
    const body = await request.json()
    const validatedData = TaskWikiLinkCreateSchema.parse(body)
    const { wikiPageId } = validatedData

    // Verify task exists and belongs to this workspace
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, workspaceId: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify wiki page exists and belongs to the same workspace
    const wikiPage = await prisma.wikiPage.findUnique({
      where: { id: wikiPageId },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        slug: true,
        workspace_type: true,
        updatedAt: true,
        projectDocumentation: {
          select: {
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!wikiPage) {
      return NextResponse.json({ error: 'Wiki page not found' }, { status: 404 })
    }

    if (wikiPage.workspaceId !== task.workspaceId) {
      return NextResponse.json({
        error: 'Wiki page must belong to the same workspace as the task'
      }, { status: 400 })
    }

    // Check if already linked (unique constraint will prevent duplicates, but we can handle gracefully)
    const existing = await prisma.taskWikiLink.findUnique({
      where: {
        taskId_wikiPageId: {
          taskId,
          wikiPageId
        }
      }
    })

    if (existing) {
      // Return existing record
      const existingWithPage = await prisma.taskWikiLink.findUnique({
        where: { id: existing.id },
        include: {
          wikiPage: {
            select: {
              id: true,
              title: true,
              slug: true,
              workspace_type: true,
              updatedAt: true,
              projectDocumentation: {
                select: {
                  project: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (existingWithPage) {
        return NextResponse.json({
          id: existingWithPage.id,
          wikiPageId: existingWithPage.wikiPageId,
          order: existingWithPage.order,
          createdAt: existingWithPage.createdAt.toISOString(),
          wikiPage: {
            id: existingWithPage.wikiPage.id,
            title: existingWithPage.wikiPage.title,
            slug: existingWithPage.wikiPage.slug,
            workspace_type: existingWithPage.wikiPage.workspace_type,
            updatedAt: existingWithPage.wikiPage.updatedAt.toISOString(),
            projectDocumentation: existingWithPage.wikiPage.projectDocumentation
          }
        })
      }
    }

    // Get max order for this task to append at the end
    const maxOrder = await prisma.taskWikiLink.aggregate({
      where: { taskId },
      _max: { order: true }
    })

    const newOrder = (maxOrder._max.order ?? -1) + 1

    // Create new wiki link
    const newLink = await prisma.taskWikiLink.create({
      data: {
        taskId,
        wikiPageId,
        order: newOrder,
        workspaceId: auth.workspaceId
      },
      include: {
        wikiPage: {
          select: {
            id: true,
            title: true,
            slug: true,
            workspace_type: true,
            updatedAt: true,
            projectDocumentation: {
              select: {
                project: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    })

    const link: TaskWikiLinkDto = {
      id: newLink.id,
      wikiPageId: newLink.wikiPageId,
      order: newLink.order,
      createdAt: newLink.createdAt.toISOString(),
      wikiPage: {
        id: newLink.wikiPage.id,
        title: newLink.wikiPage.title,
        slug: newLink.wikiPage.slug,
        workspace_type: newLink.wikiPage.workspace_type,
        updatedAt: newLink.wikiPage.updatedAt.toISOString(),
        projectDocumentation: newLink.wikiPage.projectDocumentation
      }
    }

    return NextResponse.json(link, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// DELETE /api/tasks/[id]/wiki-links?wikiPageId=... - Unlink a wiki page from a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })
    setWorkspaceContext(auth.workspaceId)
    const resolvedParams = await params
    const taskId = resolvedParams.id

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Get wikiPageId from query params
    const { searchParams } = new URL(request.url)
    const wikiPageId = searchParams.get('wikiPageId')

    if (!wikiPageId) {
      return NextResponse.json({ error: 'Wiki page ID is required' }, { status: 400 })
    }

    // Verify task exists and belongs to this workspace
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, workspaceId: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Find and delete the link
    const link = await prisma.taskWikiLink.findUnique({
      where: {
        taskId_wikiPageId: {
          taskId,
          wikiPageId
        }
      }
    })

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    await prisma.taskWikiLink.delete({
      where: { id: link.id }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
