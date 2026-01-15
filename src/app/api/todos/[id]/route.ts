import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'

// Schema for updating a todo
const TodoUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  note: z.string().max(5000).optional().nullable(),
  status: z.enum(['OPEN', 'DONE']).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().nullable(),
  assignedToId: z.string().optional(),
  anchorType: z.enum(['NONE', 'PROJECT', 'TASK', 'PAGE']).optional(),
  anchorId: z.string().optional().nullable(),
})

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
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId
      }
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
  } catch (error) {
    console.error('Error fetching todo:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ error: 'Failed to fetch todo' }, { status: 500 })
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
      const assigneeMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: auth.workspaceId,
            userId: validatedData.assignedToId
          }
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
          where: { id: updateData.anchorId, workspaceId: auth.workspaceId }
        })
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }
      } else if (updateData.anchorType === 'TASK') {
        const task = await prisma.task.findUnique({
          where: { id: updateData.anchorId, workspaceId: auth.workspaceId }
        })
        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }
      } else if (updateData.anchorType === 'PAGE') {
        const page = await prisma.wikiPage.findUnique({
          where: { id: updateData.anchorId, workspaceId: auth.workspaceId }
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
  } catch (error) {
    console.error('Error updating todo:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 })
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
  } catch (error) {
    console.error('Error deleting todo:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 })
  }
}

