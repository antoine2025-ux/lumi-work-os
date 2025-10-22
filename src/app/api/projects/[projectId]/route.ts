import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProjectUpdateSchema } from '@/lib/pm/schemas'
import { assertProjectAccess } from '@/lib/pm/guards'
import { z } from 'zod'
import { prisma } from '@/lib/db'


// GET /api/projects/[projectId] - Get a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const projectId = resolvedParams.projectId

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get authenticated user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Check project access
    await assertProjectAccess(user, projectId)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            createdAt: true,
            assignee: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            tasks: true
          }
        },
        wikiPage: {
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            updatedAt: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch project' 
    }, { status: 500 })
  }
}

// PUT /api/projects/[projectId] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const projectId = resolvedParams.projectId
    const body = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get authenticated user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Check project access (require admin access for updates)
    await assertProjectAccess(user, projectId, 'ADMIN')

    // Validate request body with Zod
    const validatedData = ProjectUpdateSchema.parse(body)
    const { 
      name, 
      description, 
      status,
      priority,
      startDate,
      endDate,
      color,
      department,
      team,
      wikiPageId,
      ownerId,
      dailySummaryEnabled
    } = validatedData

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Handle assignee updates if provided
    if (assigneeIds !== undefined) {
      // Remove existing assignees
      await prisma.projectAssignee.deleteMany({
        where: { projectId }
      })
      
      // Add new assignees
      if (assigneeIds.length > 0) {
        await prisma.projectAssignee.createMany({
          data: assigneeIds.map((userId: string) => ({
            projectId,
            userId
          }))
        })
      }
    }

    // Update the project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status: status as any }),
        ...(priority && { priority: priority as any }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(color && { color }),
        ...(department && { department }),
        ...(team && { team }),
        ...(wikiPageId !== undefined && { wikiPageId: wikiPageId || null }),
        ...(ownerId !== undefined && { ownerId: ownerId || null }),
        ...(dailySummaryEnabled !== undefined && { dailySummaryEnabled })
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            createdAt: true,
            assignee: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            tasks: true
          }
        },
        wikiPage: {
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            updatedAt: true
          }
        }
      }
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    
    // Handle RBAC errors
    if (error.message === 'Unauthorized: User not authenticated.' || 
        error.message === 'User not found.') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message === 'Project not found.') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    if (error.message === 'Forbidden: Insufficient project permissions.') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to update project' 
    }, { status: 500 })
  }
}
