"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Check, X, Loader2, ExternalLink, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatTimeRange } from "@/lib/loopbrain/format-action"
import type { AgentPlan } from "@/lib/loopbrain/agent/types"

// ---------------------------------------------------------------------------
// Entity link extraction
// ---------------------------------------------------------------------------

export interface EntityLink {
  type: "project" | "task" | "epic" | "goal" | "wiki" | "todo"
  name: string
  id: string
  url: string
}

/**
 * Maps tool names to the entity type they create.
 */
const TOOL_ENTITY_TYPE: Record<string, EntityLink["type"]> = {
  createProject: "project",
  createTask: "task",
  createEpic: "epic",
  createGoal: "goal",
  createWikiPage: "wiki",
  draftWikiPage: "wiki",
  createTodo: "todo",
}

/**
 * Parse a humanReadable result string to extract entity info.
 *
 * Expected patterns:
 *   Created project "Q3 Marketing" (cmlqprlrv00048ole1pki6uf2)
 *   Created task "Launch prep" (cmlqprlrv00048ole1pki6uf2)
 *   Created wiki page "Onboarding Guide" (/wiki/onboarding-guide-abc123)
 *   Created goal "Increase retention" (cmlqprlrv00048ole1pki6uf2)
 */
function parseResultLine(
  text: string,
  toolName: string,
  workspaceSlug: string
): EntityLink | null {
  const entityType = TOOL_ENTITY_TYPE[toolName]
  if (!entityType) return null

  // Match: "Name" (id_or_path)
  const match = text.match(/"([^"]+)"\s*\(([^)]+)\)/)
  if (!match) return null

  const name = match[1]
  const idOrPath = match[2]

  let url: string
  switch (entityType) {
    case "project":
      url = `/w/${workspaceSlug}/projects/${idOrPath}`
      break
    case "task":
      // Tasks live under their project — we don't always have the projectId in the result string.
      // Fall back to my-tasks view which shows all tasks.
      url = `/w/${workspaceSlug}/my-tasks`
      break
    case "epic":
      url = `/w/${workspaceSlug}/projects`
      break
    case "goal":
      url = `/w/${workspaceSlug}/goals`
      break
    case "wiki":
      // Wiki result includes the slug path like /wiki/onboarding-guide-abc123
      if (idOrPath.startsWith("/wiki/")) {
        url = `/w/${workspaceSlug}${idOrPath}`
      } else {
        url = `/w/${workspaceSlug}/wiki/${idOrPath}`
      }
      break
    case "todo":
      url = `/w/${workspaceSlug}/todos`
      break
    default:
      return null
  }

  return { type: entityType, name, id: idOrPath, url }
}

/**
 * Extract entity links from an execution summary by matching each
 * result line to its plan step's tool name.
 */
export function extractEntityLinks(
  summary: string,
  plan: AgentPlan,
  workspaceSlug: string
): EntityLink[] {
  const links: EntityLink[] = []
  const lines = summary.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith("\u2713")) continue // ✓ lines are successful steps

    // Match the line to a step based on order (successful steps appear in order)
    const stepIndex = links.length
    const step = (plan.steps ?? [])[stepIndex]
    if (!step) continue

    const link = parseResultLine(line, step.toolName, workspaceSlug)
    if (link) {
      links.push(link)
    }
  }

  return links
}

// ---------------------------------------------------------------------------
// Step status types
// ---------------------------------------------------------------------------

type StepStatus = "waiting" | "executing" | "success" | "failed"

export interface StepProgressState {
  description: string
  status: "pending" | "executing" | "success" | "error"
  error?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ExecutionProgressProps {
  plan: AgentPlan
  executionResult?: string
  isExecuting: boolean
  /** Real-time step progress from SSE stream */
  stepProgress?: StepProgressState[]
  /** When set, shows error state instead of success */
  executionError?: string
  /** Retry from failed step (full re-execution) */
  onRetry?: () => void
  /** Cancel / dismiss error state */
  onCancel?: () => void
}

const STEP_ANIMATION_MS = 800

export function ExecutionProgress({
  plan,
  executionResult,
  isExecuting,
  stepProgress,
  executionError,
  onRetry,
  onCancel,
}: ExecutionProgressProps) {
  const params = useParams()
  const workspaceSlug = (params?.workspaceSlug as string) ?? ""
  const [animatedStep, setAnimatedStep] = useState(0)

  const steps = plan.steps ?? []

  // Timer-based fallback when no stepProgress (legacy/optimistic)
  useEffect(() => {
    if (!isExecuting || (stepProgress && stepProgress.length > 0)) return

    setAnimatedStep(0)
    const interval = setInterval(() => {
      setAnimatedStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, STEP_ANIMATION_MS)

    return () => clearInterval(interval)
  }, [isExecuting, steps.length, stepProgress])

  // Parse final results when execution completes
  const resultLines = executionResult ? executionResult.split("\n") : []
  const hasStructuredResult = resultLines.some(
    (l) => l.startsWith("\u2713") || l.startsWith("\u2717")
  )
  const entityLinks =
    executionResult && hasStructuredResult
      ? extractEntityLinks(executionResult, plan, workspaceSlug)
      : []
  const primaryLink = entityLinks[0]

  // Determine step statuses: prefer stepProgress (SSE) over timer/result
  function getStepStatus(index: number): StepStatus {
    if (stepProgress && stepProgress[index]) {
      const s = stepProgress[index].status
      if (s === "executing") return "executing"
      if (s === "success") return "success"
      if (s === "error") return "failed"
      return "waiting"
    }
    if (executionResult) {
      if (!hasStructuredResult) return "success"
      const line = resultLines[index]
      if (!line) return "waiting"
      if (line.startsWith("\u2713")) return "success"
      if (line.startsWith("\u2717")) return "failed"
      return "waiting"
    }
    if (index < animatedStep) return "success"
    if (index === animatedStep) return "executing"
    return "waiting"
  }

  function getStepError(index: number): string | undefined {
    return stepProgress?.[index]?.status === "error" ? stepProgress[index].error : undefined
  }

  // Map step index to the entity link (if any) when done
  function getLinkForStep(index: number): EntityLink | null {
    if (!executionResult || !hasStructuredResult) return null
    let successCount = 0
    for (let i = 0; i <= index; i++) {
      const line = resultLines[i]
      if (line?.startsWith("\u2713")) {
        if (i === index) return entityLinks[successCount] ?? null
        successCount++
      }
    }
    return null
  }

  // Celebratory success summary (for agent-loop prose or structured results)
  const completionMessage =
    executionResult?.trim().split(/\n/)[0]?.trim() || "Done!"
  const singleCalendarStep =
    steps.length === 1 && steps[0].toolName === "createCalendarEvent"
  const calendarParams = singleCalendarStep ? steps[0].parameters : null

  const hasError = !!executionError
  const borderCls = hasError
    ? "border-red-200 dark:border-red-800/50 bg-red-50/20 dark:bg-red-950/10"
    : "border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-950/10"
  const headerCls = hasError
    ? "border-red-200/60 dark:border-red-800/30 bg-red-100/30 dark:bg-red-900/10"
    : "border-green-200/60 dark:border-green-800/30 bg-green-100/30 dark:bg-green-900/10"
  const headerTextCls = hasError
    ? "text-red-700 dark:text-red-300"
    : "text-green-700 dark:text-green-300"

  return (
    <div
      className={cn(
        "mt-3 rounded-lg border overflow-hidden transition-colors duration-300",
        borderCls
      )}
    >
      {/* Header */}
      <div className={cn("px-4 py-2 border-b", headerCls)}>
        <p className={cn("text-xs font-semibold uppercase tracking-wide", headerTextCls)}>
          {hasError
            ? "Execution failed"
            : executionResult
              ? "Execution Complete"
              : "Executing Plan..."}
        </p>
      </div>

      {/* Steps */}
      <div className="px-4 py-3 space-y-2">
        {steps.map((step, idx) => {
          const status = getStepStatus(idx)
          const link = getLinkForStep(idx)
          const stepError = getStepError(idx)
          const displayDesc =
            stepProgress?.[idx]?.description ?? step.description

          return (
            <div
              key={step.stepNumber}
              className={cn(
                "flex items-start gap-2.5 transition-opacity duration-500",
                status === "waiting" && "opacity-50",
                status === "executing" && "opacity-100",
                status === "success" && "opacity-100",
                status === "failed" && "opacity-100"
              )}
            >
              {/* Status icon */}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
                {status === "waiting" && (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
                )}
                {status === "executing" && (
                  <Loader2 className="h-4 w-4 animate-spin text-green-600 dark:text-green-400" />
                )}
                {status === "success" && (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
                {status === "failed" && (
                  <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                )}
              </div>

              {/* Description + error */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm",
                    status === "failed" && "text-red-600 dark:text-red-400",
                    status === "success" && "text-foreground",
                    status === "waiting" && "text-muted-foreground",
                    status === "executing" && "text-foreground font-medium"
                  )}
                >
                  {displayDesc}
                </span>
                {stepError && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    Error: {stepError}
                  </p>
                )}
              </div>

              {/* Deep link */}
              {link && workspaceSlug && (
                <Link
                  href={link.url}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                >
                  Open
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* Celebratory success card when execution complete (no error) */}
      {executionResult && !hasError && (
        <div
          className={cn(
            "mx-4 mb-4 rounded-lg border p-4",
            "border-green-200 dark:border-green-900",
            "bg-green-50 dark:bg-green-950"
          )}
        >
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-green-900 dark:text-green-100">
                {completionMessage}
              </p>
              {calendarParams && (
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <p>
                    <strong>{String(calendarParams.title ?? "Event")}</strong>
                  </p>
                  {calendarParams.startTime != null &&
                    calendarParams.endTime != null && (
                      <p>
                        {formatTimeRange(
                          String(calendarParams.startTime),
                          String(calendarParams.endTime)
                        )}
                      </p>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error recovery actions */}
      {hasError && (onRetry || onCancel) && (
        <div
          className={cn(
            "px-4 py-2.5 border-t flex items-center gap-2",
            "border-red-200/60 dark:border-red-800/30"
          )}
        >
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="text-xs"
            >
              Retry Failed Step
            </Button>
          )}
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Primary entity link at bottom */}
      {primaryLink && workspaceSlug && executionResult && !hasError && (
        <div className="px-4 py-2.5 border-t border-green-200/60 dark:border-green-800/30">
          <Link
            href={primaryLink.url}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              "bg-green-600 text-white hover:bg-green-700"
            )}
          >
            View {primaryLink.name}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
