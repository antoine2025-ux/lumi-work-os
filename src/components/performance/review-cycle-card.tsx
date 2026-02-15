'use client'

import Link from 'next/link'
import { Calendar, Users, ClipboardCheck } from 'lucide-react'
import { ReviewStatusBadge } from './review-status-badge'
import { cn } from '@/lib/utils'

interface CycleCardProps {
  cycle: {
    id: string
    name: string
    description: string | null
    status: string
    reviewType: string
    startDate: string | Date
    endDate: string | Date
    dueDate: string | Date
    createdBy: {
      name: string | null
      email: string
    }
    _count: {
      questions: number
      reviews: number
    }
    stats: {
      totalReviews: number
      completionPercent: number
      finalized?: number
    }
  }
  workspaceSlug: string
  className?: string
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const reviewTypeLabels: Record<string, string> = {
  SELF_ONLY: 'Self-Review Only',
  MANAGER_ONLY: 'Manager Review Only',
  COMBINED: 'Self + Manager',
}

export function ReviewCycleCard({ cycle, workspaceSlug, className }: CycleCardProps) {
  const pct = cycle.stats.completionPercent

  return (
    <Link href={`/w/${workspaceSlug}/org/performance/cycles/${cycle.id}`}>
      <div
        className={cn(
          'bg-card rounded-lg border border-border p-4 hover:border-border/80 hover:bg-card/80 transition-all cursor-pointer',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground mb-1 line-clamp-2">
              {cycle.name}
            </h3>
            {cycle.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{cycle.description}</p>
            )}
          </div>
          <div className="ml-3 flex-shrink-0">
            <ReviewStatusBadge status={cycle.status} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span
              className={cn(
                'text-xs font-medium',
                pct >= 100
                  ? 'text-green-400'
                  : pct >= 50
                    ? 'text-blue-400'
                    : 'text-orange-400'
              )}
            >
              {pct}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
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

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Due {formatDate(cycle.dueDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{cycle.stats.totalReviews} reviews</span>
          </div>
          <div className="flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>{reviewTypeLabels[cycle.reviewType] ?? cycle.reviewType}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
