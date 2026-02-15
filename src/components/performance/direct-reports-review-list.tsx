'use client'

import Link from 'next/link'
import { User, ArrowRight } from 'lucide-react'
import { ReviewStatusBadge } from './review-status-badge'
import { cn } from '@/lib/utils'

interface DirectReport {
  employee: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  selfReviewId: string | null
  selfReviewStatus: string | null
  managerReviewId: string | null
  managerReviewStatus: string | null
}

interface DirectReportsReviewListProps {
  reports: DirectReport[]
  workspaceSlug: string
  className?: string
}

export function DirectReportsReviewList({
  reports,
  workspaceSlug,
  className,
}: DirectReportsReviewListProps) {
  if (reports.length === 0) {
    return (
      <div className={cn('bg-card rounded-lg border border-border p-8 text-center', className)}>
        <User className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No direct reports found for this cycle.</p>
      </div>
    )
  }

  return (
    <div className={cn('bg-card rounded-lg border border-border overflow-hidden', className)}>
      {/* Header row */}
      <div className="grid grid-cols-[1fr,120px,120px,100px] gap-3 px-4 py-2.5 bg-muted/20 border-b border-border text-xs font-medium text-muted-foreground">
        <span>Employee</span>
        <span>Self-Review</span>
        <span>Manager Review</span>
        <span className="text-right">Action</span>
      </div>

      {/* Rows */}
      {reports.map((report) => {
        const managerReviewHref = report.managerReviewId
          ? `/w/${workspaceSlug}/org/performance/reviews/${report.managerReviewId}`
          : null

        const getActionLabel = () => {
          if (!report.managerReviewId) return 'No Review'
          if (!report.managerReviewStatus || report.managerReviewStatus === 'DRAFT')
            return 'Start Review'
          if (['FINALIZED', 'COMPLETED'].includes(report.managerReviewStatus))
            return 'View'
          return 'Continue'
        }

        return (
          <div
            key={report.employee.id}
            className="grid grid-cols-[1fr,120px,120px,100px] gap-3 px-4 py-3 border-b border-border last:border-b-0 items-center hover:bg-muted/10 transition-colors"
          >
            {/* Employee */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center flex-shrink-0">
                {report.employee.image ? (
                  <img
                    src={report.employee.image}
                    alt=""
                    className="w-7 h-7 rounded-full"
                  />
                ) : (
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {report.employee.name ?? report.employee.email}
                </p>
                {report.employee.name && (
                  <p className="text-xs text-muted-foreground truncate">
                    {report.employee.email}
                  </p>
                )}
              </div>
            </div>

            {/* Self-review status */}
            <div>
              {report.selfReviewStatus ? (
                <ReviewStatusBadge status={report.selfReviewStatus} />
              ) : (
                <span className="text-xs text-muted-foreground">--</span>
              )}
            </div>

            {/* Manager review status */}
            <div>
              {report.managerReviewStatus ? (
                <ReviewStatusBadge status={report.managerReviewStatus} />
              ) : (
                <span className="text-xs text-muted-foreground">--</span>
              )}
            </div>

            {/* Action */}
            <div className="text-right">
              {managerReviewHref ? (
                <Link
                  href={managerReviewHref}
                  className="inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {getActionLabel()}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">--</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
