import { getUnifiedAuth } from '@/lib/unified-auth'
import { getPerformanceCycles, getReviewsForUser, getDirectReportsForReview } from '@/lib/performance/data.server'
import { getUserWorkspaceRole } from '@/lib/auth/assertAccess'
import { redirect } from 'next/navigation'
import { PerformanceHome } from './performance-home'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export default async function PerformancePage({ params }: Props) {
  const { workspaceSlug } = await params
  const auth = await getUnifiedAuth()

  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  const role = await getUserWorkspaceRole(auth.user.userId, auth.workspaceId)
  const isAdmin = role === 'ADMIN' || role === 'OWNER'

  const [cycles, userReviews] = await Promise.all([
    getPerformanceCycles(auth.workspaceId),
    getReviewsForUser(auth.user.userId, auth.workspaceId),
  ])

  // For managers, get direct reports for the most recent active cycle
  const activeCycle = cycles.find((c) => c.status === 'ACTIVE')
  const directReports = activeCycle
    ? await getDirectReportsForReview(auth.user.userId, auth.workspaceId, activeCycle.id)
    : []

  // Split user reviews into self-reviews and manager-reviews-to-do
  const myReviews = userReviews.filter(
    (r) => r.employeeId === auth.user.userId && r.reviewerRole === 'SELF'
  )
  const reviewsToGive = userReviews.filter(
    (r) => r.managerId === auth.user.userId && r.reviewerRole === 'MANAGER'
  )

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Performance Reviews</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage review cycles and track team performance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <PerformanceHome
          cycles={JSON.parse(JSON.stringify(cycles))}
          myReviews={JSON.parse(JSON.stringify(myReviews))}
          reviewsToGive={JSON.parse(JSON.stringify(reviewsToGive))}
          directReports={JSON.parse(JSON.stringify(directReports))}
          activeCycleId={activeCycle?.id ?? null}
          isAdmin={isAdmin}
          currentUserId={auth.user.userId}
          workspaceSlug={workspaceSlug}
        />
      </div>
    </div>
  )
}
