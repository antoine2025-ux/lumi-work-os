'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuestionInput {
  text: string
  description: string
  type: 'RATING_ONLY' | 'TEXT_ONLY' | 'RATING_AND_TEXT'
  isRequired: boolean
}

interface ReviewCycleFormProps {
  workspaceSlug: string
  className?: string
}

const defaultQuestion: QuestionInput = {
  text: '',
  description: '',
  type: 'RATING_AND_TEXT',
  isRequired: true,
}

export function ReviewCycleForm({ workspaceSlug, className }: ReviewCycleFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [reviewType, setReviewType] = useState<'SELF_ONLY' | 'MANAGER_ONLY' | 'COMBINED'>(
    'COMBINED'
  )
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [questions, setQuestions] = useState<QuestionInput[]>([
    { ...defaultQuestion, text: 'What were your key accomplishments this period?' },
    { ...defaultQuestion, text: 'What areas would you like to improve?' },
    { ...defaultQuestion, text: 'How well did you collaborate with your team?' },
  ])

  const addQuestion = useCallback(() => {
    setQuestions((prev) => [...prev, { ...defaultQuestion }])
  }, [])

  const removeQuestion = useCallback((index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateQuestion = useCallback(
    (index: number, field: keyof QuestionInput, value: string | boolean) => {
      setQuestions((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }
        return updated
      })
    },
    []
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/performance/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          reviewType,
          startDate,
          endDate,
          dueDate,
          questions: questions.map((q, idx) => ({
            text: q.text,
            description: q.description || undefined,
            type: q.type,
            sortOrder: idx,
            isRequired: q.isRequired,
          })),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Failed to create cycle (${res.status})`)
      }

      const cycle = await res.json()
      router.push(`/w/${workspaceSlug}/org/performance/cycles/${cycle.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <h3 className="text-sm font-medium text-foreground">Cycle Details</h3>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Cycle Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Q1 2026 Review"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for this review cycle..."
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Review Type <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-3">
            {(
              [
                { value: 'COMBINED', label: 'Self + Manager' },
                { value: 'SELF_ONLY', label: 'Self-Review Only' },
                { value: 'MANAGER_ONLY', label: 'Manager Review Only' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex-1 flex items-center justify-center px-3 py-2 rounded-md border text-sm cursor-pointer transition-all',
                  reviewType === opt.value
                    ? 'bg-primary/10 text-primary border-primary/40'
                    : 'bg-muted/20 text-muted-foreground border-border hover:border-primary/20'
                )}
              >
                <input
                  type="radio"
                  name="reviewType"
                  value={opt.value}
                  checked={reviewType === opt.value}
                  onChange={() => setReviewType(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <h3 className="text-sm font-medium text-foreground">Timeline</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Start Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              End Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Due Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            Review Questions ({questions.length})
          </h3>
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Question
          </button>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={idx}
              className="bg-background rounded-md border border-border p-3 space-y-3"
            >
              <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground mt-2.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                    placeholder="Enter question text..."
                    required
                    className="w-full rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex items-center gap-3">
                    <select
                      value={q.type}
                      onChange={(e) =>
                        updateQuestion(
                          idx,
                          'type',
                          e.target.value
                        )
                      }
                      className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="RATING_AND_TEXT">Rating + Text</option>
                      <option value="RATING_ONLY">Rating Only</option>
                      <option value="TEXT_ONLY">Text Only</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.isRequired}
                        onChange={(e) =>
                          updateQuestion(idx, 'isRequired', e.target.checked)
                        }
                        className="rounded border-border"
                      />
                      Required
                    </label>
                  </div>
                </div>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    className="p-1 text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"
                    title="Remove question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Cycle'}
        </button>
      </div>
    </form>
  )
}
