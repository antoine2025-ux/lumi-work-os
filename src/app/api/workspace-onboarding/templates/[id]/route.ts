import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceTemplate } from '@/lib/workspace-onboarding'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

// GET /api/workspace-onboarding/templates/[id] - Get specific workspace template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(workspaceId)

    const resolvedParams = await params
    const { id } = resolvedParams
    
    const template = getWorkspaceTemplate(id)
    
    if (!template) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        features: template.features,
        defaultPages: template.defaultPages.map(page => ({
          title: page.title,
          category: page.category
        })),
        defaultProjects: template.defaultProjects.map(project => ({
          name: project.name,
          description: project.description
        })),
        settings: template.settings
      }
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}

