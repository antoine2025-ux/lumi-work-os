import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertProjectAccess } from '@/lib/pm/guards'
import { prisma } from '@/lib/db'
import { ProjectSpaceVisibility } from '@prisma/client'

// GET /api/projects/[projectId]/assignees - Get users who can be assigned to tasks in this project
// Policy B compliant: Only returns users who have project access
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    const projectId = resolvedParams.projectId

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Convert UnifiedAuthUser to NextAuth User format for assertProjectAccess
    const nextAuthUser = {
      id: auth.user.userId,
      email: auth.user.email,
      name: auth.user.name
    } as any

    // Verify requester has access to the project
    await assertProjectAccess(nextAuthUser, projectId, undefined, auth.workspaceId)

    // Get project with ProjectSpace info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectSpace: {
          include: {
            members: {
              select: {
                userId: true
              }
            }
          }
        },
        members: {
          select: {
            userId: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Determine which users can be assigned based on ProjectSpace visibility
    let assignableUserIds: string[] = []

    if (project.projectSpace) {
      const space = project.projectSpace
      
      if (space.visibility === ProjectSpaceVisibility.PUBLIC) {
        // PUBLIC: All workspace members can be assigned
        const workspaceMembers = await prisma.workspaceMember.findMany({
          where: { workspaceId: auth.workspaceId },
          select: { userId: true }
        })
        assignableUserIds = workspaceMembers.map(m => m.userId)
      } else {
        // TARGETED: Only ProjectSpaceMembers + ProjectMembers + creator/owner
        const spaceMemberIds = space.members.map(m => m.userId)
        const projectMemberIds = project.members.map(m => m.userId)
        
        // Combine and deduplicate
        assignableUserIds = [
          ...new Set([
            ...spaceMemberIds,
            ...projectMemberIds,
            project.createdById,
            project.ownerId
          ].filter(Boolean))
        ]
      }
    } else {
      // Legacy project (no ProjectSpace): All workspace members can be assigned
      const workspaceMembers = await prisma.workspaceMember.findMany({
        where: { workspaceId: auth.workspaceId },
        select: { userId: true }
      })
      assignableUserIds = workspaceMembers.map(m => m.userId)
    }

    // Get user details for assignable users
    const assignableUsers = await prisma.user.findMany({
      where: {
        id: {
          in: assignableUserIds
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ users: assignableUsers })
  } catch (error: any) {
    console.error('Error fetching project assignees:', error)
    
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message?.includes('Forbidden') || error.message?.includes('Insufficient')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient project permissions' }, { status: 403 })
    }
    
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch assignees' 
    }, { status: 500 })
  }
}
