import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceTemplate } from '@/lib/workspace-onboarding'

// GET /api/workspace-onboarding/templates/[id] - Get specific workspace template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    console.error('Error fetching workspace template:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch template'
    }, { status: 500 })
  }
}

