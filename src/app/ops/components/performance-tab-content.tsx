// @ts-nocheck
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Health Status Thresholds
 */
const THRESHOLDS = {
  bootstrap: {
    p50: { good: 200, watch: 500 },
    p95: { good: 800, watch: 1500 },
  },
  endpoint: {
    p95: { good: 500, watch: 1200 },
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

function interpretLatency(stats: {
  p50: number | null
  p95: number | null
  max: number | null
  count: number
}): string {
  if (stats.count === 0) return 'No data available'
  
  const { p50, p95, max, count } = stats
  
  // P50 low but P95 high → tail latency
  if (p50 !== null && p95 !== null && p50 < p95 * 0.5) {
    return 'Tail latency: cold starts, DB connections, or occasional heavy workspace.'
  }
  
  // Both high → consistently slow
  if (p50 !== null && p50 > 500 && p95 !== null && p95 > 1200) {
    return 'Consistently slow: query shape or missing indexes.'
  }
  
  // Max huge and count low → outlier
  if (max !== null && count < 10 && max > (p95 || 0) * 2) {
    return 'Outlier spike: investigate one request.'
  }
  
  return 'Performance within normal range.'
}

type TimeRange = '15m' | '1h' | '24h' | '7d'

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

interface PerformanceTabContentProps {
  range: TimeRange
  workspaceId?: string | null
}

export async function PerformanceTabContent({ range, workspaceId }: PerformanceTabContentProps) {
  const timeWindow = getTimeWindow(range)
  const now = new Date()
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)

  // Build workspace filter for OpsEvent queries
  const workspaceFilter = workspaceId ? { workspaceId } : {}

  // Fetch data in parallel
  const [
    bootstrapEvents,
    requestTimingEvents,
    clientErrors,
    recentRequests,
  ] = await Promise.all([
    // Bootstrap performance
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
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),

    // All request timing events for slowest endpoints
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
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),

    // Client errors
    prisma.opsEvent.findMany({
      where: {
        kind: 'CLIENT_ERROR',
        createdAt: { gte: timeWindow },
        ...workspaceFilter,
      },
      select: {
        id: true,
        createdAt: true,
        route: true,
        meta: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),

    // Recent requests (last 15 min) - include breakdown
    prisma.opsEvent.findMany({
      where: {
        kind: 'REQUEST_TIMING',
        createdAt: { gte: fifteenMinutesAgo },
        ...workspaceFilter,
      },
      select: {
        id: true,
        createdAt: true,
        route: true,
        method: true,
        status: true,
        durationMs: true,
        authDurationMs: true,
        dbDurationMs: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
  ])

  // Calculate bootstrap metrics
  const bootstrapDurations = bootstrapEvents
    .map(e => e.durationMs)
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b)
  
  const bootstrapP50 = bootstrapDurations.length > 0
    ? bootstrapDurations[Math.floor(bootstrapDurations.length * 0.5)]
    : null
  const bootstrapP95 = bootstrapDurations.length > 0
    ? bootstrapDurations[Math.floor(bootstrapDurations.length * 0.95)]
    : null
  const bootstrapMax = bootstrapDurations.length > 0
    ? bootstrapDurations[bootstrapDurations.length - 1]
    : null
  const bootstrapCount = bootstrapDurations.length

  // Health status for bootstrap
  const bootstrapP50Status = getHealthStatus(bootstrapP50, THRESHOLDS.bootstrap.p50)
  const bootstrapP95Status = getHealthStatus(bootstrapP95, THRESHOLDS.bootstrap.p95)

  // Bootstrap interpretation
  const bootstrapInterpretation = interpretLatency({
    p50: bootstrapP50,
    p95: bootstrapP95,
    max: bootstrapMax,
    count: bootstrapCount,
  })

  // Calculate slowest endpoints with full stats
  const endpointStats = new Map<string, number[]>()
  for (const event of requestTimingEvents) {
    if (event.route && event.durationMs !== null) {
      const durations = endpointStats.get(event.route) || []
      durations.push(event.durationMs)
      endpointStats.set(event.route, durations)
    }
  }

  const slowestEndpoints = Array.from(endpointStats.entries())
    .map(([route, durations]) => {
      const sorted = durations.sort((a, b) => a - b)
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const p50 = sorted[Math.floor(sorted.length * 0.5)]
      const p95 = sorted[Math.floor(sorted.length * 0.95)]
      const max = sorted[sorted.length - 1]
      const status = getHealthStatus(p95, THRESHOLDS.endpoint.p95)
      const interpretation = interpretLatency({
        p50,
        p95,
        max,
        count: durations.length,
      })
      return { 
        route, 
        avg: Math.round(avg), 
        p50: Math.round(p50),
        p95: Math.round(p95),
        max: Math.round(max),
        count: durations.length,
        status,
        interpretation,
      }
    })
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10)

  const isLoggingEnabled = process.env.OPS_LOGGING_ENABLED === 'true'
  const hasNoData = bootstrapCount === 0 && requestTimingEvents.length === 0

  return (
    <div className="space-y-6">
      {/* Warning if logging is disabled */}
      {!isLoggingEnabled && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-yellow-600">Ops Logging Disabled</CardTitle>
            <CardDescription>
              Performance metrics are not being collected. Enable logging by setting <code className="text-xs bg-muted px-1 py-0.5 rounded">OPS_LOGGING_ENABLED=true</code> in your environment variables.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Info if no data but logging is enabled */}
      {isLoggingEnabled && hasNoData && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-blue-600">No Data Available</CardTitle>
            <CardDescription>
              No performance data found for the selected time range ({range}). Try:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Select a longer time range (24h or 7d)</li>
                <li>Navigate through the app to generate API requests</li>
                <li>Wait a few moments and refresh</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Bootstrap Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bootstrap Performance</CardTitle>
              <CardDescription>
                Performance metrics for /api/dashboard/bootstrap (last {range})
              </CardDescription>
            </div>
            {bootstrapCount > 0 && (
              <div className="flex gap-2">
                <Badge className={getHealthBadgeClassName(bootstrapP50Status)}>
                  P50: {bootstrapP50Status}
                </Badge>
                <Badge className={getHealthBadgeClassName(bootstrapP95Status)}>
                  P95: {bootstrapP95Status}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {bootstrapCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No bootstrap data available for the selected time range.</p>
              <p className="text-sm mt-2">Visit the dashboard to generate bootstrap requests.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">P50</div>
                  <div className="text-2xl font-bold">
                    {bootstrapP50 !== null ? `${bootstrapP50}ms` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">P95</div>
                  <div className="text-2xl font-bold">
                    {bootstrapP95 !== null ? `${bootstrapP95}ms` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Max</div>
                  <div className="text-2xl font-bold">
                    {bootstrapMax !== null ? `${bootstrapMax}ms` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Count</div>
                  <div className="text-2xl font-bold">{bootstrapCount}</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground border-t pt-4">
                <strong>Tail Analysis:</strong> P50: {bootstrapP50 ?? 'N/A'}ms | P95: {bootstrapP95 ?? 'N/A'}ms | Max: {bootstrapMax ?? 'N/A'}ms | Count: {bootstrapCount}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {bootstrapInterpretation}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Slowest Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Slowest Endpoints</CardTitle>
          <CardDescription>
            Average and P95 duration by route (last {range})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {slowestEndpoints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No endpoint data available for the selected time range.</p>
              <p className="text-sm mt-2">Navigate through the app to generate API requests.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Avg (ms)</TableHead>
                    <TableHead>P50 (ms)</TableHead>
                    <TableHead>P95 (ms)</TableHead>
                    <TableHead>Max (ms)</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowestEndpoints.map((endpoint) => (
                    <TableRow key={endpoint.route}>
                      <TableCell className="font-mono text-sm">
                        <Link 
                          href={`/ops?tab=performance&route=${encodeURIComponent(endpoint.route)}`}
                          className="text-blue-500 hover:text-blue-700 hover:underline"
                        >
                          {endpoint.route}
                        </Link>
                      </TableCell>
                      <TableCell>{endpoint.avg}</TableCell>
                      <TableCell>{endpoint.p50}</TableCell>
                      <TableCell>{endpoint.p95}</TableCell>
                      <TableCell>{endpoint.max}</TableCell>
                      <TableCell>{endpoint.count}</TableCell>
                      <TableCell>
                        <Badge className={getHealthBadgeClassName(endpoint.status)}>
                          {endpoint.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {slowestEndpoints.length > 0 && (
                <div className="mt-4 space-y-2">
                  {slowestEndpoints.map((endpoint) => (
                    <div key={endpoint.route} className="text-sm">
                      <div className="font-mono text-xs text-muted-foreground mb-1">
                        {endpoint.route}
                      </div>
                      <div className="text-muted-foreground">
                        {endpoint.interpretation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Client Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Client Errors</CardTitle>
          <CardDescription>
            Client-side errors reported from browsers (last {range})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientErrors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No client errors reported in the selected time range.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientErrors.map((error) => {
                  const meta = error.meta as { message?: string } | null
                  const message = meta?.message || 'Unknown error'
                  const truncatedMessage = message.length > 100 
                    ? message.substring(0, 100) + '...' 
                    : message
                  return (
                    <TableRow key={error.id}>
                      <TableCell className="text-sm">
                        {new Date(error.createdAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {error.route || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {truncatedMessage}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests (Last 15 Minutes)</CardTitle>
          <CardDescription>
            Latest API request timing data with breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent requests in the last 15 minutes.</p>
              <p className="text-sm mt-2">Navigate through the app to generate API requests.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total (ms)</TableHead>
                  <TableHead>Auth (ms)</TableHead>
                  <TableHead>DB (ms)</TableHead>
                  <TableHead>Other (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.map((request) => {
                  const authMs = request.authDurationMs ?? 0
                  const dbMs = request.dbDurationMs ?? 0
                  const totalMs = request.durationMs ?? 0
                  const otherMs = totalMs - authMs - dbMs
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="text-sm">
                        {new Date(request.createdAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {request.route || 'N/A'}
                      </TableCell>
                      <TableCell>{request.method || 'N/A'}</TableCell>
                      <TableCell>{request.status || 'N/A'}</TableCell>
                      <TableCell className="font-mono">{totalMs}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{authMs}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{dbMs}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{otherMs}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

