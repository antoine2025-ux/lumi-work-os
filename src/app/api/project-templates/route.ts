import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { ProjectTemplateCreateSchema } from '@/lib/pm/schemas'

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
  } catch (error: unknown) {
    return handleApiError(error, request);
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

    const body = ProjectTemplateCreateSchema.parse(await request.json())
    const { 
      name, 
      description,
      category,
      isDefault,
      isPublic,
      templateData
    } = body

    // Create project template
    const template = await prisma.projectTemplate.create({
      data: {
        workspaceId: auth.workspaceId,
        name,
        description: description ?? null,
        category,
        isDefault: isDefault ?? false,
        isPublic: isPublic ?? true,
        templateData: templateData as any,
        createdById: auth.user.userId
      }
    })

    return NextResponse.json(template)
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}