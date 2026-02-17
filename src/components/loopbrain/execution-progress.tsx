"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Check, X, Loader2, ExternalLink } from "lucide-react"
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
    const stepIndex = links.length // count of ✓ lines so far = index into plan.steps
    const step = plan.steps[stepIndex]
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ExecutionProgressProps {
  plan: AgentPlan
  executionResult?: string
  isExecuting: boolean
}

const STEP_ANIMATION_MS = 800

export function ExecutionProgress({
  plan,
  executionResult,
  isExecuting,
}: ExecutionProgressProps) {
  const params = useParams()
  const workspaceSlug = (params?.workspaceSlug as string) ?? ""
  const [animatedStep, setAnimatedStep] = useState(0)

  // Timer-based optimistic animation while executing
  useEffect(() => {
    if (!isExecuting) return

    setAnimatedStep(0)
    const interval = setInterval(() => {
      setAnimatedStep((prev) => {
        if (prev >= plan.steps.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, STEP_ANIMATION_MS)

    return () => clearInterval(interval)
  }, [isExecuting, plan.steps.length])

  // Parse final results when execution completes
  const resultLines = executionResult ? executionResult.split("\n") : []
  const entityLinks = executionResult
    ? extractEntityLinks(executionResult, plan, workspaceSlug)
    : []
  const primaryLink = entityLinks[0]

  // Determine step statuses
  function getStepStatus(index: number): StepStatus {
    if (executionResult) {
      // Execution is done — derive from result lines
      const line = resultLines[index]
      if (!line) return "waiting"
      if (line.startsWith("\u2713")) return "success" // ✓
      if (line.startsWith("\u2717")) return "failed"  // ✗
      return "waiting"
    }

    // Still executing — use animation timer
    if (index < animatedStep) return "success"
    if (index === animatedStep) return "executing"
    return "waiting"
  }

  // Map step index to the entity link (if any) when done
  function getLinkForStep(index: number): EntityLink | null {
    if (!executionResult) return null
    // entityLinks are ordered by successful ✓ lines
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

  return (
    <div className="mt-3 rounded-lg border border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-950/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-green-200/60 dark:border-green-800/30 bg-green-100/30 dark:bg-green-900/10">
        <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
          {executionResult ? "Execution Complete" : "Executing Plan..."}
        </p>
      </div>

      {/* Steps */}
      <div className="px-4 py-3 space-y-2">
        {plan.steps.map((step, idx) => {
          const status = getStepStatus(idx)
          const link = getLinkForStep(idx)

          return (
            <div
              key={step.stepNumber}
              className={cn(
                "flex items-center gap-2.5 transition-all duration-300",
                status === "waiting" && "opacity-40",
                status === "executing" && "opacity-100",
                status === "success" && "opacity-100",
                status === "failed" && "opacity-100"
              )}
            >
              {/* Status icon */}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {status === "waiting" && (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
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

              {/* Description */}
              <span
                className={cn(
                  "text-sm flex-1 min-w-0 truncate",
                  status === "failed" && "text-red-600 dark:text-red-400",
                  status === "success" && "text-foreground",
                  status === "waiting" && "text-muted-foreground",
                  status === "executing" && "text-foreground font-medium"
                )}
              >
                {step.description}
              </span>

              {/* Deep link */}
              {link && workspaceSlug && (
                <Link
                  href={link.url}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Open
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* Primary entity link at bottom */}
      {primaryLink && workspaceSlug && executionResult && (
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
