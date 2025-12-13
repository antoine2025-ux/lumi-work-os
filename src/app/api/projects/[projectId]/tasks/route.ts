import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertProjectAccess } from '@/lib/pm/guards'
import { ProjectRole } from '@prisma/client'
import { prisma } from '@/lib/db'


// GET /api/projects/[projectId]/tasks - Get tasks for a project with filtering
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const epicId = searchParams.get('epicId')
    const milestoneId = searchParams.get('milestoneId')
    const q = searchParams.get('q') // search query
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assigneeId = searchParams.get('assigneeId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // Get authenticated user from database
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Verify project access (VIEWER can see tasks)
    await assertProjectAccess(user, projectId, ProjectRole.VIEWER, auth.workspaceId)

    // Build where clause
    const where: any = {
      projectId
    }

    if (epicId) {
      where.epicId = epicId
    }

    if (milestoneId) {
      where.milestoneId = milestoneId
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (assigneeId) {
      where.assigneeId = assigneeId
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } }
      ]
    }

    // Get tasks with pagination
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
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
          subtasks: {
            select: {
              id: true,
              title: true,
              status: true,
              order: true
            },
            orderBy: {
              order: 'asc'
            }
          },
          comments: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 3 // Only get latest 3 comments
          },
          _count: {
            select: {
              subtasks: true,
              comments: true
            }
          }
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'desc' }
        ],
        skip: offset,
        take: limit
      }),
      prisma.task.count({ where })
    ])

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching project tasks:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch project tasks',
      details: error.message 
    }, { status: 500 })
  }
}
