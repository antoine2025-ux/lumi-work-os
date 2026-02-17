"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MessageCircleQuestion, Send, SkipForward, Lightbulb } from "lucide-react"
import type { ClarifyingQuestion } from "@/lib/loopbrain/agent/types"

interface ClarifyingQuestionsProps {
  preamble: string
  questions: ClarifyingQuestion[]
  onSubmit: (answers: string) => void
  onSkip: () => void
  insights?: string[]
}

export function ClarifyingQuestions({
  preamble,
  questions,
  onSubmit,
  onSkip,
  insights,
}: ClarifyingQuestionsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const updateAnswer = (field: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    const parts: string[] = []
    for (const q of questions) {
      const answer = answers[q.field]
      if (answer && answer.trim()) {
        parts.push(`${q.field}: ${answer.trim()}`)
      }
    }
    onSubmit(parts.length > 0 ? parts.join('. ') + '.' : 'just do it with defaults')
  }

  const hasAnyAnswer = Object.values(answers).some((v) => v && v.trim())

  return (
    <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-blue-200/60 dark:border-blue-800/30 bg-blue-100/40 dark:bg-blue-900/20 flex items-center gap-2">
        <MessageCircleQuestion className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
          Quick Questions
        </p>
      </div>

      {/* Insights */}
      {insights && insights.length > 0 && (
        <div className="px-4 py-2.5 border-b border-indigo-200/40 dark:border-indigo-800/20 bg-indigo-50/30 dark:bg-indigo-950/10">
          <div className="space-y-1.5">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-snug">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preamble */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-sm text-foreground">{preamble}</p>
      </div>

      {/* Questions */}
      <div className="px-4 py-3 space-y-4">
        {questions.map((q, idx) => (
          <div key={q.field} className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground leading-snug">
                  {q.question}
                  {q.required && (
                    <Badge
                      variant="outline"
                      className="ml-1.5 text-[9px] px-1 py-0 h-3.5 font-medium text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700"
                    >
                      required
                    </Badge>
                  )}
                </div>

                {/* Suggestion pills */}
                {q.suggestions && q.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateAnswer(q.field, s)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                          answers[q.field] === s
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom text input */}
                <Input
                  value={answers[q.field] ?? ''}
                  onChange={(e) => updateAnswer(q.field, e.target.value)}
                  placeholder="Or type your answer..."
                  className="mt-2 text-xs h-8"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 border-t border-blue-200/60 dark:border-blue-800/30 flex items-center gap-2">
        <button
          onClick={handleSubmit}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            "bg-blue-600 text-white hover:bg-blue-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Send className="h-3 w-3" />
          {hasAnyAnswer ? 'Submit answers' : 'Use defaults'}
        </button>
        <button
          onClick={onSkip}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            "text-muted-foreground hover:bg-muted"
          )}
        >
          <SkipForward className="h-3 w-3" />
          Skip — just do it
        </button>
      </div>
    </div>
  )
}
