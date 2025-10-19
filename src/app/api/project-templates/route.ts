import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/project-templates - Get all project templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'cmgl0f0wa00038otlodbw5jhn'
    const category = searchParams.get('category')

    // Ensure workspace exists for development
    const ownerId = 'dev-user-1'
    
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
          ownerId: ownerId
        }
      })
    }

    const where: any = { 
      OR: [
        { workspaceId },
        { isPublic: true }
      ]
    }
    
    if (category) {
      where.category = category
    }

    const templates = await prisma.projectTemplate.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching project templates:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch project templates' 
    }, { status: 500 })
  }
}

// POST /api/project-templates - Create a new project template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      workspaceId = 'cmgl0f0wa00038otlodbw5jhn',
      name, 
      description,
      category,
      isDefault = false,
      isPublic = true,
      templateData
    } = body

    if (!name || !templateData) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, templateData' 
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

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.projectTemplate.updateMany({
        where: { 
          workspaceId,
          isDefault: true 
        },
        data: { isDefault: false }
      })
    }

    // Create the template
    const template = await prisma.projectTemplate.create({
      data: {
        workspaceId,
        name,
        description,
        category: category || 'General',
        isDefault,
        isPublic,
        templateData,
        createdById
      },
      include: {
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
    console.error('Error creating project template:', error)
    return NextResponse.json({ 
      error: 'Failed to create project template',
      details: error.message 
    }, { status: 500 })
  }
}
