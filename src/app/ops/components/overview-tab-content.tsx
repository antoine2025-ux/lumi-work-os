import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TimeRange } from './ops-toolbar'

/**
 * Health Status Thresholds
 */
const THRESHOLDS = {
  bootstrap: {
    p50: { good: 200, watch: 500 },
    p95: { good: 800, watch: 1500 },
  },
} as const

type HealthStatus = 'GOOD' | 'WATCH' | 'BAD'

function getHealthStatus(value: number | null, thresholds: { good: number; watch: number }): HealthStatus {
  if (value === null) return 'WATCH'
  if (value < thresholds.good) return 'GOOD'
  if (value < thresholds.watch) return 'WATCH'
  return 'BAD'
}

function getHealthBadgeClassName(status: HealthStatus): string {
  switch (status) {
    case 'GOOD':
      return 'bg-green-500/10 text-green-600 border-green-500/20'
    case 'WATCH':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    case 'BAD':
      return 'bg-red-500/10 text-red-600 border-red-500/20'
  }
}

function getTimeWindow(range: TimeRange): Date {
  const now = new Date()
  const ms = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  }[range]
  return new Date(now.getTime() - ms)
}

function calculatePercentile(values: number[], percentile: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.floor(sorted.length * percentile)
  return sorted[index]
}

interface OverviewTabContentProps {
  range: TimeRange
  workspaceId?: string | null
}

export async function OverviewTabContent({ range, workspaceId }: OverviewTabContentProps) {
  const timeWindow = getTimeWindow(range)
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Build workspace filter for OpsEvent queries
  const workspaceFilter = workspaceId ? { workspaceId } : {}

  // Fetch all data in parallel
  const [
    workspaceCount,
    userCount,
    activeUsers24h,
    activeUsers7d,
    requestCount,
    errorCount,
    bootstrapEvents,
    allRouteEvents,
  ] = await Promise.all([
    // 1. Total workspaces count (only when viewing all workspaces)
    workspaceId ? Promise.resolve(1) : prisma.workspace.count(),

    // 2. Total users count (scoped to workspace members if workspace selected)
    workspaceId
      ? prisma.workspaceMember.count({ where: { workspaceId } })
      : prisma.user.count(),

    // 3. Active users (24h) - users with ops events in last 24h
    prisma.opsEvent.findMany({
      where: {
        createdAt: { gte: timeWindow },
        userId: { not: null },
        ...workspaceFilter,
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
      take: 1000, // Limit to prevent memory issues
    }),

    // 4. Active users (7d) - users with ops events in last 7 days
    prisma.opsEvent.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        userId: { not: null },
        ...workspaceFilter,
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
      take: 1000, // Limit to prevent memory issues
    }),

    // 5. Requests count (ops events of kind REQUEST_TIMING)
    prisma.opsEvent.count({
      where: {
        kind: 'REQUEST_TIMING',
        createdAt: { gte: timeWindow },
        ...workspaceFilter,
      },
    }),

    // 6. Error count (client errors)
    prisma.opsEvent.count({
      where: {
        kind: 'CLIENT_ERROR',
        createdAt: { gte: timeWindow },
        ...workspaceFilter,
      },
    }),

    // 7. Bootstrap events for P50/P95
    prisma.opsEvent.findMany({
      where: {
        kind: 'REQUEST_TIMING',
        route: '/api/dashboard/bootstrap',
        createdAt: { gte: timeWindow },
        ...workspaceFilter,
      },
      select: {
        durationMs: true,
      },
      take: 500,
    }),

    // 8. All route events for top slow route
    prisma.opsEvent.findMany({
      where: {
        kind: 'REQUEST_TIMING',
        createdAt: { gte: timeWindow },
        route: { not: null },
        ...workspaceFilter,
      },
      select: {
        route: true,
        durationMs: true,
      },
      take: 500,
    }),
  ])

  // Calculate active user counts (unique user IDs)
  const activeUsers24hCount = new Set(activeUsers24h.map(e => e.userId).filter((id): id is string => id !== null)).size
  const activeUsers7dCount = new Set(activeUsers7d.map(e => e.userId).filter((id): id is string => id !== null)).size

  // Calculate bootstrap metrics
  const bootstrapDurations = bootstrapEvents
    .map(e => e.durationMs)
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b)
  
  const bootstrapP50 = calculatePercentile(bootstrapDurations, 0.5)
  const bootstrapP95 = calculatePercentile(bootstrapDurations, 0.95)

  // Health status for bootstrap
  const bootstrapP50Status = getHealthStatus(bootstrapP50, THRESHOLDS.bootstrap.p50)
  const bootstrapP95Status = getHealthStatus(bootstrapP95, THRESHOLDS.bootstrap.p95)

  // Calculate top slow route (by P95)
  const routeStats = new Map<string, number[]>()
  for (const event of allRouteEvents) {
    if (event.route && event.durationMs !== null) {
      const durations = routeStats.get(event.route) || []
      durations.push(event.durationMs)
      routeStats.set(event.route, durations)
    }
  }

  const routeP95s = Array.from(routeStats.entries())
    .map(([route, durations]) => {
      const sorted = durations.sort((a, b) => a - b)
      const p95 = calculatePercentile(sorted, 0.95)
      return { route, p95: p95 || 0 }
    })
    .filter(r => r.p95 > 0)
    .sort((a, b) => b.p95 - a.p95)

  const topSlowRoute = routeP95s.length > 0 ? routeP95s[0] : null
  const topSlowRouteStatus = topSlowRoute 
    ? getHealthStatus(topSlowRoute.p95, { good: 500, watch: 1200 })
    : null

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{workspaceCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{userCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeUsers24hCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeUsers7dCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{requestCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Last {range}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{errorCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Last {range}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bootstrap P50</CardTitle>
              <Badge className={getHealthBadgeClassName(bootstrapP50Status)}>
                {bootstrapP50Status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {bootstrapP50 !== null ? `${bootstrapP50}ms` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last {range}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bootstrap P95</CardTitle>
              <Badge className={getHealthBadgeClassName(bootstrapP95Status)}>
                {bootstrapP95Status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {bootstrapP95 !== null ? `${bootstrapP95}ms` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last {range}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Slow Route */}
      {topSlowRoute && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Slow Route</CardTitle>
                <CardDescription>
                  Route with highest P95 duration in the selected time range
                </CardDescription>
              </div>
              {topSlowRouteStatus && (
                <Badge className={getHealthBadgeClassName(topSlowRouteStatus)}>
                  {topSlowRouteStatus}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Route</div>
                <div className="font-mono text-lg font-semibold">{topSlowRoute.route}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">P95 Duration</div>
                <div className="text-2xl font-bold">{Math.round(topSlowRoute.p95)}ms</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

