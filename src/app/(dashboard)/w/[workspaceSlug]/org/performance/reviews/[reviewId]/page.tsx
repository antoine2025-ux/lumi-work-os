import { getUnifiedAuth } from '@/lib/unified-auth'
import { getReviewDetail } from '@/lib/performance/data.server'
import { redirect, notFound } from 'next/navigation'
import { ReviewForm } from '@/components/performance/review-form'
import { ReviewConsolidatedView } from '@/components/performance/review-consolidated-view'

interface Props {
  params: Promise<{ workspaceSlug: string; reviewId: string }>
}

export default async function ReviewDetailPage({ params }: Props) {
  const { workspaceSlug, reviewId } = await params
  const auth = await getUnifiedAuth()

  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  const review = await getReviewDetail(reviewId, auth.workspaceId)

  if (!review) {
    notFound()
  }

  // Access check: must be employee, manager, or ADMIN
  const isEmployee = review.employeeId === auth.user.userId
  const isManager = review.managerId === auth.user.userId
  const isSelfReview = review.reviewerRole === 'SELF'

  // Check if finalized — show consolidated view
  const isFinalized = review.status === 'FINALIZED' || review.status === 'COMPLETED'

  if (isFinalized && review.cycle) {
    // Build consolidated view data
    const selfReviewData = isSelfReview
      ? review
      : review.selfReview
    const managerReviewData = !isSelfReview
      ? review
      : null // Manager review might not be loaded for self-review

    return (
      <div className="min-h-full bg-background">
        <div className="bg-card border-b border-border">
          <div className="px-6 py-4">
            <h1 className="text-xl font-semibold text-foreground">
              Performance Review — {review.employee.name ?? review.employee.email}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {review.cycle?.name ?? review.period}
            </p>
          </div>
        </div>
        <div className="p-6 max-w-4xl">
          <ReviewConsolidatedView
            selfReview={selfReviewData ? {
              id: selfReviewData.id,
              status: selfReviewData.status,
              reviewerRole: 'SELF',
              feedback: selfReviewData.feedback,
              strengths: selfReviewData.strengths,
              improvements: selfReviewData.improvements,
              nextGoals: selfReviewData.nextGoals,
              overallScore: selfReviewData.overallScore,
              responses: selfReviewData.responses.map((r) => ({
                questionId: r.questionId,
                rating: r.rating,
                text: r.text,
                question: r.question,
              })),
            } : null}
            managerReview={managerReviewData ? {
              id: managerReviewData.id,
              status: managerReviewData.status,
              reviewerRole: 'MANAGER',
              feedback: managerReviewData.feedback,
              strengths: managerReviewData.strengths,
              improvements: managerReviewData.improvements,
              nextGoals: managerReviewData.nextGoals,
              overallScore: managerReviewData.overallScore,
              responses: managerReviewData.responses.map((r) => ({
                questionId: r.questionId,
                rating: r.rating,
                text: r.text,
                question: r.question,
              })),
            } : null}
            employee={review.employee}
            manager={review.manager}
            questions={review.cycle?.questions ?? []}
            linkedGoals={review.linkedGoals}
          />
        </div>
      </div>
    )
  }

  // Active review — show editable form
  const canEdit =
    (isSelfReview && isEmployee) ||
    (!isSelfReview && isManager) ||
    false // ADMIN handled by route-level access

  const questions = review.cycle?.questions ?? []
  const initialResponses = review.responses.map((r) => ({
    questionId: r.questionId,
    rating: r.rating,
    text: r.text,
  }))

  return (
    <div className="min-h-full bg-background">
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-foreground">
            {isSelfReview ? 'Self-Review' : 'Manager Review'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {review.cycle?.name ?? review.period}
            {!isSelfReview && ` — ${review.employee.name ?? review.employee.email}`}
          </p>
        </div>
      </div>
      <div className="p-6 max-w-3xl">
        {/* If manager review and self-review exists, show it as reference */}
        {!isSelfReview && review.selfReview && review.selfReview.status !== 'DRAFT' && (
          <div className="mb-6 bg-muted/10 rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">
              Employee Self-Review (Reference)
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {review.employee.name ?? review.employee.email}&apos;s self-assessment
            </p>
            <div className="space-y-2">
              {review.selfReview.responses.map((r) => (
                <div key={r.questionId} className="bg-background rounded-md p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {r.question.text}
                  </p>
                  {r.rating !== null && (
                    <p className="text-sm text-foreground">Rating: {r.rating}/5</p>
                  )}
                  {r.text && (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{r.text}</p>
                  )}
                </div>
              ))}
              {review.selfReview.feedback && (
                <div className="bg-background rounded-md p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Overall Feedback</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{review.selfReview.feedback}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <ReviewForm
          reviewId={review.id}
          reviewerRole={review.reviewerRole as 'SELF' | 'MANAGER'}
          status={review.status}
          employee={review.employee}
          manager={review.manager}
          questions={questions}
          initialResponses={initialResponses}
          initialFeedback={review.feedback}
          initialStrengths={review.strengths}
          initialImprovements={review.improvements}
          initialNextGoals={review.nextGoals}
          linkedGoals={review.linkedGoals}
          workspaceSlug={workspaceSlug}
          readOnly={!canEdit}
        />
      </div>
    </div>
  )
}
