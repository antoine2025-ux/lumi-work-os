"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, X, ArrowDown, Lightbulb } from "lucide-react"
import type { AgentPlan } from "@/lib/loopbrain/agent/types"

// TODO (fast follow-up): Add "Edit" option for sendEmail/replyToEmail steps so users can
// modify the draft body before confirming. Would require onEdit(stepIndex, newParams) callback
// and an inline textarea or modal to edit parameters.body (and optionally to/subject).

interface PlanConfirmationProps {
  plan: AgentPlan
  onConfirm: () => void
  onCancel: () => void
  isExecuting: boolean
  insights?: string[]
}

const TOOL_LABELS: Record<string, string> = {
  createProject: "project",
  createTask: "task",
  createEpic: "epic",
  assignTask: "task",
  createTodo: "todo",
  createWikiPage: "wiki",
  createGoal: "goal",
  addPersonToProject: "project",
  updateTaskStatus: "task",
  updateProject: "project",
  linkProjectToGoal: "link",
  addSubtask: "subtask",
  sendEmail: "email",
  replyToEmail: "reply",
  createCalendarEvent: "calendar",
  createMultipleCalendarEvents: "calendar",
  listProjects: "read",
  listPeople: "read",
}

export function PlanConfirmation({
  plan,
  onConfirm,
  onCancel,
  isExecuting,
  insights,
}: PlanConfirmationProps) {
  return (
    <div className="mt-3 rounded-lg border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-purple-200/60 dark:border-purple-800/30 bg-purple-100/40 dark:bg-purple-900/20">
        <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
          Action Plan
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

      {/* Steps */}
      <div className="px-4 py-3 space-y-2.5">
        {plan.steps.map((step, _idx) => {
          const label = TOOL_LABELS[step.toolName] ?? step.toolName
          const hasDeps = step.dependsOn && step.dependsOn.length > 0

          return (
            <div key={step.stepNumber} className="flex items-start gap-2.5">
              {/* Step number */}
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 dark:bg-purple-800/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
                {step.stepNumber}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">
                  {step.description}
                </p>

                <div className="flex items-center gap-1.5 mt-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 font-medium text-muted-foreground border-muted-foreground/25"
                  >
                    {label}
                  </Badge>
                  {hasDeps && (
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                      <ArrowDown className="h-2.5 w-2.5" />
                      step {step.dependsOn!.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 border-t border-purple-200/60 dark:border-purple-800/30 flex items-center gap-2">
        <button
          onClick={onConfirm}
          disabled={isExecuting}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            "bg-purple-600 text-white hover:bg-purple-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              Proceed
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isExecuting}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            "text-muted-foreground hover:bg-muted",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  )
}
