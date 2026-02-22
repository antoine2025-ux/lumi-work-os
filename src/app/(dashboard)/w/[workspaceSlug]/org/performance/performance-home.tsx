'use client'

import Link from 'next/link'
import { Plus, ClipboardCheck, UserCheck, ArrowRight } from 'lucide-react'
import { ReviewCycleCard } from '@/components/performance/review-cycle-card'
import { ReviewStatusBadge } from '@/components/performance/review-status-badge'
import { DirectReportsReviewList } from '@/components/performance/direct-reports-review-list'

interface CycleData {
  id: string
  name: string
  description: string | null
  status: string
  reviewType: string
  startDate: string
  endDate: string
  dueDate: string
  createdBy: { name: string | null; email: string }
  _count: { questions: number; reviews: number }
  stats: { totalReviews: number; completionPercent: number; finalized?: number }
}

interface ReviewData {
  id: string
  period: string
  status: string
  reviewerRole: string
  overallScore: number | null
  employee: { id: string; name: string | null; email: string; image: string | null }
  manager: { id: string; name: string | null; email: string; image: string | null }
  cycle: { id: string; name: string; dueDate: string } | null
}

interface DirectReportData {
  employee: { id: string; name: string | null; email: string; image: string | null }
  selfReviewId: string | null
  selfReviewStatus: string | null
  managerReviewId: string | null
  managerReviewStatus: string | null
}

interface Props {
  cycles: CycleData[]
  myReviews: ReviewData[]
  reviewsToGive: ReviewData[]
  directReports: DirectReportData[]
  activeCycleId: string | null
  isAdmin: boolean
  currentUserId: string
  workspaceSlug: string
}

export function PerformanceHome({
  cycles,
  myReviews,
  reviewsToGive,
  directReports,
  activeCycleId: _activeCycleId,
  isAdmin,
  currentUserId: _currentUserId,
  workspaceSlug,
}: Props) {
  const activeCycles = cycles.filter((c) => c.status === 'ACTIVE' || c.status === 'SETUP')
  const pastCycles = cycles.filter((c) => c.status === 'CLOSED' || c.status === 'FINALIZED')

  return (
    <div className="space-y-8">
      {/* Admin: Cycles section */}
      {isAdmin && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-foreground">Review Cycles</h2>
            <Link
              href={`/w/${workspaceSlug}/org/performance/cycles/new`}
              className="inline-flex items-center px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Cycle
            </Link>
          </div>

          {activeCycles.length === 0 && pastCycles.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <div className="w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-2">No review cycles yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first performance review cycle to get started.
              </p>
              <Link
                href={`/w/${workspaceSlug}/org/performance/cycles/new`}
                className="inline-flex items-center px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Cycle
              </Link>
            </div>
          ) : (
            <>
              {activeCycles.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                  {activeCycles.map((cycle) => (
                    <ReviewCycleCard
                      key={cycle.id}
                      cycle={cycle}
                      workspaceSlug={workspaceSlug}
                    />
                  ))}
                </div>
              )}
              {pastCycles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Past Cycles</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {pastCycles.map((cycle) => (
                      <ReviewCycleCard
                        key={cycle.id}
                        cycle={cycle}
                        workspaceSlug={workspaceSlug}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Manager: Direct Reports */}
      {directReports.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-foreground">
              <UserCheck className="w-4 h-4 inline mr-1.5 text-muted-foreground" />
              Your Direct Reports
            </h2>
          </div>
          <DirectReportsReviewList
            reports={directReports}
            workspaceSlug={workspaceSlug}
          />
        </section>
      )}

      {/* Employee: My Reviews */}
      {myReviews.length > 0 && (
        <section>
          <h2 className="text-base font-medium text-foreground mb-4">Your Reviews</h2>
          <div className="space-y-2">
            {myReviews.map((review) => (
              <Link
                key={review.id}
                href={`/w/${workspaceSlug}/org/performance/reviews/${review.id}`}
                className="flex items-center justify-between bg-card rounded-lg border border-border p-4 hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Self-Review: {review.cycle?.name ?? review.period}
                    </p>
                    {review.cycle?.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Due {new Date(review.cycle.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ReviewStatusBadge status={review.status} />
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Manager: Reviews to Give */}
      {reviewsToGive.length > 0 && (
        <section>
          <h2 className="text-base font-medium text-foreground mb-4">Reviews to Complete</h2>
          <div className="space-y-2">
            {reviewsToGive.map((review) => (
              <Link
                key={review.id}
                href={`/w/${workspaceSlug}/org/performance/reviews/${review.id}`}
                className="flex items-center justify-between bg-card rounded-lg border border-border p-4 hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Review for {review.employee.name ?? review.employee.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {review.cycle?.name ?? review.period}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ReviewStatusBadge status={review.status} />
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state for non-admin users with no reviews */}
      {!isAdmin && myReviews.length === 0 && reviewsToGive.length === 0 && directReports.length === 0 && (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <div className="w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-2">No reviews assigned</h3>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any performance reviews assigned yet. Check back when a review cycle is launched.
          </p>
        </div>
      )}
    </div>
  )
}
