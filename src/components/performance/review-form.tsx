'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Send, ArrowLeft } from 'lucide-react'
import { ReviewQuestionBlock } from './review-question-block'
import { ReviewStatusBadge } from './review-status-badge'
import { cn, debounce } from '@/lib/utils'

interface Question {
  id: string
  text: string
  description: string | null
  type: string
  sortOrder: number
  isRequired: boolean
}

interface ResponseData {
  questionId: string
  rating: number | null
  text: string | null
}

interface ReviewFormProps {
  reviewId: string
  reviewerRole: 'SELF' | 'MANAGER'
  status: string
  employee: { id: string; name: string | null; email: string }
  manager: { id: string; name: string | null; email: string }
  questions: Question[]
  initialResponses: ResponseData[]
  initialFeedback?: string | null
  initialStrengths?: string | null
  initialImprovements?: string | null
  initialNextGoals?: string | null
  linkedGoals?: Array<{ id: string; title: string; progress: number; status: string }>
  workspaceSlug: string
  readOnly?: boolean
  className?: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function ReviewForm({
  reviewId,
  reviewerRole,
  status,
  employee,
  questions,
  initialResponses,
  initialFeedback,
  initialStrengths,
  initialImprovements,
  initialNextGoals,
  linkedGoals,
  workspaceSlug,
  readOnly = false,
  className,
}: ReviewFormProps) {
  const router = useRouter()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Response state: map of questionId -> { rating, text }
  const [responses, setResponses] = useState<Record<string, { rating: number | null; text: string | null }>>(() => {
    const map: Record<string, { rating: number | null; text: string | null }> = {}
    for (const r of initialResponses) {
      map[r.questionId] = { rating: r.rating, text: r.text }
    }
    return map
  })

  // Freeform fields
  const [feedback, setFeedback] = useState(initialFeedback ?? '')
  const [strengths, setStrengths] = useState(initialStrengths ?? '')
  const [improvements, setImprovements] = useState(initialImprovements ?? '')
  const [nextGoals, setNextGoals] = useState(initialNextGoals ?? '')

  const isMountedRef = useRef(true)
  const lastSavedRef = useRef<string>('')

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Build current state snapshot for dirty checking
  const getCurrentState = useCallback(() => {
    return JSON.stringify({ responses, feedback, strengths, improvements, nextGoals })
  }, [responses, feedback, strengths, improvements, nextGoals])

  // Save function
  const saveNow = useCallback(async () => {
    if (!isMountedRef.current) return

    const currentState = getCurrentState()
    if (currentState === lastSavedRef.current) return // No changes

    try {
      setSaveStatus('saving')

      // Save responses
      const responseArray = Object.entries(responses).map(([questionId, data]) => ({
        questionId,
        rating: data.rating,
        text: data.text,
      }))

      if (responseArray.length > 0) {
        const respRes = await fetch(`/api/performance/reviews/${reviewId}/responses`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses: responseArray }),
        })
        if (!respRes.ok) throw new Error('Failed to save responses')
      }

      // Save freeform fields
      const reviewRes = await fetch(`/api/performance/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: feedback || undefined,
          strengths: strengths || undefined,
          improvements: improvements || undefined,
          nextGoals: nextGoals || undefined,
        }),
      })
      if (!reviewRes.ok) throw new Error('Failed to save review')

      if (!isMountedRef.current) return
      lastSavedRef.current = currentState
      setSaveStatus('saved')
    } catch (err: unknown) {
      if (!isMountedRef.current) return
      setSaveStatus('error')
      console.error('Auto-save failed:', err)
    }
  }, [getCurrentState, responses, reviewId, feedback, strengths, improvements, nextGoals])

  // Debounced auto-save (2 second delay)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(() => {
      if (isMountedRef.current && !readOnly) {
        saveNow()
      }
    }, 2000),
    [saveNow, readOnly]
  )

  // Trigger auto-save on state changes
  useEffect(() => {
    if (!readOnly && status !== 'FINALIZED' && status !== 'COMPLETED') {
      setSaveStatus('idle')
      debouncedSave()
    }
    return () => debouncedSave.cancel()
  }, [responses, feedback, strengths, improvements, nextGoals, debouncedSave, readOnly, status])

  const updateResponse = useCallback(
    (questionId: string, data: { rating?: number | null; text?: string | null }) => {
      setResponses((prev) => ({
        ...prev,
        [questionId]: {
          rating: data.rating !== undefined ? data.rating : (prev[questionId]?.rating ?? null),
          text: data.text !== undefined ? data.text : (prev[questionId]?.text ?? null),
        },
      }))
    },
    []
  )

  const handleSubmit = async () => {
    setError(null)

    // Cancel pending auto-save and save immediately
    debouncedSave.cancel()
    await saveNow()

    try {
      const res = await fetch(`/api/performance/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SUBMITTED' }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to submit review')
      }

      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleFinalize = async () => {
    setError(null)
    debouncedSave.cancel()
    await saveNow()

    try {
      const res = await fetch(`/api/performance/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINALIZED' }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to finalize review')
      }

      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const isEditable =
    !readOnly && !['FINALIZED', 'COMPLETED'].includes(status)

  const canSubmit = reviewerRole === 'SELF' && status === 'DRAFT'
  const canFinalize =
    reviewerRole === 'MANAGER' &&
    ['SUBMITTED', 'IN_REVIEW'].includes(status)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/w/${workspaceSlug}/org/performance`)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {reviewerRole === 'SELF' ? 'Self-Review' : 'Manager Review'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {reviewerRole === 'SELF'
                ? `Your self-assessment`
                : `Review for ${employee.name ?? employee.email}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Save status indicator */}
          <span
            className={cn(
              'text-xs',
              saveStatus === 'saving' && 'text-muted-foreground',
              saveStatus === 'saved' && 'text-green-400',
              saveStatus === 'error' && 'text-red-400',
              saveStatus === 'idle' && 'text-transparent'
            )}
          >
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Save failed'}
          </span>
          <ReviewStatusBadge status={status} />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Linked goals */}
      {linkedGoals && linkedGoals.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Goal Progress</h3>
          <div className="space-y-2">
            {linkedGoals.map((goal) => (
              <div key={goal.id} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{goal.title}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {Math.round(goal.progress)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cycle questions */}
      {questions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Review Questions</h3>
          {questions.map((q) => (
            <ReviewQuestionBlock
              key={q.id}
              question={q}
              response={responses[q.id]}
              onChange={(data) => updateResponse(q.id, data)}
              readOnly={!isEditable}
            />
          ))}
        </div>
      )}

      {/* Freeform fields */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Additional Feedback</h3>

        <div className="bg-card rounded-lg border border-border p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              {reviewerRole === 'SELF' ? 'General Reflections' : 'Overall Feedback'}
            </label>
            {isEditable ? (
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your overall thoughts..."
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {feedback || <span className="text-muted-foreground italic">No feedback</span>}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Strengths</label>
            {isEditable ? (
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Key strengths and accomplishments..."
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {strengths || <span className="text-muted-foreground italic">Not specified</span>}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Areas for Improvement
            </label>
            {isEditable ? (
              <textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="Areas to develop and grow..."
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {improvements || <span className="text-muted-foreground italic">Not specified</span>}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Goals for Next Period
            </label>
            {isEditable ? (
              <textarea
                value={nextGoals}
                onChange={(e) => setNextGoals(e.target.value)}
                placeholder="Goals and focus areas for the next period..."
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {nextGoals || <span className="text-muted-foreground italic">Not specified</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {isEditable && (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              debouncedSave.cancel()
              saveNow()
            }}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/20 transition-colors"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Draft
          </button>

          {canSubmit && (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Submit Review
            </button>
          )}

          {canFinalize && (
            <button
              type="button"
              onClick={handleFinalize}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-500 transition-colors"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Finalize Review
            </button>
          )}
        </div>
      )}
    </div>
  )
}
