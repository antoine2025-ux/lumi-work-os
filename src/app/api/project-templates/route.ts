import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

// GET /api/project-templates - Get all project templates
export async function GET(request: NextRequest) {
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

    const templates = await prisma.projectTemplate.findMany({
      where: { workspaceId: auth.workspaceId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching project templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project templates' },
      { status: 500 }
    )
  }
}

// POST /api/project-templates - Create a new project template
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

    const body = await request.json()
    const { 
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

    // Create project template
    const template = await prisma.projectTemplate.create({
      data: {
        workspaceId: auth.workspaceId,
        name,
        description,
        category,
        isDefault,
        isPublic,
        templateData,
        createdById: auth.user.userId
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error creating project template:', error)
    return NextResponse.json(
      { error: 'Failed to create project template' },
      { status: 500 }
    )
  }
}