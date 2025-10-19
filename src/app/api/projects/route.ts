import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProjectCreateSchema } from '@/lib/pm/schemas'
import { z } from 'zod'

const prisma = new PrismaClient()

// GET /api/projects - Get all projects for a workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'cmgl0f0wa00038otlodbw5jhn'
    const status = searchParams.get('status')

    // Get authenticated user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email!,
          name: session.user.name || 'Unknown User'
        }
      })
    }

    let workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })
    
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: workspaceId,
          name: 'Development Workspace',
          slug: 'dev-workspace',
          description: 'Development workspace',
          ownerId: user.id
        }
      })
    }

    const where: any = { workspaceId }
    if (status) {
      where.status = status
    }

    const projects = await prisma.project.findMany({
      where,
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
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch projects' 
    }, { status: 500 })
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body with Zod
    const validatedData = ProjectCreateSchema.parse(body)
    const { 
      workspaceId, 
      name, 
      description, 
      status = 'ACTIVE',
      priority = 'MEDIUM',
      startDate,
      endDate,
      color,
      department,
      team,
      ownerId,
      wikiPageId,
      dailySummaryEnabled = false
    } = validatedData

    // Extract watcher and assignee IDs from the request body
    const { watcherIds = [], assigneeIds = [] } = body

    // Additional validation for required fields not in schema
    if (!workspaceId) {
      return NextResponse.json({ 
        error: 'Missing required field: workspaceId' 
      }, { status: 400 })
    }

    // Handle empty strings as null/undefined
    const cleanData = {
      ...validatedData,
      department: department || undefined,
      team: team || undefined,
      ownerId: ownerId || undefined,
      wikiPageId: wikiPageId || undefined
    }

    // Get authenticated user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email!,
          name: session.user.name || 'Unknown User'
        }
      })
    }

    let workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })
    
    if (!workspace) {
      // Check if a workspace with the default slug already exists
      const existingWorkspace = await prisma.workspace.findUnique({
        where: { slug: 'dev-workspace' }
      })
      
      const slug = existingWorkspace ? `dev-workspace-${Date.now()}` : 'dev-workspace'
      
      workspace = await prisma.workspace.create({
        data: {
          id: workspaceId,
          name: 'Development Workspace',
          slug: slug,
          description: 'Development workspace',
          ownerId: user.id
        }
      })
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        workspaceId,
        name,
        description,
        status: status as any,
        priority: priority as any,
        startDate: cleanData.startDate ? new Date(cleanData.startDate) : null,
        endDate: cleanData.endDate ? new Date(cleanData.endDate) : null,
        color,
        department: cleanData.department,
        team: cleanData.team,
        ownerId: cleanData.ownerId || user.id, // Use provided owner or default to creator
        wikiPageId: cleanData.wikiPageId, // Handle empty string as null
        dailySummaryEnabled,
        createdById: user.id
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
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    // Add the creator as a project member with OWNER role
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
        role: 'OWNER'
      }
    })

    // Create watchers
    if (watcherIds && watcherIds.length > 0) {
      await prisma.projectWatcher.createMany({
        data: watcherIds.map((userId: string) => ({
          projectId: project.id,
          userId
        }))
      })
    }

    // Create assignees
    if (assigneeIds && assigneeIds.length > 0) {
      await prisma.projectAssignee.createMany({
        data: assigneeIds.map((userId: string) => ({
          projectId: project.id,
          userId,
          role: 'MEMBER' // Default role for assignees
        }))
      })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors)
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create project',
      details: error.message 
    }, { status: 500 })
  }
}
