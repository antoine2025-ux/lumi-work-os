import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/projects - Get all projects for a workspace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'workspace-1'
    const status = searchParams.get('status')

    // Ensure user and workspace exist for development
    const createdById = 'dev-user-1'
    
    let user = await prisma.user.findUnique({
      where: { id: createdById }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: createdById,
          email: 'dev@lumi.com',
          name: 'Development User'
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
          ownerId: createdById
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
    // For development, bypass session check
    // TODO: Implement proper authentication
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { 
      workspaceId, 
      name, 
      description, 
      status = 'ACTIVE',
      priority = 'MEDIUM',
      startDate,
      endDate,
      color
    } = body

    if (!workspaceId || !name) {
      return NextResponse.json({ 
        error: 'Missing required fields: workspaceId, name' 
      }, { status: 400 })
    }

    // Use hardcoded user ID for development
    const createdById = 'dev-user-1'

    // Ensure user and workspace exist for development
    let user = await prisma.user.findUnique({
      where: { id: createdById }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: createdById,
          email: 'dev@lumi.com',
          name: 'Development User'
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
          ownerId: createdById
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
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        color,
        createdById
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
        userId: createdById,
        role: 'OWNER'
      }
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ 
      error: 'Failed to create project',
      details: error.message 
    }, { status: 500 })
  }
}
