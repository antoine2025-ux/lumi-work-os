import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { ProjectTaskStatus, Priority } from '@prisma/client'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'

const MAX_LIMIT = 50

const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const priorityParam = searchParams.get('priority')
    const due = searchParams.get('due')
    const limitParam = searchParams.get('limit')
    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), MAX_LIMIT)
      : MAX_LIMIT

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const where: Prisma.TaskWhereInput = {
      workspaceId: auth.workspaceId,
      assigneeId: auth.user.userId,
    }

    if (statusParam && statusParam !== 'all' && VALID_STATUSES.includes(statusParam as (typeof VALID_STATUSES)[number])) {
      where.status = statusParam as ProjectTaskStatus
    }

    if (priorityParam && priorityParam !== 'all' && VALID_PRIORITIES.includes(priorityParam as (typeof VALID_PRIORITIES)[number])) {
      where.priority = priorityParam as Priority
    }

    if (due && due !== 'all') {
      switch (due) {
        case 'overdue':
          where.dueDate = { lt: today }
          break
        case 'due-soon': {
          const threeDaysFromNow = new Date(today)
          threeDaysFromNow.setDate(today.getDate() + 3)
          where.dueDate = {
            gte: today,
            lte: threeDaysFromNow,
          }
          break
        }
        case 'this-week': {
          const endOfWeek = new Date(today)
          endOfWeek.setDate(today.getDate() + 7)
          where.dueDate = {
            gte: today,
            lte: endOfWeek,
          }
          break
        }
        case 'this-month': {
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          where.dueDate = {
            gte: today,
            lte: endOfMonth,
          }
          break
        }
      }
    }

    const orderBy = [
      { dueDate: 'asc' as const },
      { priority: 'desc' as const },
      { createdAt: 'desc' as const },
    ]

    if (limit <= 10) {
      const tasks = await prisma.task.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          priority: true,
          projectId: true,
          project: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
        orderBy,
        take: limit,
      })
      return NextResponse.json(tasks)
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        epic: {
          select: {
            id: true,
            title: true,
            color: true,
          },
        },
        milestone: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
          },
        },
        customFieldValues: {
          include: {
            field: {
              select: {
                id: true,
                label: true,
                type: true,
              },
            },
          },
        },
        _count: {
          select: {
            subtasks: true,
            comments: true,
          },
        },
      },
      orderBy,
      take: limit,
    })
    return NextResponse.json(tasks)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
