'use client'

import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-muted/50 text-muted-foreground border-border',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  SUBMITTED: {
    label: 'Submitted',
    className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  IN_REVIEW: {
    label: 'In Review',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  FINALIZED: {
    label: 'Finalized',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  // Cycle statuses
  SETUP: {
    label: 'Setup',
    className: 'bg-muted/50 text-muted-foreground border-border',
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  CLOSED: {
    label: 'Closed',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
}

interface ReviewStatusBadgeProps {
  status: string
  className?: string
}

export function ReviewStatusBadge({ status, className }: ReviewStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'bg-muted/50 text-muted-foreground border-border',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
