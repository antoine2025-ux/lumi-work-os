import type { GoalLevel, GoalStatus } from '@prisma/client'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { getGoalsData, getGoalMetrics } from '@/lib/goals/data.server'
import { getCurrentQuarter } from '@/lib/goals/utils'
import { GoalsDashboard } from '@/components/goals/goals-dashboard'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ quarter?: string; level?: string; status?: string }>
}

export default async function GoalsPage({ params, searchParams }: Props) {
  const { workspaceSlug } = await params
  const filters = await searchParams
  
  const auth = await getUnifiedAuth()
  
  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  const currentQuarter = getCurrentQuarter()
  const quarter = filters.quarter || currentQuarter
  
  const [goals, metrics] = await Promise.all([
    getGoalsData(auth.workspaceId, {
      quarter,
      level: filters.level as GoalLevel | undefined,
      status: filters.status as GoalStatus | undefined,
    }),
    getGoalMetrics(auth.workspaceId, quarter),
  ])

  return (
    <div className="min-h-full bg-background">
      {/* Clean Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Goals & OKRs</h1>
              <p className="text-sm text-muted-foreground mt-1">Track progress toward organizational objectives</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        <GoalsDashboard
          goals={goals}
          metrics={metrics}
          currentUser={{
            userId: auth.user.userId,
            email: auth.user.email,
            name: auth.user.name,
          }}
          workspaceSlug={workspaceSlug}
          initialFilters={{
            quarter,
            level: filters.level,
            status: filters.status,
          }}
        />
      </div>
    </div>
  )
}
