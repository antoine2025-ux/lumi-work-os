import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { 
  createWorkspaceWithOnboarding, 
  getWorkspaceTemplates,
  OnboardingOptions 
} from '@/lib/workspace-onboarding'

// GET /api/workspace-onboarding/templates - Get available workspace templates
export async function GET(request: NextRequest) {
  try {
    const templates = getWorkspaceTemplates()
    
    return NextResponse.json({
      success: true,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        features: template.features,
        settings: template.settings
      }))
    })
  } catch (error) {
    console.error('Error fetching workspace templates:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch templates'
    }, { status: 500 })
  }
}

// POST /api/workspace-onboarding/create - Create workspace with onboarding
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists in our database
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        name: session.user.name || 'User',
        image: session.user.image,
        emailVerified: new Date(),
      }
    })

    const body = await request.json()
    const {
      templateId,
      customName,
      customDescription,
      inviteMembers,
      enableFeatures
    } = body as OnboardingOptions

    // Check if user already has a workspace
    const existingWorkspace = await prisma.workspace.findFirst({
      where: {
        members: {
          some: { userId: user.id }
        }
      }
    })

    if (existingWorkspace) {
      return NextResponse.json({
        success: false,
        error: 'User already has a workspace',
        existingWorkspaceId: existingWorkspace.id
      }, { status: 400 })
    }

    // Create workspace with onboarding
    const result = await createWorkspaceWithOnboarding(user.id, {
      templateId,
      customName,
      customDescription,
      inviteMembers,
      enableFeatures
    })

    return NextResponse.json({
      success: true,
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
        description: result.workspace.description
      },
      wikiWorkspaces: result.wikiWorkspaces.map(ww => ({
        id: ww.id,
        name: ww.name,
        type: ww.type,
        color: ww.color,
        icon: ww.icon
      })),
      defaultPages: result.defaultPages.map(page => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        category: page.category
      })),
      defaultProjects: result.defaultProjects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description
      })),
      stats: {
        pagesCreated: result.defaultPages.length,
        projectsCreated: result.defaultProjects.length,
        wikiWorkspacesCreated: result.wikiWorkspaces.length,
        membersInvited: inviteMembers?.length || 0
      }
    })

  } catch (error) {
    console.error('Error creating workspace with onboarding:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create workspace'
    }, { status: 500 })
  }
}

