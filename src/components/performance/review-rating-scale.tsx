'use client'

import { cn } from '@/lib/utils'

const ratingLabels: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Below Expectations',
  3: 'Meets Expectations',
  4: 'Exceeds Expectations',
  5: 'Outstanding',
}

interface ReviewRatingScaleProps {
  value: number | null
  onChange?: (rating: number) => void
  readOnly?: boolean
  className?: string
}

export function ReviewRatingScale({
  value,
  onChange,
  readOnly = false,
  className,
}: ReviewRatingScaleProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((rating) => {
          const isSelected = value === rating
          const isLower = value !== null && rating <= value

          return (
            <button
              key={rating}
              type="button"
              disabled={readOnly}
              onClick={() => onChange?.(rating)}
              className={cn(
                'w-9 h-9 rounded-full text-sm font-medium transition-all',
                'border focus:outline-none focus:ring-2 focus:ring-primary/30',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : isLower
                    ? 'bg-primary/20 text-primary border-primary/40'
                    : 'bg-muted/30 text-muted-foreground border-border hover:border-primary/40 hover:bg-muted/50',
                readOnly && 'cursor-default',
                !readOnly && !isSelected && 'cursor-pointer'
              )}
              title={ratingLabels[rating]}
            >
              {rating}
            </button>
          )
        })}
      </div>
      {value !== null && (
        <p className="text-xs text-muted-foreground">{ratingLabels[value]}</p>
      )}
    </div>
  )
}
