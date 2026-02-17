// @ts-nocheck
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

/**
 * Hash/shorten ID for safe display (no PII)
 */
function hashId(id: string): string {
  if (id.length <= 12) return id.substring(0, 8)
  return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`
}

interface AiUsageMeta {
  feature?: string
  tokensIn?: number
  tokensOut?: number
  model?: string
  costUsd?: number
}

interface AiCostTabContentProps {
  range: TimeRange
  workspaceId?: string | null
}

export async function AiCostTabContent({ range, workspaceId }: AiCostTabContentProps) {
  const timeWindow = getTimeWindow(range)
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Build workspace filter for OpsEvent queries
  const workspaceFilter = workspaceId ? { workspaceId } : {}

  // Fetch AI usage events for different time windows
  const [
    aiEventsToday,
    aiEvents7d,
    aiEvents30d,
    aiEventsRange,
  ] = await Promise.all([
    // Today
    prisma.opsEvent.findMany({
      where: {
        kind: 'AI_USAGE',
        createdAt: { gte: todayStart },
        ...workspaceFilter,
      },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        meta: true,
      },
      take: 500,
    }),

    // Last 7 days
    prisma.opsEvent.findMany({
      where: {
        kind: 'AI_USAGE',
        createdAt: { gte: sevenDaysAgo },
        ...workspaceFilter,
      },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        meta: true,
      },
      take: 500,
    }),

    // Last 30 days
    prisma.opsEvent.findMany({
      where: {
        kind: 'AI_USAGE',
        createdAt: { gte: thirtyDaysAgo },
        ...workspaceFilter,
      },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        meta: true,
      },
      take: 500,
    }),

    // Selected range
    prisma.opsEvent.findMany({
      where: {
        kind: 'AI_USAGE',
        createdAt: { gte: timeWindow },
        ...workspaceFilter,
      },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        route: true,
        meta: true,
      },
      take: 500,
    }),
  ])

  // Helper to extract token counts from meta
  const getTokens = (meta: unknown): { in: number; out: number } => {
    const aiMeta = meta as AiUsageMeta | null
    return {
      in: aiMeta?.tokensIn || 0,
      out: aiMeta?.tokensOut || 0,
    }
  }

  // Calculate totals
  const totalToday = aiEventsToday.reduce((sum, event) => {
    const tokens = getTokens(event.meta)
    return sum + tokens.in + tokens.out
  }, 0)

  const total7d = aiEvents7d.reduce((sum, event) => {
    const tokens = getTokens(event.meta)
    return sum + tokens.in + tokens.out
  }, 0)

  const total30d = aiEvents30d.reduce((sum, event) => {
    const tokens = getTokens(event.meta)
    return sum + tokens.in + tokens.out
  }, 0)

  // Aggregate by user (for selected range)
  const userTokenCounts = new Map<string, number>()
  for (const event of aiEventsRange) {
    if (event.userId) {
      const tokens = getTokens(event.meta)
      const total = tokens.in + tokens.out
      userTokenCounts.set(
        event.userId,
        (userTokenCounts.get(event.userId) || 0) + total
      )
    }
  }

  const topUsers = Array.from(userTokenCounts.entries())
    .map(([userId, tokens]) => ({ userId, tokens }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 10)

  // Aggregate by workspace (for selected range)
  const workspaceTokenCounts = new Map<string, number>()
  for (const event of aiEventsRange) {
    if (event.workspaceId) {
      const tokens = getTokens(event.meta)
      const total = tokens.in + tokens.out
      workspaceTokenCounts.set(
        event.workspaceId,
        (workspaceTokenCounts.get(event.workspaceId) || 0) + total
      )
    }
  }

  const topWorkspaces = Array.from(workspaceTokenCounts.entries())
    .map(([workspaceId, tokens]) => ({ workspaceId, tokens }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 10)

  // Aggregate by feature (for selected range)
  const featureTokenCounts = new Map<string, number>()
  for (const event of aiEventsRange) {
    const aiMeta = event.meta as AiUsageMeta | null
    const feature = aiMeta?.feature || 'unknown'
    const tokens = getTokens(event.meta)
    const total = tokens.in + tokens.out
    featureTokenCounts.set(
      feature,
      (featureTokenCounts.get(feature) || 0) + total
    )
  }

  const topFeatures = Array.from(featureTokenCounts.entries())
    .map(([feature, tokens]) => ({ feature, tokens }))
    .sort((a, b) => b.tokens - a.tokens)

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalToday.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">tokens</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{total7d.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">tokens</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{total30d.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">tokens</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Token Users */}
      {topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Token Users</CardTitle>
            <CardDescription>
              Users with highest token usage (last {range})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Total Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-mono text-sm">
                      {hashId(user.userId)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {user.tokens.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Top Token Workspaces */}
      {topWorkspaces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Token Workspaces</CardTitle>
            <CardDescription>
              Workspaces with highest token usage (last {range})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace ID</TableHead>
                  <TableHead>Total Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topWorkspaces.map((workspace) => (
                  <TableRow key={workspace.workspaceId}>
                    <TableCell className="font-mono text-sm">
                      {hashId(workspace.workspaceId)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {workspace.tokens.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Per-Feature Breakdown */}
      {topFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per-Feature Breakdown</CardTitle>
            <CardDescription>
              Token usage by feature (last {range})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Total Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topFeatures.map((feature) => (
                  <TableRow key={feature.feature}>
                    <TableCell className="font-mono text-sm">
                      {feature.feature}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {feature.tokens.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {topUsers.length === 0 && topWorkspaces.length === 0 && topFeatures.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI & Cost</CardTitle>
            <CardDescription>
              AI token usage tracking and cost analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No AI usage data</p>
              <p className="text-sm mt-2">
                No AI usage events found in the selected time range. AI usage is logged when AI features are used (e.g., LoopBrain chat).
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

