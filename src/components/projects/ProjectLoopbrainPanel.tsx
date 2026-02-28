"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { callLoopbrainAssistant } from "@/lib/loopbrain/client"
import { QuickAskResult } from "@/components/loopbrain/QuickAskResult"
import type { LoopbrainResponse } from "@/lib/loopbrain/orchestrator-types"
import type { ProjectHealthSnapshotV0, OverallHealthV0 } from "@/lib/loopbrain/contract/projectHealth.v0"
import type { ProactiveInsightV0 } from "@/lib/loopbrain/contract/proactiveInsight.v0"

interface ProjectLoopbrainPanelProps {
  projectId: string
  projectName: string
  workspaceId: string
}

const HEALTH_CONFIG: Record<OverallHealthV0, { label: string; className: string }> = {
  EXCELLENT: { label: "Excellent", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  GOOD:      { label: "Good",      className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  AT_RISK:   { label: "At Risk",   className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  CRITICAL:  { label: "Critical",  className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
}

const QUICK_ASKS = [
  "What's blocking this project?",
  "Who has capacity to help?",
  "What decisions are pending?",
] as const

type QuickAsk = typeof QUICK_ASKS[number]

export function ProjectLoopbrainPanel({ projectId, projectName, workspaceId: _workspaceId }: ProjectLoopbrainPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [health, setHealth] = useState<ProjectHealthSnapshotV0 | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState(false)
  const [insights, setInsights] = useState<ProactiveInsightV0[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)

  // Quick-ask state: caches per query string
  const [activeQuery, setActiveQuery] = useState<QuickAsk | null>(null)
  const [quickAskLoading, setQuickAskLoading] = useState(false)
  const [quickAskError, setQuickAskError] = useState<string | null>(null)
  const responseCache = useRef<Map<string, LoopbrainResponse>>(new Map())
  const [cachedResponse, setCachedResponse] = useState<LoopbrainResponse | null>(null)

  // Collapse on mobile by default — use a ref to avoid SSR mismatch
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsOpen(false)
    }
  }, [])

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch(`/api/loopbrain/project-health?projectId=${projectId}`)
        if (!res.ok) {
          if (res.status === 403 || res.status === 401) return
          setHealthError(true)
          return
        }
        const data: ProjectHealthSnapshotV0 = await res.json()
        setHealth(data)
      } catch {
        setHealthError(true)
      } finally {
        setHealthLoading(false)
      }
    }
    fetchHealth()
  }, [projectId])

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch(`/api/loopbrain/insights?status=ACTIVE&category=PROJECT`)
        if (!res.ok) {
          setInsightsLoading(false)
          return
        }
        const data = await res.json()
        const all: ProactiveInsightV0[] = data.insights ?? []
        // Filter to insights that mention this project in affectedEntities
        const relevant = all.filter((i) =>
          i.affectedEntities.some((e) => e.entityId === projectId)
        )
        setInsights(relevant.slice(0, 3))
      } catch {
        // Insights are non-critical — fail silently
      } finally {
        setInsightsLoading(false)
      }
    }
    fetchInsights()
  }, [projectId])

  const handleQuickAsk = useCallback(async (query: QuickAsk) => {
    // Show cached result immediately
    const cached = responseCache.current.get(query)
    if (cached) {
      setActiveQuery(query)
      setCachedResponse(cached)
      setQuickAskError(null)
      return
    }

    setActiveQuery(query)
    setCachedResponse(null)
    setQuickAskLoading(true)
    setQuickAskError(null)

    try {
      const response = await callLoopbrainAssistant({
        mode: "spaces",
        query,
        projectId,
      })
      responseCache.current.set(query, response)
      setCachedResponse(response)
    } catch (err) {
      setQuickAskError(err instanceof Error ? err.message : "Loopbrain couldn't answer right now.")
    } finally {
      setQuickAskLoading(false)
    }
  }, [projectId])

  function handleReset() {
    setActiveQuery(null)
    setCachedResponse(null)
    setQuickAskError(null)
    setQuickAskLoading(false)
  }

  const healthCfg = health ? HEALTH_CONFIG[health.summary.overallHealth] : null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="p-3 pb-0">
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium text-foreground">Loopbrain</span>
                {!healthLoading && health && healthCfg && (
                  <Badge
                    className={cn("h-4 px-1.5 text-[10px] font-medium rounded-full border-0", healthCfg.className)}
                  >
                    {healthCfg.label}
                  </Badge>
                )}
                {!healthLoading && health && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(health.summary.healthScore * 100)}% health
                    {health.summary.activeBlockerCount > 0 && (
                      <span className="ml-1 text-destructive">
                        · {health.summary.activeBlockerCount} blocker{health.summary.activeBlockerCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                )}
                {healthLoading && <Skeleton className="h-3 w-24" />}
              </div>
              {isOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-3 pt-2 space-y-3">
            {/* Health summary row */}
            {!healthLoading && health && !healthError && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground border-b border-border/40 pb-2">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {health.progress.tasks.completed}/{health.progress.tasks.total} tasks done
                </span>
                {health.summary.daysToNextMilestone !== null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {health.summary.daysToNextMilestone}d to next milestone
                  </span>
                )}
                {health.resourceHealth.unassignedTaskCount > 0 && (
                  <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-3 w-3" />
                    {health.resourceHealth.unassignedTaskCount} unassigned
                  </span>
                )}
                <span
                  className={cn(
                    "ml-auto",
                    health.summary.onTrack ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"
                  )}
                >
                  {health.summary.onTrack ? "On track" : "Needs attention"}
                </span>
              </div>
            )}
            {healthLoading && (
              <div className="flex gap-3 border-b border-border/40 pb-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            )}

            {/* Proactive insights */}
            {!insightsLoading && insights.length > 0 && (
              <div className="space-y-1">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-xs",
                      insight.priority === "CRITICAL" || insight.priority === "HIGH"
                        ? "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                        : "bg-muted/60 text-muted-foreground"
                    )}
                  >
                    <span className="font-medium">{insight.title}</span>
                    {" — "}
                    {insight.description}
                  </div>
                ))}
              </div>
            )}

            {/* Quick-ask buttons */}
            {!activeQuery && (
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ASKS.map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs rounded-full border-border/60 hover:border-primary/40 hover:text-primary"
                    onClick={() => handleQuickAsk(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            )}

            {/* Quick-ask result */}
            {activeQuery && (
              <QuickAskResult
                query={activeQuery}
                isLoading={quickAskLoading}
                response={cachedResponse}
                error={quickAskError}
                onReset={handleReset}
                anchors={{ projectId }}
                mode="spaces"
              />
            )}

            {/* Fallback: show quick-asks again below result for follow-up */}
            {activeQuery && !quickAskLoading && (cachedResponse || quickAskError) && (
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ASKS.filter((q) => q !== activeQuery).map((q) => (
                  <Button
                    key={q}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => handleQuickAsk(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            )}

            {/* Empty state for project name context */}
            {!healthLoading && !health && !healthError && (
              <p className="text-xs text-muted-foreground">
                Ask Loopbrain about <span className="font-medium">{projectName}</span>:
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
