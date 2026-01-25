import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getTodayWindow, getWeekWindow } from '@/lib/datetime'
import { logger } from '@/lib/logger'

// Schema for creating a todo
const TodoCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  note: z.string().max(5000).optional().nullable(),
  status: z.enum(['OPEN', 'DONE']).optional().default('OPEN'),
  dueAt: z.string().datetime().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().nullable(),
  assignedToId: z.string().optional(),
  anchorType: z.enum(['NONE', 'PROJECT', 'TASK', 'PAGE']).optional().default('NONE'),
  anchorId: z.string().optional().nullable(),
})

// View types for the new todo views
type TodoView = 'my' | 'assignedToMe' | 'assignedByMe' | 'created' | 'completed' | 'today' | 'inbox' | 'upcoming'
type ScheduleFilter = 'today' | 'inbox' | 'upcoming' | 'thisWeek' | 'all'

// GET /api/todos - Get todos with filters
export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const route = '/api/todos'
  
  try {
    // 1. Get authenticated user with workspace context
    const authStart = performance.now()
    const auth = await getUnifiedAuth(request)
    const authDurationMs = performance.now() - authStart
    
    // 2. Assert workspace access
    const accessStart = performance.now()
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
    })
    const accessDurationMs = performance.now() - accessStart

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    
    // New view-based filtering
    const view = searchParams.get('view') as TodoView | null
    const schedule = searchParams.get('schedule') as ScheduleFilter | null
    
    // Legacy params (still supported for backward compatibility)
    const status = searchParams.get('status') // 'OPEN' | 'DONE'
    const anchorType = searchParams.get('anchorType')
    const anchorId = searchParams.get('anchorId')
    const assignedToId = searchParams.get('assignedToId')
    const createdById = searchParams.get('createdById')
    const showAll = searchParams.get('showAll') === 'true'
    const createdByMe = searchParams.get('createdByMe') === 'true' // For completed view toggle

    // Get user's timezone for date filtering
    const userTimezoneStart = performance.now()
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { timezone: true }
    })
    const userTimezone = user?.timezone || null
    const userTimezoneDurationMs = performance.now() - userTimezoneStart

    // Build where clause
    const where: Record<string, unknown> = {
      workspaceId: auth.workspaceId
    }

    // Handle new view-based filtering
    if (view) {
      switch (view) {
        case 'my':
        case 'assignedToMe':
          // My tasks / Assigned to me: todos assigned to current user, OPEN by default
          where.assignedToId = auth.user.userId
          where.status = 'OPEN'
          break
          
        case 'assignedByMe':
          // Assigned by me: todos I created but assigned to someone else
          where.createdById = auth.user.userId
          where.assignedToId = { not: auth.user.userId }
          where.status = 'OPEN'
          break
          
        case 'created':
          // Tasks created: all todos I created (assigned to me or others)
          where.createdById = auth.user.userId
          where.status = 'OPEN'
          break
          
        case 'completed':
          // Completed: done todos
          where.status = 'DONE'
          if (createdByMe) {
            // Toggle: show todos created by me
            where.createdById = auth.user.userId
          } else {
            // Default: show todos assigned to me
            where.assignedToId = auth.user.userId
          }
          break
          
        // Legacy view support
        case 'today':
        case 'inbox':
        case 'upcoming':
          // Will be handled in schedule filter section below
          where.assignedToId = auth.user.userId
          where.status = 'OPEN'
          break
      }
      
      // Apply schedule sub-filter for OPEN views
      if (view !== 'completed' && schedule) {
        const todayWindow = getTodayWindow(userTimezone)
        const weekWindow = getWeekWindow(userTimezone)
        
        switch (schedule) {
          case 'today':
            // Due today or overdue
            where.dueAt = { lte: todayWindow.end }
            break
          case 'inbox':
            // No due date
            where.dueAt = null
            break
          case 'upcoming':
            // Due after today
            where.dueAt = { gt: todayWindow.end }
            break
          case 'thisWeek':
            // Due within this week
            where.dueAt = { 
              gte: weekWindow.start,
              lte: weekWindow.end 
            }
            break
          case 'all':
            // No date filter
            break
        }
      }
      
      // Handle legacy view params (today/inbox/upcoming as main view)
      if (view === 'today' || view === 'inbox' || view === 'upcoming') {
        const todayWindow = getTodayWindow(userTimezone)
        
        if (view === 'today') {
          where.dueAt = { lte: todayWindow.end }
        } else if (view === 'inbox') {
          where.dueAt = null
        } else if (view === 'upcoming') {
          where.dueAt = { gt: todayWindow.end }
        }
      }
    } else {
      // Legacy behavior when no view is specified
      
      // Status filter
      if (status) {
        where.status = status
      }

      // Anchor filter
      if (anchorType && anchorType !== 'NONE') {
        where.anchorType = anchorType
        if (anchorId) {
          where.anchorId = anchorId
        }
      }

      // Assignee filter - default to current user unless showAll
      if (assignedToId) {
        where.assignedToId = assignedToId
      } else if (!showAll) {
        // Default: show only todos assigned to the current user
        where.assignedToId = auth.user.userId
      }

      // Creator filter
      if (createdById) {
        where.createdById = createdById
      }
    }

    // Handle anchor filter (applies to all views)
    if (anchorType && anchorType !== 'NONE') {
      where.anchorType = anchorType
      if (anchorId) {
        where.anchorId = anchorId
      }
    }

    const dbStart = performance.now()
    const todos = await prisma.todo.findMany({
      where,
      select: {
        id: true,
        title: true,
        note: true,
        status: true,
        dueAt: true,
        priority: true,
        anchorType: true,
        anchorId: true,
        createdAt: true,
        updatedAt: true,
        createdById: true, // Include for "assigned by" display
        assignedToId: true, // Include for comparison
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
      },
      orderBy: [
        { status: 'asc' }, // OPEN first
        { dueAt: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 100
    })
    const dbDurationMs = performance.now() - dbStart

    const totalDurationMs = performance.now() - startTime
    logger.info('Todos fetched', {
      route,
      workspaceId: auth.workspaceId,
      view: view || 'all',
      todoCount: todos.length,
      authDurationMs: Math.round(authDurationMs * 100) / 100,
      accessDurationMs: Math.round(accessDurationMs * 100) / 100,
      userTimezoneDurationMs: Math.round(userTimezoneDurationMs * 100) / 100,
      dbDurationMs: Math.round(dbDurationMs * 100) / 100,
      totalDurationMs: Math.round(totalDurationMs * 100) / 100
    })

    const response = NextResponse.json(todos)
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
    return response
  } catch (error) {
    const totalDurationMs = performance.now() - startTime
    logger.error('Error fetching todos', {
      route,
      totalDurationMs: Math.round(totalDurationMs * 100) / 100
    }, error instanceof Error ? error : undefined)
    console.error('Error fetching todos:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 })
  }
}

// POST /api/todos - Create a new todo
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    
    // Validate request body
    const validatedData = TodoCreateSchema.parse(body)
    const { 
      title, 
      note, 
      status = 'OPEN',
      dueAt, 
      priority, 
      assignedToId,
      anchorType = 'NONE',
      anchorId
    } = validatedData

    // Default assignedToId to creator if not provided
    const finalAssignedToId = assignedToId || auth.user.userId

    // Validate that assignee is a workspace member
    // PHASE 1: Use explicit select to exclude employmentStatus
    const assigneeMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: auth.workspaceId,
          userId: finalAssignedToId
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

    // Validate anchor if provided
    if (anchorType !== 'NONE' && anchorId) {
      if (anchorType === 'PROJECT') {
        const project = await prisma.project.findUnique({
          where: { id: anchorId, workspaceId: auth.workspaceId }
        })
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }
      } else if (anchorType === 'TASK') {
        const task = await prisma.task.findUnique({
          where: { id: anchorId, workspaceId: auth.workspaceId }
        })
        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }
      } else if (anchorType === 'PAGE') {
        const page = await prisma.wikiPage.findUnique({
          where: { id: anchorId, workspaceId: auth.workspaceId }
        })
        if (!page) {
          return NextResponse.json({ error: 'Page not found' }, { status: 404 })
        }
      }
    }

    // Create the todo
    const todo = await prisma.todo.create({
      data: {
        workspaceId: auth.workspaceId,
        title,
        note: note || null,
        status,
        dueAt: dueAt ? new Date(dueAt) : null,
        priority: priority || null,
        createdById: auth.user.userId,
        assignedToId: finalAssignedToId,
        anchorType,
        anchorId: anchorType !== 'NONE' ? anchorId : null
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

    return NextResponse.json(todo)
  } catch (error) {
    console.error('Error creating todo:', error)
    
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
    
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 })
  }
}
