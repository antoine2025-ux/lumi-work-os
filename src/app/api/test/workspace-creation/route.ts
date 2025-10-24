import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createDefaultWorkspaceForUser } from '@/lib/workspace-onboarding'

// GET /api/test/workspace-creation - Test workspace creation for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user already has workspaces
    const existingWorkspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId: user.id }
        }
      },
      include: {
        members: {
          where: { userId: user.id },
          select: { role: true }
        },
        _count: {
          select: {
            members: true,
            projects: true
          }
        }
      }
    })

    // Check wiki workspaces
    const wikiWorkspaces = await prisma.wiki_workspaces.findMany({
      where: {
        workspace_id: {
          in: existingWorkspaces.map(w => w.id)
        }
      }
    })

    // Check default pages
    const defaultPages = await prisma.wikiPage.findMany({
      where: {
        workspaceId: {
          in: existingWorkspaces.map(w => w.id)
        },
        title: {
          contains: 'Welcome'
        }
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      workspaces: existingWorkspaces.map(w => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        description: w.description,
        userRole: w.members[0]?.role,
        memberCount: w._count.members,
        projectCount: w._count.projects,
        createdAt: w.createdAt
      })),
      wikiWorkspaces: wikiWorkspaces.map(ww => ({
        id: ww.id,
        name: ww.name,
        type: ww.type,
        workspace_id: ww.workspace_id
      })),
      defaultPages: defaultPages.map(page => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        workspaceId: page.workspaceId
      })),
      stats: {
        totalWorkspaces: existingWorkspaces.length,
        totalWikiWorkspaces: wikiWorkspaces.length,
        totalDefaultPages: defaultPages.length,
        hasOnboardingContent: defaultPages.length > 0
      }
    })

  } catch (error) {
    console.error('Error testing workspace creation:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test workspace creation'
    }, { status: 500 })
  }
}

// POST /api/test/workspace-creation - Force create workspace for testing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user already has workspaces
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

    // Force create workspace with onboarding
    const workspaceId = await createDefaultWorkspaceForUser(user.id)

    return NextResponse.json({
      success: true,
      message: 'Workspace created successfully',
      workspaceId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })

  } catch (error) {
    console.error('Error creating workspace:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create workspace'
    }, { status: 500 })
  }
}

