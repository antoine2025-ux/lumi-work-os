'use client'

import { ReviewRatingScale } from './review-rating-scale'
import { cn } from '@/lib/utils'

interface ReviewQuestionBlockProps {
  question: {
    id: string
    text: string
    description?: string | null
    type: string
    isRequired: boolean
  }
  response?: {
    rating: number | null
    text: string | null
  }
  onChange?: (data: { rating?: number | null; text?: string | null }) => void
  readOnly?: boolean
  className?: string
}

export function ReviewQuestionBlock({
  question,
  response,
  onChange,
  readOnly = false,
  className,
}: ReviewQuestionBlockProps) {
  const showRating = question.type === 'RATING_ONLY' || question.type === 'RATING_AND_TEXT'
  const showText = question.type === 'TEXT_ONLY' || question.type === 'RATING_AND_TEXT'

  return (
    <div className={cn('bg-card rounded-lg border border-border p-4 space-y-3', className)}>
      {/* Question text */}
      <div>
        <h4 className="text-sm font-medium text-foreground">
          {question.text}
          {question.isRequired && <span className="text-red-400 ml-1">*</span>}
        </h4>
        {question.description && (
          <p className="text-xs text-muted-foreground mt-1">{question.description}</p>
        )}
      </div>

      {/* Rating */}
      {showRating && (
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Rating</label>
          <ReviewRatingScale
            value={response?.rating ?? null}
            onChange={(rating) => onChange?.({ rating })}
            readOnly={readOnly}
          />
        </div>
      )}

      {/* Text response */}
      {showText && (
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Response</label>
          {readOnly ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {response?.text || <span className="text-muted-foreground italic">No response</span>}
            </p>
          ) : (
            <textarea
              value={response?.text ?? ''}
              onChange={(e) => onChange?.({ text: e.target.value })}
              placeholder="Write your response..."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          )}
        </div>
      )}
    </div>
  )
}
