import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { getSeriesForUser } from '@/lib/one-on-ones/data.server'
import { prisma } from '@/lib/db'
import { SeriesCard } from '@/components/one-on-ones/series-card'
import { ScheduleDialog } from '@/components/one-on-ones/schedule-dialog'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export default async function OneOnOnesPage({ params }: Props) {
  const { workspaceSlug } = await params
  const auth = await getUnifiedAuth()

  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  setWorkspaceContext(auth.workspaceId)

  const [series, directReports] = await Promise.all([
    getSeriesForUser(auth.user.userId, auth.workspaceId),
    getDirectReportsForUser(auth.user.userId, auth.workspaceId),
  ])

  // Split into series where user is manager vs employee
  const asManager = series.filter((s) => s.managerId === auth.user.userId)
  const asEmployee = series.filter((s) => s.employeeId === auth.user.userId)

  // Direct reports that don't yet have a 1:1 series
  const existingEmployeeIds = new Set(asManager.map((s) => s.employeeId))
  const availableReports = directReports.filter(
    (r) => !existingEmployeeIds.has(r.id)
  )

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-foreground">1:1 Meetings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Recurring one-on-one meetings with your team
              </p>
            </div>
            {directReports.length > 0 && (
              <ScheduleDialog
                directReports={availableReports}
                workspaceSlug={workspaceSlug}
              />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* As Manager */}
        {asManager.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Your Direct Reports
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {asManager.map((s) => (
                <SeriesCard
                  key={s.id}
                  series={JSON.parse(JSON.stringify(s))}
                  currentUserId={auth.user.userId}
                  workspaceSlug={workspaceSlug}
                />
              ))}
            </div>
          </section>
        )}

        {/* As Employee */}
        {asEmployee.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Your 1:1 with Your Manager
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {asEmployee.map((s) => (
                <SeriesCard
                  key={s.id}
                  series={JSON.parse(JSON.stringify(s))}
                  currentUserId={auth.user.userId}
                  workspaceSlug={workspaceSlug}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {series.length === 0 && (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-1">
              No 1:1 Meetings Yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              {directReports.length > 0
                ? 'Schedule your first 1:1 meeting with a direct report to get started.'
                : 'Once your manager sets up a 1:1 series with you, it will appear here.'}
            </p>
            {directReports.length > 0 && (
              <ScheduleDialog
                directReports={availableReports}
                workspaceSlug={workspaceSlug}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Get direct reports for a user via OrgPosition hierarchy.
 */
async function getDirectReportsForUser(userId: string, workspaceId: string) {
  const managerPosition = await prisma.orgPosition.findFirst({
    where: {
      userId,
      workspaceId,
      isActive: true,
    },
    select: { id: true },
  })

  if (!managerPosition) return []

  const reports = await prisma.orgPosition.findMany({
    where: {
      parentId: managerPosition.id,
      workspaceId,
      isActive: true,
      userId: { not: null },
    },
    select: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  })

  return reports
    .filter((r): r is typeof r & { user: NonNullable<typeof r.user> } => r.user !== null)
    .map((r) => r.user)
}
