import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Hash/shorten workspace ID for safe display (no PII)
 */
function hashWorkspaceId(id: string): string {
  // Show first 8 chars + last 4 chars
  if (id.length <= 12) return id.substring(0, 8)
  return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`
}

interface ScaleTabContentProps {
  workspaceId?: string | null
}

export async function ScaleTabContent({ workspaceId }: ScaleTabContentProps) {
  // Build workspace filter for queries that support it
  const workspaceFilter = workspaceId ? { workspaceId } : {}

  // Fetch all totals in parallel
  const [
    workspaceCount,
    userCount,
    projectCount,
    todoCount,
    wikiPageCount,
    taskCount,
  ] = await Promise.all([
    // Workspace count - 1 if filtering, otherwise total
    workspaceId ? Promise.resolve(1) : prisma.workspace.count(),
    
    // User count - workspace members if filtering, otherwise total users
    workspaceId 
      ? prisma.workspaceMember.count({ where: { workspaceId } })
      : prisma.user.count(),
    
    // Project count - scoped to workspace if filtering
    prisma.project.count({ where: workspaceFilter }),
    
    // Todo count - scoped to workspace if filtering
    prisma.todo.count({ where: workspaceFilter }),
    
    // Wiki pages - scoped to workspace if filtering
    prisma.wikiPage.count({ where: workspaceFilter }),
    
    // Tasks - scoped to workspace if filtering
    prisma.task.count({ where: workspaceFilter }),
  ])

  // Only fetch "largest workspaces" when viewing all workspaces (global view)
  const showLargestWorkspaces = !workspaceId

  let largestByUsers = null
  let largestByTasks: { id: string; taskCount: number } | null = null
  let largestByPages = null
  let largestByProjects = null

  if (showLargestWorkspaces) {
    const [
      _largestByUsers,
      _largestByTasks,
      _largestByPages,
      _largestByProjects,
    ] = await Promise.all([
      // Largest by users (members)
      prisma.workspace.findFirst({
        select: {
          id: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          members: {
            _count: 'desc',
          },
        },
      }),

      // Largest by tasks - query tasks directly since they have workspaceId
      prisma.task.groupBy({
        by: ['workspaceId'],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 1,
      }).then(result => result.length > 0 ? {
        id: result[0].workspaceId,
        taskCount: result[0]._count.id,
      } : null),

      // Largest by wiki pages
      prisma.workspace.findFirst({
        select: {
          id: true,
          _count: {
            select: {
              wikiPages: true,
            },
          },
        },
        orderBy: {
          wikiPages: {
            _count: 'desc',
          },
        },
      }),

      // Largest by projects
      prisma.workspace.findFirst({
        select: {
          id: true,
          _count: {
            select: {
              projects: true,
            },
          },
        },
        orderBy: {
          projects: {
            _count: 'desc',
          },
        },
      }),
    ])

    largestByUsers = _largestByUsers
    largestByTasks = _largestByTasks
    largestByPages = _largestByPages
    largestByProjects = _largestByProjects
  }

  return (
    <div className="space-y-6">
      {/* Totals Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {workspaceId ? 'Workspace' : 'Workspaces'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{workspaceCount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {workspaceId ? 'Members' : 'Users'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{userCount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{projectCount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Todos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todoCount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wiki Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{wikiPageCount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{taskCount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Largest Workspaces - only shown in global view */}
      {showLargestWorkspaces && (
        <Card>
          <CardHeader>
            <CardTitle>Largest Workspaces</CardTitle>
            <CardDescription>
              Workspaces with the most resources across different dimensions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {largestByUsers && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="text-sm font-medium">By Users</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {hashWorkspaceId(largestByUsers.id)}
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {largestByUsers._count.members.toLocaleString()} users
                  </div>
                </div>
              )}

              {largestByTasks && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="text-sm font-medium">By Tasks</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {hashWorkspaceId(largestByTasks.id)}
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {largestByTasks.taskCount.toLocaleString()} tasks
                  </div>
                </div>
              )}

              {largestByPages && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="text-sm font-medium">By Wiki Pages</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {hashWorkspaceId(largestByPages.id)}
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {largestByPages._count.wikiPages.toLocaleString()} pages
                  </div>
                </div>
              )}

              {largestByProjects && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="text-sm font-medium">By Projects</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {hashWorkspaceId(largestByProjects.id)}
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {largestByProjects._count.projects.toLocaleString()} projects
                  </div>
                </div>
              )}

              {(!largestByUsers && !largestByTasks && !largestByPages && !largestByProjects) && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No workspace data available.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
