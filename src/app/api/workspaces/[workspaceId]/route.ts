import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from "@/lib/db"

// GET /api/workspaces/[workspaceId] - Get workspace details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    const auth = await getUnifiedAuth(request)
    
    // Assert user has access to this workspace
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(workspaceId)

    // Get workspace details
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId: auth.user.userId },
          select: { role: true }
        },
        _count: {
          select: {
            members: true,
            projects: true,
            wikiPages: true,
            tasks: true
          }
        }
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    const userRole = workspace.members[0]?.role || 'MEMBER'

    const workspaceData = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logo: workspace.logo,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      userRole,
      stats: {
        members: workspace._count.members,
        projects: workspace._count.projects,
        wikiPages: workspace._count.wikiPages,
        tasks: workspace._count.tasks
      }
    }

    return NextResponse.json(workspaceData)
  } catch (error) {
    console.error("Error fetching workspace:", error)
    return NextResponse.json(
      { error: "Failed to fetch workspace" },
      { status: 500 }
    )
  }
}

// PUT /api/workspaces/[workspaceId] - Update workspace
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    const auth = await getUnifiedAuth(request)
    
    // Assert user has ADMIN or OWNER role to update workspace
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(workspaceId)

    const body = await request.json()
    const { name, description, slug } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      )
    }

    // Check if slug is being changed and if it's unique
    if (slug) {
      const existingWorkspace = await prisma.workspace.findFirst({
        where: { 
          slug: slug,
          id: { not: workspaceId }
        }
      })
      
      if (existingWorkspace) {
        return NextResponse.json(
          { error: "Workspace URL is already taken" },
          { status: 400 }
        )
      }
    }

    // Update workspace
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name,
        description: description || null,
        slug: slug || undefined
      }
    })

    return NextResponse.json(updatedWorkspace)
  } catch (error) {
    console.error("Error updating workspace:", error)
    return NextResponse.json(
      { error: "Failed to update workspace" },
      { status: 500 }
    )
  }
}

// DELETE /api/workspaces/[workspaceId] - Delete workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    const auth = await getUnifiedAuth(request)
    
    // Assert user has OWNER role to delete workspace
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: workspaceId, 
      scope: 'workspace', 
      requireRole: ['OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(workspaceId)

    // Get workspace details for confirmation
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
            wikiPages: true,
            tasks: true
          }
        }
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Delete workspace (cascade will handle all related data)
    await prisma.workspace.delete({
      where: { id: workspaceId }
    })

    // Log the deletion for audit purposes
    console.log(`Workspace "${workspace.name}" deleted by user ${auth.user.userId}`)

    return NextResponse.json({ 
      message: "Workspace deleted successfully",
      deletedWorkspace: {
        name: workspace.name,
        stats: workspace._count
      },
      requiresLogout: true // Signal that user should be logged out
    })
  } catch (error) {
    console.error("Error deleting workspace:", error)
    return NextResponse.json(
      { error: "Failed to delete workspace" },
      { status: 500 }
    )
  }
}
