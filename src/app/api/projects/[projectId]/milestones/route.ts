import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { CreateMilestoneSchema } from '@/lib/pm/schemas'
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/pm/guards'
import { handleApiError } from '@/lib/api-errors'
import { ProjectRole } from '@prisma/client'
import { emitProjectEvent } from '@/lib/pm/events'
import { prisma } from '@/lib/db'

// GET /api/projects/[projectId]/milestones - Get all milestones for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = resolvedParams.projectId

    // Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(auth.workspaceId)
    
    // Get authenticated user from database
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    
    // Check if project exists first
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // Verify project access (VIEWER can see milestones)
    await assertProjectAccess(user, projectId, ProjectRole.VIEWER, auth.workspaceId)
    
    // Get milestones
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            points: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json(milestones)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// POST /api/projects/[projectId]/milestones - Create a new milestone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = resolvedParams.projectId

    // Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })
    setWorkspaceContext(auth.workspaceId)

    // Get authenticated user from database
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Check write access
    const accessResult = await assertProjectWriteAccess(user, projectId, auth.workspaceId)
    if (!accessResult) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate input
    const validatedData = CreateMilestoneSchema.parse(body)

    // Create the milestone
    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        workspaceId: accessResult.project!.workspaceId,
        title: validatedData.title,
        description: validatedData.description,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            points: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    // Emit Socket.IO event
    emitProjectEvent(
      projectId,
      'milestoneCreated',
      {
        milestone,
        projectId,
        userId: accessResult.user!.id
      }
    )

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
