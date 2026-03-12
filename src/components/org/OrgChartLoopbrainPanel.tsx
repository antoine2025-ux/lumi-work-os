"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Sparkles, ChevronDown, ChevronUp, Users, UserCircle2, Building2, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { callOrgLoopbrainAssistant } from "@/lib/loopbrain/client"
import { QuickAskResult } from "@/components/loopbrain/QuickAskResult"
import { useWorkspace } from "@/lib/workspace-context"
import type { LoopbrainResponse } from "@/lib/loopbrain/orchestrator-types"
import type { ProactiveInsightV0 } from "@/lib/loopbrain/contract/proactiveInsight.v0"

interface OrgChartLoopbrainPanelProps {
  selectedPersonId?: string | null
  selectedPersonName?: string | null
  selectedDeptId?: string | null
  selectedDeptName?: string | null
}

type SelectionMode = "default" | "person" | "dept"

function getSelectionMode(
  personId: string | null | undefined,
  deptId: string | null | undefined
): SelectionMode {
  if (personId) return "person"
  if (deptId) return "dept"
  return "default"
}

export function OrgChartLoopbrainPanel({
  selectedPersonId,
  selectedPersonName,
  selectedDeptId,
  selectedDeptName,
}: OrgChartLoopbrainPanelProps) {
  const { currentWorkspace, userRole } = useWorkspace()
  const [isOpen, setIsOpen] = useState(false)

  // Workspace-level insights (loaded once)
  const [insights, setInsights] = useState<ProactiveInsightV0[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)

  // Quick-ask state
  const [activeQuery, setActiveQuery] = useState<string | null>(null)
  const [quickAskLoading, setQuickAskLoading] = useState(false)
  const [quickAskError, setQuickAskError] = useState<string | null>(null)
  const responseCache = useRef<Map<string, LoopbrainResponse>>(new Map())
  const [cachedResponse, setCachedResponse] = useState<LoopbrainResponse | null>(null)

  const selectionMode = getSelectionMode(selectedPersonId, selectedDeptId)

  // Collapse on mobile by default
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsOpen(false)
    }
  }, [])

  // Clear quick-ask when selection changes
  useEffect(() => {
    setActiveQuery(null)
    setCachedResponse(null)
    setQuickAskError(null)
    setQuickAskLoading(false)
  }, [selectedPersonId, selectedDeptId])

  // Load workspace-level insights on mount
  useEffect(() => {
    if (!currentWorkspace) return

    async function fetchInsights() {
      try {
        const res = await fetch(`/api/loopbrain/insights?status=ACTIVE&limit=10`)
        if (!res.ok) {
          setInsightsLoading(false)
          return
        }
        const data = await res.json()
        const all: ProactiveInsightV0[] = data.insights ?? []
        // Show capacity and ownership insights for the default (no-selection) view
        const relevant = all.filter(
          (i) => i.category === "CAPACITY" || i.category === "OWNERSHIP"
        )
        setInsights(relevant.slice(0, 4))
      } catch {
        // Non-critical
      } finally {
        setInsightsLoading(false)
      }
    }
    fetchInsights()
  }, [currentWorkspace])

  const handleQuickAsk = useCallback(async (query: string) => {
    const cacheKey = `${selectionMode}:${selectedPersonId ?? ""}:${selectedDeptId ?? ""}:${query}`

    const cached = responseCache.current.get(cacheKey)
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
      const response = await callOrgLoopbrainAssistant({
        query,
        ...(selectedPersonId ? { personId: selectedPersonId } : {}),
        ...(selectedDeptId ? { teamId: selectedDeptId } : {}),
      })
      responseCache.current.set(cacheKey, response)
      setCachedResponse(response)
    } catch (err: unknown) {
      setQuickAskError(err instanceof Error ? err.message : "Loopbrain couldn't answer right now.")
    } finally {
      setQuickAskLoading(false)
    }
  }, [selectionMode, selectedPersonId, selectedDeptId])

  function handleReset() {
    setActiveQuery(null)
    setCachedResponse(null)
    setQuickAskError(null)
    setQuickAskLoading(false)
  }

  // Don't render for VIEWERs — MEMBER+ only
  if (userRole === "VIEWER" || !currentWorkspace) return null

  // Build quick-asks for the current selection mode
  const personQuickAsks = selectedPersonName
    ? [
        `What is ${selectedPersonName} working on?`,
        `Is ${selectedPersonName} available this week?`,
        `What does ${selectedPersonName} own?`,
      ]
    : []

  const deptQuickAsks = selectedDeptName
    ? [
        `What does ${selectedDeptName} own?`,
        `Does ${selectedDeptName} have capacity?`,
        `Who leads ${selectedDeptName}?`,
      ]
    : []

  const defaultQuickAsks = ["Who is overallocated?", "Any teams without a lead?"]

  const quickAsks =
    selectionMode === "person"
      ? personQuickAsks
      : selectionMode === "dept"
        ? deptQuickAsks
        : defaultQuickAsks

  // Build anchors for "Ask more" in the full panel
  const anchors = {
    ...(selectedPersonId ? { personId: selectedPersonId } : {}),
    ...(selectedDeptId ? { teamId: selectedDeptId } : {}),
  }

  // Panel title based on selection
  const panelTitle =
    selectionMode === "person"
      ? selectedPersonName ?? "Person"
      : selectionMode === "dept"
        ? selectedDeptName ?? "Department"
        : "Org Intelligence"

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border border-border/60 bg-card/50 backdrop-blur-sm mt-4">
        <CardHeader className="p-3 pb-0">
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium text-foreground">Loopbrain</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {selectionMode === "person" && (
                    <>
                      <UserCircle2 className="h-3 w-3" />
                      {panelTitle}
                    </>
                  )}
                  {selectionMode === "dept" && (
                    <>
                      <Building2 className="h-3 w-3" />
                      {panelTitle}
                    </>
                  )}
                  {selectionMode === "default" && (
                    <>
                      <Users className="h-3 w-3" />
                      {panelTitle}
                    </>
                  )}
                </span>
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

            {/* Default view: show workspace-level insights */}
            {selectionMode === "default" && (
              <>
                {insightsLoading && (
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                )}
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
                {!insightsLoading && insights.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No active capacity or ownership alerts. Select a person or department to ask specific questions.
                  </p>
                )}
              </>
            )}

            {/* Person view: show context note */}
            {selectionMode === "person" && selectedPersonName && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Ask about <span className="font-medium text-foreground">{selectedPersonName}</span>
                </p>
                {selectedPersonId && (
                  <Link
                    href={`/org/people/${selectedPersonId}`}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    View profile
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}

            {/* Dept view: show context note */}
            {selectionMode === "dept" && selectedDeptName && (
              <p className="text-xs text-muted-foreground">
                Ask about <span className="font-medium text-foreground">{selectedDeptName}</span>
              </p>
            )}

            {/* Quick-ask buttons (shown when no active query) */}
            {!activeQuery && (
              <div className="flex flex-wrap gap-1.5">
                {quickAsks.map((q) => (
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
                anchors={anchors}
                mode="org"
              />
            )}

            {/* Secondary quick-asks while result is showing */}
            {activeQuery && !quickAskLoading && (cachedResponse || quickAskError) && (
              <div className="flex flex-wrap gap-1.5">
                {quickAsks
                  .filter((q) => q !== activeQuery)
                  .map((q) => (
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
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
