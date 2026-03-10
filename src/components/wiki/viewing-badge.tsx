'use client'

import { Users } from 'lucide-react'

interface ViewingBadgeProps {
  count: number
  className?: string
}

/**
 * Badge showing how many users are currently viewing/editing the page.
 * Only displays when count > 1 (hides if user is alone).
 */
export function ViewingBadge({ count, className }: ViewingBadgeProps) {
  if (count <= 1) return null

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className ?? ''}`}>
      <Users className="h-3.5 w-3.5" />
      {count} viewing
    </span>
  )
}
