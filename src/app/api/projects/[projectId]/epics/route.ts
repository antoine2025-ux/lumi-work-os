import { NextRequest, NextResponse } from 'next/server'
import { CreateEpicSchema, UpdateEpicSchema } from '@/lib/pm/schemas'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { emitProjectEvent } from '@/lib/pm/events'
import { z } from 'zod'
import { prisma } from '@/lib/db'

// GET /api/projects/[projectId]/epics - Get all epics for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = resolvedParams.projectId

    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(activeWorkspaceId)

    // 4. Assert project access (project must be in active workspace)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      projectId, 
      scope: 'project', 
      requireRole: ['MEMBER'] 
    })

    const epics = await prisma.epic.findMany({
      where: { 
        projectId,
        workspaceId: activeWorkspaceId // 5. Ensure cross-tenant safety
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
      },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json(epics)
  } catch (error) {
    console.error('Error fetching epics:', error)
    
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    if (error.message.includes('Project not found')) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch epics',
      details: error.message 
    }, { status: 500 })
  }
}

// POST /api/projects/[projectId]/epics - Create a new epic
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = resolvedParams.projectId

    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(activeWorkspaceId)

    // 4. Assert project write access (require ADMIN or OWNER to create epics)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      projectId, 
      scope: 'project', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    const body = await request.json()
    
    // Validate input
    const validatedData = CreateEpicSchema.parse(body)

    // Verify project exists and is in the correct workspace
    const project = await prisma.project.findUnique({
      where: { 
        id: projectId,
        workspaceId: activeWorkspaceId // 5. Ensure cross-tenant safety
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get the next order value
    const lastEpic = await prisma.epic.findFirst({
      where: { 
        projectId,
        workspaceId: activeWorkspaceId
      },
      orderBy: { order: 'desc' }
    })
    const nextOrder = lastEpic ? lastEpic.order + 1 : 0

    // Create the epic
    const epic = await prisma.epic.create({
      data: {
        projectId,
        workspaceId: auth.workspaceId, // 5. Use activeWorkspaceId
        title: validatedData.title,
        description: validatedData.description,
        color: validatedData.color,
        order: validatedData.order ?? nextOrder
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
      'epicCreated',
      {
        epic,
        projectId,
        userId: userId // 3. Use userId from auth
      }
    )

    return NextResponse.json(epic, { status: 201 })
  } catch (error) {
    console.error('Error creating epic:', error)
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 })
    }
    
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    if (error.message.includes('Project not found')) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create epic' 
    }, { status: 500 })
  }
}
