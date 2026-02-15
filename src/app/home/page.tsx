import { getUnifiedAuth } from '@/lib/unified-auth'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { getUserCapacity } from '@/lib/org/capacity/get-user-capacity'
import { getTodayWindow } from '@/lib/datetime'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const auth = await getUnifiedAuth()
  setWorkspaceContext(auth.workspaceId)

  // Get user timezone for todo filtering
  const user = await prisma.user.findUnique({
    where: { id: auth.user.userId },
    select: { timezone: true, name: true, email: true },
  })
  const userTimezone = user?.timezone || null

  // Compute today's start for overdue task filtering
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Load all data in parallel
  const [capacity, myTasks, myProjects, directReportLinks, recentPages, todos, taskStatusCounts, overdueTaskCount] = await Promise.all([
    // 1. User capacity utilization
    getUserCapacity(auth.user.userId, auth.workspaceId),

    // 2. My tasks (where I'm assigned)
    prisma.task.findMany({
      where: {
        workspaceId: auth.workspaceId,
        assigneeId: auth.user.userId,
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        projectId: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    }),

    // 3. My projects (where I'm owner or member)
    prisma.project.findMany({
      where: {
        workspaceId: auth.workspaceId,
        OR: [
          { ownerId: auth.user.userId },
          {
            members: {
              some: {
                userId: auth.user.userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        ownerId: true,
        updatedAt: true,
        members: {
          where: { userId: auth.user.userId },
          select: { role: true },
        },
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),

    // 4. Manager links (for pending approvals)
    prisma.personManagerLink.findMany({
      where: {
        managerId: auth.user.userId,
        workspaceId: auth.workspaceId,
      },
      select: { personId: true },
    }),

    // 5. Recent wiki pages
    prisma.wikiPage.findMany({
      where: {
        workspaceId: auth.workspaceId,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),

    // 6. Today's todos
    (async () => {
      const todayWindow = getTodayWindow(userTimezone)
      return prisma.todo.findMany({
        where: {
          workspaceId: auth.workspaceId,
          assignedToId: auth.user.userId,
          status: 'OPEN',
          dueAt: { lte: todayWindow.end },
        },
        select: {
          id: true,
          title: true,
          status: true,
          dueAt: true,
        },
        orderBy: [
          { dueAt: 'asc' },
          { createdAt: 'desc' },
        ],
        take: 50,
      })
    })(),

    // 7. Task status counts (for dashboard gauges)
    prisma.task.groupBy({
      by: ['status'],
      where: {
        workspaceId: auth.workspaceId,
        assigneeId: auth.user.userId,
      },
      _count: true,
    }),

    // 8. Overdue task count
    prisma.task.count({
      where: {
        workspaceId: auth.workspaceId,
        assigneeId: auth.user.userId,
        dueDate: { lt: todayStart },
        status: { notIn: ['DONE'] },
      },
    }),
  ])

  // Load pending approvals if user is a manager
  const reportPersonIds = directReportLinks.map((l) => l.personId)
  const pendingApprovals =
    reportPersonIds.length > 0
      ? await prisma.leaveRequest.findMany({
          where: {
            personId: { in: reportPersonIds },
            status: 'PENDING',
            workspaceId: auth.workspaceId,
          },
          select: {
            id: true,
            personId: true,
            leaveType: true,
            startDate: true,
            endDate: true,
          },
          orderBy: { createdAt: 'asc' },
          take: 5,
        })
      : []

  // Categorize tasks
  const now = new Date()
  const overdueTasks = myTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
  )
  const todoTasks = myTasks.filter((t) => t.status === 'TODO')
  const inProgressTasks = myTasks.filter((t) => t.status === 'IN_PROGRESS')
  const doneTasks = myTasks.filter((t) => t.status === 'DONE')

  // Build task summary from groupBy results
  const statusCountMap: Record<string, number> = {}
  for (const row of taskStatusCounts) {
    statusCountMap[row.status] = row._count
  }

  const taskSummary = {
    total: Object.values(statusCountMap).reduce((a, b) => a + b, 0),
    todo: statusCountMap['TODO'] || 0,
    inProgress: statusCountMap['IN_PROGRESS'] || 0,
    done: statusCountMap['DONE'] || 0,
    overdue: overdueTaskCount,
  }

  // Add userRole to projects and fix types
  const projectsWithRole = myProjects.map((p) => ({
    ...p,
    ownerId: p.ownerId ?? undefined,
    userRole:
      p.ownerId === auth.user.userId
        ? ('OWNER' as const)
        : (p.members[0]?.role as 'ADMIN' | 'MEMBER' | 'VIEWER' | undefined),
  }))

  // Get workspace for slug
  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: { slug: true },
  })

  const workspaceSlug = workspace?.slug || 'default'

  return (
    <DashboardClient
      user={{
        userId: auth.user.userId,
        name: user?.name || undefined,
        email: user?.email || auth.user.email,
      }}
      workspaceSlug={workspaceSlug}
      capacity={capacity}
      tasks={{
        overdue: overdueTasks,
        todo: todoTasks,
        inProgress: inProgressTasks,
        done: doneTasks,
        total: myTasks.length,
      }}
      projects={projectsWithRole}
      pendingApprovals={pendingApprovals}
      recentPages={recentPages}
      taskSummary={taskSummary}
      todos={todos}
    />
  )
}
