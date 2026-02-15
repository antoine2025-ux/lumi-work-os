'use client'

import { cn } from '@/lib/utils'

interface ReviewProgressTrackerProps {
  stats: {
    totalReviews: number
    submittedOrBeyond?: number
    submittedCount?: number
    finalized?: number
    finalizedCount?: number
    participantCount?: number
    completionPercent: number
  }
  className?: string
}

export function ReviewProgressTracker({ stats, className }: ReviewProgressTrackerProps) {
  const submitted = stats.submittedOrBeyond ?? stats.submittedCount ?? 0
  const finalized = stats.finalized ?? stats.finalizedCount ?? 0
  const total = stats.totalReviews
  const pct = stats.completionPercent

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-foreground">Completion</span>
          <span className="text-sm font-medium text-foreground">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              pct >= 100
                ? 'bg-green-500'
                : pct >= 50
                  ? 'bg-blue-500'
                  : 'bg-orange-500'
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/20 rounded-lg p-2.5 text-center">
          <div className="text-lg font-semibold text-foreground">{total}</div>
          <div className="text-xs text-muted-foreground">Total Reviews</div>
        </div>
        <div className="bg-cyan-500/5 rounded-lg p-2.5 text-center">
          <div className="text-lg font-semibold text-cyan-400">{submitted}</div>
          <div className="text-xs text-muted-foreground">Submitted</div>
        </div>
        <div className="bg-green-500/5 rounded-lg p-2.5 text-center">
          <div className="text-lg font-semibold text-green-400">{finalized}</div>
          <div className="text-xs text-muted-foreground">Finalized</div>
        </div>
      </div>

      {stats.participantCount !== undefined && (
        <p className="text-xs text-muted-foreground text-center">
          {stats.participantCount} participant{stats.participantCount !== 1 ? 's' : ''} in this cycle
        </p>
      )}
    </div>
  )
}
