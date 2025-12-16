import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const due = searchParams.get('due')

    const where: any = {
      assigneeId: session.user.id,
    }

    // Apply status filter
    if (status && status !== 'all') {
      where.status = status
    }

    // Apply priority filter
    if (priority && priority !== 'all') {
      where.priority = priority
    }

    // Apply due date filter
    if (due && due !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (due) {
        case 'overdue':
          where.dueDate = {
            lt: today.toISOString().split('T')[0]
          }
          break
        case 'due-soon':
          const threeDaysFromNow = new Date(today)
          threeDaysFromNow.setDate(today.getDate() + 3)
          where.dueDate = {
            gte: today.toISOString().split('T')[0],
            lte: threeDaysFromNow.toISOString().split('T')[0]
          }
          break
        case 'this-week':
          const endOfWeek = new Date(today)
          endOfWeek.setDate(today.getDate() + 7)
          where.dueDate = {
            gte: today.toISOString().split('T')[0],
            lte: endOfWeek.toISOString().split('T')[0]
          }
          break
        case 'this-month':
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          where.dueDate = {
            gte: today.toISOString().split('T')[0],
            lte: endOfMonth.toISOString().split('T')[0]
          }
          break
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        epic: {
          select: {
            id: true,
            title: true,
            color: true
          }
        },
        milestone: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true
          }
        },
        customFields: {
          include: {
            field: {
              select: {
                id: true,
                label: true,
                type: true
              }
            }
          }
        },
        _count: {
          select: {
            subtasks: true,
            comments: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching my tasks:', error)
    return NextResponse.json({
      error: 'Failed to fetch tasks',
      details: error.message
    }, { status: 500 })
  }
}
