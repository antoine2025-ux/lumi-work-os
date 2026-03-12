import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { handleApiError } from '@/lib/api-errors'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { TodoUpdateSchema } from '@/lib/validations/todos'

// Helper to check if user can modify the todo
interface TodoWithRelations {
  id: string
  workspaceId: string
  createdById: string
  assignedToId: string
  createdBy: { id: string }
  assignedTo: { id: string }
}

async function canModifyTodo(
  todoId: string,
  userId: string,
  workspaceId: string
): Promise<{ allowed: boolean; todo: TodoWithRelations | null; reason?: string }> {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: {
      createdBy: { select: { id: true } },
      assignedTo: { select: { id: true } }
    }
  })

  if (!todo) {
    return { allowed: false, todo: null, reason: 'Todo not found' }
  }

  // Ensure todo belongs to the workspace
  if (todo.workspaceId !== workspaceId) {
    return { allowed: false, todo: null, reason: 'Todo not found' }
  }

  // Assignee can modify
  if (todo.assignedToId === userId) {
    return { allowed: true, todo }
  }

  // Creator can modify
  if (todo.createdById === userId) {
    return { allowed: true, todo }
  }

  // Check if user is workspace OWNER or ADMIN
  // PHASE 1: Use explicit select to exclude employmentStatus
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId
      }
    },
    select: {
      id: true,
      workspaceId: true,
      userId: true,
      role: true,
      joinedAt: true,
      // Exclude employmentStatus - may not exist in database yet
    }
  })

  if (member && (member.role === 'OWNER' || member.role === 'ADMIN')) {
    return { allowed: true, todo }
  }

  return { allowed: false, todo, reason: 'Insufficient permissions' }
}

// GET /api/todos/[id] - Get a single todo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const todo = await prisma.todo.findUnique({
      where: { 
        id,
        workspaceId: auth.workspaceId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    return NextResponse.json(todo)
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

// PATCH /api/todos/[id] - Update a todo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'] 
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    // 4. Check permissions
    const { allowed, todo, reason } = await canModifyTodo(id, auth.user.userId, auth.workspaceId)
    
    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }
    
    if (!allowed) {
      return NextResponse.json({ error: reason || 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = TodoUpdateSchema.parse(body)
    
    // Build update data
    const updateData: Record<string, unknown> = {}
    
    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title
    }
    if (validatedData.note !== undefined) {
      updateData.note = validatedData.note
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status
    }
    if (validatedData.dueAt !== undefined) {
      updateData.dueAt = validatedData.dueAt ? new Date(validatedData.dueAt) : null
    }
    if (validatedData.priority !== undefined) {
      updateData.priority = validatedData.priority
    }
    if (validatedData.anchorType !== undefined) {
      updateData.anchorType = validatedData.anchorType
      if (validatedData.anchorType === 'NONE') {
        updateData.anchorId = null
      }
    }
    if (validatedData.anchorId !== undefined) {
      updateData.anchorId = validatedData.anchorId
    }
    
    // Handle assignee change
    if (validatedData.assignedToId !== undefined) {
      // Validate that new assignee is a workspace member
      // PHASE 1: Use explicit select to exclude employmentStatus
      const assigneeMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: auth.workspaceId,
            userId: validatedData.assignedToId
          }
        },
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          role: true,
          joinedAt: true,
          // Exclude employmentStatus - may not exist in database yet
        }
      })

      if (!assigneeMember) {
        return NextResponse.json({ 
          error: 'Cannot assign todo: The selected user is not a member of this workspace.' 
        }, { status: 400 })
      }
      
      updateData.assignedToId = validatedData.assignedToId
    }

    // Validate anchor if being updated
    if (updateData.anchorType && updateData.anchorType !== 'NONE' && updateData.anchorId) {
      if (updateData.anchorType === 'PROJECT') {
        const project = await prisma.project.findUnique({
          where: { id: updateData.anchorId as string, workspaceId: auth.workspaceId }
        })
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }
      } else if (updateData.anchorType === 'TASK') {
        const task = await prisma.task.findUnique({
          where: { id: updateData.anchorId as string, workspaceId: auth.workspaceId }
        })
        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }
      } else if (updateData.anchorType === 'PAGE') {
        const page = await prisma.wikiPage.findUnique({
          where: { id: updateData.anchorId as string, workspaceId: auth.workspaceId }
        })
        if (!page) {
          return NextResponse.json({ error: 'Page not found' }, { status: 404 })
        }
      }
    }

    const updatedTodo = await prisma.todo.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json(updatedTodo)
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

// DELETE /api/todos/[id] - Delete a todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'] 
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    // 4. Check permissions
    const { allowed, todo, reason } = await canModifyTodo(id, auth.user.userId, auth.workspaceId)
    
    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }
    
    if (!allowed) {
      return NextResponse.json({ error: reason || 'Forbidden' }, { status: 403 })
    }

    await prisma.todo.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

