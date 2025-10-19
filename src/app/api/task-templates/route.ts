import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/task-templates - Get all task templates for a workspace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'workspace-1'
    const category = searchParams.get('category')
    const isPublic = searchParams.get('isPublic')

    // Ensure user and workspace exist for development
    const createdById = 'dev-user-1'
    
    const user = await prisma.user.upsert({
      where: { id: createdById },
      update: {},
      create: {
        id: createdById,
        email: 'dev@lumi.com',
        name: 'Development User'
      }
    })

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
    if (category) {
      where.category = category
    }
    if (isPublic !== null) {
      where.isPublic = isPublic === 'true'
    }

    const templates = await prisma.taskTemplate.findMany({
      where,
      include: {
        tasks: {
          orderBy: {
            order: 'asc'
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching task templates:', error)
    return NextResponse.json({ error: 'Failed to fetch task templates' }, { status: 500 })
  }
}

// POST /api/task-templates - Create a new task template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      workspaceId = 'workspace-1',
      name,
      description,
      category,
      isPublic = false,
      metadata,
      tasks = []
    } = body

    // Ensure user and workspace exist for development
    const createdById = 'dev-user-1'
    
    const user = await prisma.user.upsert({
      where: { id: createdById },
      update: {},
      create: {
        id: createdById,
        email: 'dev@lumi.com',
        name: 'Development User'
      }
    })

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

    // Create the template
    const template = await prisma.taskTemplate.create({
      data: {
        workspaceId,
        name,
        description,
        category: category as any,
        isPublic,
        metadata: metadata || {},
        createdById,
        tasks: {
          create: tasks.map((task: any, index: number) => ({
            title: task.title,
            description: task.description,
            status: task.status || 'TODO',
            priority: task.priority || 'MEDIUM',
            estimatedDuration: task.estimatedDuration,
            assigneeRole: task.assigneeRole,
            tags: task.tags || [],
            dependencies: task.dependencies || [],
            order: index
          }))
        }
      },
      include: {
        tasks: {
          orderBy: {
            order: 'asc'
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error creating task template:', error)
    return NextResponse.json({ error: 'Failed to create task template' }, { status: 500 })
  }
}

