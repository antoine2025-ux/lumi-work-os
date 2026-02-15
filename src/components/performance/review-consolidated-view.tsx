'use client'

import { ReviewQuestionBlock } from './review-question-block'
import { ReviewStatusBadge } from './review-status-badge'
import { cn } from '@/lib/utils'

interface Question {
  id: string
  text: string
  description: string | null
  type: string
  isRequired: boolean
}

interface ResponseData {
  questionId: string
  rating: number | null
  text: string | null
  question: Question
}

interface ReviewData {
  id: string
  status: string
  reviewerRole: string
  feedback: string | null
  strengths: string | null
  improvements: string | null
  nextGoals: string | null
  overallScore: number | null
  responses: ResponseData[]
}

interface ConsolidatedViewProps {
  selfReview: ReviewData | null
  managerReview: ReviewData | null
  employee: { name: string | null; email: string }
  manager: { name: string | null; email: string }
  questions: Question[]
  linkedGoals?: Array<{ id: string; title: string; progress: number; status: string }>
  className?: string
}

function FreeformSection({
  label,
  selfValue,
  managerValue,
}: {
  label: string
  selfValue: string | null
  managerValue: string | null
}) {
  if (!selfValue && !managerValue) return null

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/10 rounded-md p-3">
          <p className="text-xs text-muted-foreground mb-1">Self-Review</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {selfValue || <span className="text-muted-foreground italic">--</span>}
          </p>
        </div>
        <div className="bg-muted/10 rounded-md p-3">
          <p className="text-xs text-muted-foreground mb-1">Manager Review</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {managerValue || <span className="text-muted-foreground italic">--</span>}
          </p>
        </div>
      </div>
    </div>
  )
}

export function ReviewConsolidatedView({
  selfReview,
  managerReview,
  employee,
  manager,
  questions,
  linkedGoals,
  className,
}: ConsolidatedViewProps) {
  const selfResponses = new Map(
    selfReview?.responses.map((r) => [r.questionId, r]) ?? []
  )
  const managerResponses = new Map(
    managerReview?.responses.map((r) => [r.questionId, r]) ?? []
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">
            Consolidated Review — {employee.name ?? employee.email}
          </h3>
          <div className="flex items-center gap-2">
            {selfReview && <ReviewStatusBadge status={selfReview.status} />}
            {managerReview && <ReviewStatusBadge status={managerReview.status} />}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Employee: {employee.name ?? employee.email}</span>
          <span>Manager: {manager.name ?? manager.email}</span>
          {managerReview?.overallScore !== null && managerReview?.overallScore !== undefined && (
            <span>
              Overall Score:{' '}
              <span className="font-medium text-foreground">
                {managerReview.overallScore.toFixed(1)}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Linked Goals */}
      {linkedGoals && linkedGoals.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Goal Progress</h3>
          <div className="space-y-2">
            {linkedGoals.map((goal) => (
              <div key={goal.id} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{goal.title}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-muted/30 rounded-full overflow-hidden">
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

      {/* Questions: side-by-side comparison */}
      {questions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Question Responses</h3>
          {questions.map((q) => {
            const selfResp = selfResponses.get(q.id)
            const mgrResp = managerResponses.get(q.id)

            return (
              <div key={q.id} className="bg-card rounded-lg border border-border p-4">
                <h4 className="text-sm font-medium text-foreground mb-3">{q.text}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Self-Review</p>
                    <ReviewQuestionBlock
                      question={q}
                      response={selfResp ? { rating: selfResp.rating, text: selfResp.text } : undefined}
                      readOnly
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Manager Review</p>
                    <ReviewQuestionBlock
                      question={q}
                      response={mgrResp ? { rating: mgrResp.rating, text: mgrResp.text } : undefined}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Freeform: side-by-side */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Written Feedback</h3>
        <div className="bg-card rounded-lg border border-border p-4 space-y-4">
          <FreeformSection
            label="Overall Feedback"
            selfValue={selfReview?.feedback ?? null}
            managerValue={managerReview?.feedback ?? null}
          />
          <FreeformSection
            label="Strengths"
            selfValue={selfReview?.strengths ?? null}
            managerValue={managerReview?.strengths ?? null}
          />
          <FreeformSection
            label="Areas for Improvement"
            selfValue={selfReview?.improvements ?? null}
            managerValue={managerReview?.improvements ?? null}
          />
          <FreeformSection
            label="Goals for Next Period"
            selfValue={selfReview?.nextGoals ?? null}
            managerValue={managerReview?.nextGoals ?? null}
          />
        </div>
      </div>
    </div>
  )
}
