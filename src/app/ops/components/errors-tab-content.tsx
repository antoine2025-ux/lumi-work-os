import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TimeRange } from './ops-toolbar'

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

interface ErrorFingerprint {
  fingerprint: string
  message: string
  count: number
  firstSeen: Date
  lastSeen: Date
  topRoutes: string[]
}

interface ErrorTabContentProps {
  range: TimeRange
  fingerprintFilter?: string
  workspaceId?: string | null
}

export async function ErrorsTabContent({ range, fingerprintFilter, workspaceId }: ErrorTabContentProps) {
  const timeWindow = getTimeWindow(range)

  // Build workspace filter for OpsEvent queries
  const workspaceFilter = workspaceId ? { workspaceId } : {}

  // If fingerprint filter is active, show drilldown view
  if (fingerprintFilter) {
    const decodedFingerprint = decodeURIComponent(fingerprintFilter)
    
    // Fetch all errors matching this fingerprint
    const errors = await prisma.opsEvent.findMany({
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
    })

    // Filter to only errors matching the fingerprint
    const matchingErrors = errors.filter((error) => {
      const meta = error.meta as { message?: string } | null
      const message = meta?.message || 'Unknown error'
      const fingerprint = message.substring(0, 120)
      return fingerprint === decodedFingerprint
    }).slice(0, 50) // Limit to last 50

    return (
      <div className="space-y-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/ops?tab=errors" className="text-muted-foreground hover:text-foreground">
              Errors
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-sm truncate max-w-md">{decodedFingerprint}</span>
          </div>
          <h2 className="text-2xl font-bold">Error Details</h2>
          <p className="text-muted-foreground mt-2">
            Last 50 error events for this fingerprint (last {range})
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Error Events</CardTitle>
            <CardDescription>
              Raw error events matching this fingerprint
            </CardDescription>
          </CardHeader>
          <CardContent>
            {matchingErrors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No error events found for this fingerprint.</p>
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
                  {matchingErrors.map((error) => {
                    const meta = error.meta as { message?: string; stack?: string } | null
                    const message = meta?.message || 'Unknown error'
                    const truncatedMessage = message.length > 200 
                      ? message.substring(0, 200) + '...' 
                      : message
                    return (
                      <TableRow key={error.id}>
                        <TableCell className="text-sm">
                          {new Date(error.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {error.route || 'N/A'}
                        </TableCell>
                        <TableCell className="max-w-2xl">
                          <div className="space-y-1">
                            <div className="truncate">{truncatedMessage}</div>
                            {meta?.stack && (
                              <details className="text-xs text-muted-foreground">
                                <summary className="cursor-pointer hover:text-foreground">
                                  Stack trace
                                </summary>
                                <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                                  {meta.stack.substring(0, 2000)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </TableCell>
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

  // Main fingerprint view
  const errors = await prisma.opsEvent.findMany({
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
  })

  // Group errors by fingerprint (first 120 chars of message)
  const fingerprintMap = new Map<string, {
    message: string
    errors: Array<{ createdAt: Date; route: string | null }>
  }>()

  for (const error of errors) {
    const meta = error.meta as { message?: string } | null
    const message = meta?.message || 'Unknown error'
    const fingerprint = message.substring(0, 120)
    
    if (!fingerprintMap.has(fingerprint)) {
      fingerprintMap.set(fingerprint, {
        message: message.length > 120 ? message.substring(0, 120) + '...' : message,
        errors: [],
      })
    }
    
    fingerprintMap.get(fingerprint)!.errors.push({
      createdAt: error.createdAt,
      route: error.route,
    })
  }

  // Convert to array and calculate aggregates
  const fingerprints: ErrorFingerprint[] = Array.from(fingerprintMap.entries())
    .map(([fingerprint, data]) => {
      const routes = data.errors
        .map(e => e.route)
        .filter((r): r is string => r !== null)
      
      // Count route occurrences
      const routeCounts = new Map<string, number>()
      for (const route of routes) {
        routeCounts.set(route, (routeCounts.get(route) || 0) + 1)
      }
      
      // Get top 3 routes
      const topRoutes = Array.from(routeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([route]) => route)

      const timestamps = data.errors.map(e => e.createdAt.getTime())
      return {
        fingerprint,
        message: data.message,
        count: data.errors.length,
        firstSeen: new Date(Math.min(...timestamps)),
        lastSeen: new Date(Math.max(...timestamps)),
        topRoutes,
      }
    })
    .sort((a, b) => b.count - a.count) // Sort by count descending

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Fingerprints</CardTitle>
          <CardDescription>
            Client-side errors grouped by message fingerprint (last {range})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fingerprints.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No errors found</p>
              <p className="text-sm mt-2">
                No client-side errors reported in the selected time range.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>First Seen</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Top Routes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fingerprints.map((fp) => (
                  <TableRow key={fp.fingerprint}>
                    <TableCell className="max-w-md">
                      <Link
                        href={`/ops?tab=errors&fingerprint=${encodeURIComponent(fp.fingerprint)}`}
                        className="text-blue-500 hover:text-blue-700 hover:underline font-mono text-sm"
                      >
                        {fp.message}
                      </Link>
                    </TableCell>
                    <TableCell className="font-semibold">{fp.count}</TableCell>
                    <TableCell className="text-sm">
                      {fp.firstSeen.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {fp.lastSeen.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {fp.topRoutes.length > 0 ? (
                          fp.topRoutes.map((route) => (
                            <span
                              key={route}
                              className="font-mono text-xs bg-muted px-2 py-1 rounded"
                            >
                              {route}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

