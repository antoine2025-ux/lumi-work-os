import { notFound } from 'next/navigation'
import Link from 'next/link'
import { assertPlatformAdmin } from '@/lib/platform-admin-auth'
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
import { TabsContent } from '@/components/ui/tabs'
import { OpsToolbar, TimeRange } from './components/ops-toolbar'
import { OpsTabs, TabType } from './components/ops-tabs'
import { OverviewTab } from './components/overview-tab'
import { PerformanceTab } from './components/performance-tab'
import { ErrorsTab } from './components/errors-tab'
import { ScaleTab } from './components/scale-tab'
import { AiCostTab } from './components/ai-cost-tab'
import { OpsWorkspace } from './components/ops-workspace-select'

/**
 * Ops Console - Platform Admin Monitoring Dashboard
 * 
 * Access: Platform administrators only (User.isPlatformAdmin = true)
 * Returns 404 if unauthorized (not "access denied") for security
 */
export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ route?: string; tab?: string; range?: string; fingerprint?: string; workspace?: string }>
}) {
  try {
    const params = await searchParams
    const routeFilter = params.route ? decodeURIComponent(params.route) : null
    const fingerprintFilter = params.fingerprint ? decodeURIComponent(params.fingerprint) : null
    const tab = (params.tab as TabType) || 'overview'
    const range = (params.range as TimeRange) || (tab === 'overview' ? '24h' : '1h')
    const workspaceParam = params.workspace || null

    // Assert platform admin access - throws 404 if not authorized
    await assertPlatformAdmin()

    // Fetch all workspaces for the dropdown (admin is authorized to view all)
    const allWorkspaces = await prisma.workspace.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    })

    const workspaces: OpsWorkspace[] = allWorkspaces

    // Validate workspace param - if invalid, default to "all" (null)
    let selectedWorkspaceId: string | null = null
    if (workspaceParam) {
      const workspaceExists = workspaces.some(w => w.id === workspaceParam)
      if (workspaceExists) {
        selectedWorkspaceId = workspaceParam
      } else {
        // Invalid workspace ID - log warning and default to all
        console.warn(`[Ops] Invalid workspace ID in URL: ${workspaceParam}`)
      }
    }

    // If route filter is active, show drilldown view (special case, not in tabs)
    if (routeFilter) {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      const routeRequests = await prisma.opsEvent.findMany({
        where: {
          kind: 'REQUEST_TIMING',
          route: routeFilter,
          createdAt: { gte: oneHourAgo },
          ...(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {}),
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
        orderBy: { durationMs: 'desc' }, // Largest durations first
        take: 50,
      })

      return (
        <div className="container mx-auto p-6 space-y-6">
          <OpsToolbar 
            defaultRange={range} 
            workspaces={workspaces}
            currentWorkspaceId={selectedWorkspaceId}
          />
          
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Link href="/ops" className="text-muted-foreground hover:text-foreground">
                Ops Console
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-mono text-sm">{routeFilter}</span>
            </div>
            <h1 className="text-3xl font-bold">Route Drilldown</h1>
            <p className="text-muted-foreground mt-2">
              Last 50 requests for {routeFilter} (sorted by duration, largest first)
              {selectedWorkspaceId && ` in workspace ${workspaces.find(w => w.id === selectedWorkspaceId)?.name || selectedWorkspaceId}`}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Request Breakdown</CardTitle>
              <CardDescription>
                Detailed timing breakdown for each request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total (ms)</TableHead>
                    <TableHead>Auth (ms)</TableHead>
                    <TableHead>DB (ms)</TableHead>
                    <TableHead>Other (ms)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routeRequests.length > 0 ? (
                    routeRequests.map((request) => {
                      const authMs = request.authDurationMs ?? 0
                      const dbMs = request.dbDurationMs ?? 0
                      const totalMs = request.durationMs ?? 0
                      const otherMs = totalMs - authMs - dbMs
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="text-sm">
                            {new Date(request.createdAt).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>{request.method || 'N/A'}</TableCell>
                          <TableCell>{request.status || 'N/A'}</TableCell>
                          <TableCell className="font-mono">{totalMs}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{authMs}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{dbMs}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{otherMs}</TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No requests found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Main tabbed view
    return (
      <div className="container mx-auto p-6 space-y-6">
        <OpsToolbar 
          defaultRange={range} 
          workspaces={workspaces}
          currentWorkspaceId={selectedWorkspaceId}
        />
        
        <OpsTabs defaultTab={tab}>
          <OverviewTab range={range} workspaceId={selectedWorkspaceId} />
          
          <PerformanceTab range={range} workspaceId={selectedWorkspaceId} />
          
          <ErrorsTab range={range} fingerprintFilter={fingerprintFilter} workspaceId={selectedWorkspaceId} />
          
          <TabsContent value="scale" className="mt-6">
            <ScaleTab workspaceId={selectedWorkspaceId} />
          </TabsContent>
          
          <AiCostTab range={range} workspaceId={selectedWorkspaceId} />
        </OpsTabs>
      </div>
    )
  } catch {
    // If auth fails or any error, return 404
    notFound()
  }
}
