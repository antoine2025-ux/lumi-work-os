'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Rocket, Lock, Users } from 'lucide-react'
import { ReviewStatusBadge } from '@/components/performance/review-status-badge'
import { ReviewProgressTracker } from '@/components/performance/review-progress-tracker'

interface Participant {
  employee: { id: string; name: string | null; email: string; image: string | null }
  selfReviewStatus: string | null
  managerReviewStatus: string | null
  selfReviewId: string | null
  managerReviewId: string | null
}

interface CycleData {
  id: string
  name: string
  description: string | null
  status: string
  reviewType: string
  startDate: string
  endDate: string
  dueDate: string
  createdBy: { id: string; name: string | null; email: string }
  questions: Array<{
    id: string
    text: string
    type: string
    sortOrder: number
    isRequired: boolean
  }>
  participants: Participant[]
  stats: {
    totalReviews: number
    submittedCount: number
    finalizedCount: number
    participantCount: number
    completionPercent: number
  }
}

interface Props {
  cycle: CycleData
  workspaceSlug: string
}

export function CycleDetailPage({ cycle, workspaceSlug }: Props) {
  const router = useRouter()
  const [isLaunching, setIsLaunching] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLaunch = async () => {
    if (cycle.participants.length === 0) {
      setError('No participants to launch the cycle for. The cycle was launched without participants — add them via the launch endpoint.')
      return
    }

    setIsLaunching(true)
    setError(null)

    try {
      // Get participant IDs from existing reviews
      const participantIds = cycle.participants.map((p) => p.employee.id)

      const res = await fetch(`/api/performance/cycles/${cycle.id}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to launch cycle')
      }

      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLaunching(false)
    }
  }

  const handleStatusTransition = async (newStatus: string) => {
    setIsClosing(true)
    setError(null)

    try {
      const res = await fetch(`/api/performance/cycles/${cycle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Failed to update cycle status`)
      }

      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsClosing(false)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <Link
        href={`/w/${workspaceSlug}/org/performance`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Performance
      </Link>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Cycle info + actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ReviewStatusBadge status={cycle.status} />
                <span className="text-xs text-muted-foreground">
                  {cycle.reviewType === 'COMBINED'
                    ? 'Self + Manager Review'
                    : cycle.reviewType === 'SELF_ONLY'
                      ? 'Self-Review Only'
                      : 'Manager Review Only'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {cycle.status === 'SETUP' && (
                  <button
                    onClick={handleLaunch}
                    disabled={isLaunching}
                    className="inline-flex items-center px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Rocket className="w-4 h-4 mr-1.5" />
                    {isLaunching ? 'Launching...' : 'Launch Cycle'}
                  </button>
                )}
                {cycle.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleStatusTransition('CLOSED')}
                    disabled={isClosing}
                    className="inline-flex items-center px-3 py-2 bg-orange-600 text-foreground text-sm font-medium rounded-lg hover:bg-orange-500 transition-colors disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4 mr-1.5" />
                    {isClosing ? 'Closing...' : 'Close Cycle'}
                  </button>
                )}
                {cycle.status === 'CLOSED' && (
                  <button
                    onClick={() => handleStatusTransition('FINALIZED')}
                    disabled={isClosing}
                    className="inline-flex items-center px-3 py-2 bg-green-600 text-foreground text-sm font-medium rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {isClosing ? 'Finalizing...' : 'Finalize Cycle'}
                  </button>
                )}
              </div>
            </div>

            {/* Date row */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
              <span>Start: {formatDate(cycle.startDate)}</span>
              <span>End: {formatDate(cycle.endDate)}</span>
              <span>Due: {formatDate(cycle.dueDate)}</span>
            </div>

            <ReviewProgressTracker stats={cycle.stats} />
          </div>

          {/* Questions */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">
              Questions ({cycle.questions.length})
            </h3>
            <div className="space-y-2">
              {cycle.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="flex items-start gap-3 bg-muted/10 rounded-md p-3"
                >
                  <span className="text-xs font-medium text-muted-foreground w-5 pt-0.5">
                    {idx + 1}.
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{q.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {q.type === 'RATING_AND_TEXT'
                          ? 'Rating + Text'
                          : q.type === 'RATING_ONLY'
                            ? 'Rating Only'
                            : 'Text Only'}
                      </span>
                      {q.isRequired && (
                        <span className="text-xs text-red-400">Required</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Participants */}
        <div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">
                Participants ({cycle.stats.participantCount})
              </h3>
            </div>

            {cycle.participants.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {cycle.status === 'SETUP'
                  ? 'Launch the cycle to assign reviews to participants.'
                  : 'No participants in this cycle.'}
              </p>
            ) : (
              <div className="space-y-2">
                {cycle.participants.map((p) => (
                  <div
                    key={p.employee.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                  >
                    <div>
                      <p className="text-sm text-foreground">
                        {p.employee.name ?? p.employee.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {p.selfReviewStatus && (
                        <ReviewStatusBadge status={p.selfReviewStatus} />
                      )}
                      {p.managerReviewStatus && (
                        <ReviewStatusBadge status={p.managerReviewStatus} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
