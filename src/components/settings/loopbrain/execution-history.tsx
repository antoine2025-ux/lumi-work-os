"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from "lucide-react"

interface ActionLog {
  id: string
  stepNumber: number
  toolName: string
  params: Record<string, unknown> | null
  success: boolean
  result: Record<string, unknown> | null
  errorMessage: string | null
  durationMs: number | null
}

interface Execution {
  id: string
  status: string
  triggerSource: string
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  actionsCount: number
  errorMessage: string | null
  userFeedback: string | null
  actionLogs?: ActionLog[]
}

interface ExecutionHistoryProps {
  policyId: string
  policyName: string
  onBack: () => void
}

export function ExecutionHistory({ policyId, policyName, onBack }: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)

  const fetchExecutions = useCallback(async () => {
    try {
      const res = await fetch(`/api/policies/${policyId}/executions`)
      if (res.ok) {
        const data = await res.json()
        setExecutions(data.executions)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [policyId])

  useEffect(() => {
    fetchExecutions()
  }, [fetchExecutions])

  const toggleExpand = async (execId: string) => {
    if (expandedId === execId) {
      setExpandedId(null)
      return
    }

    const exec = executions.find((e) => e.id === execId)
    if (exec?.actionLogs) {
      setExpandedId(execId)
      return
    }

    setLoadingDetail(execId)
    try {
      const res = await fetch(`/api/policies/${policyId}/executions/${execId}`)
      if (res.ok) {
        const data = await res.json()
        setExecutions((prev) =>
          prev.map((e) =>
            e.id === execId ? { ...e, actionLogs: data.execution.actionLogs } : e,
          ),
        )
        setExpandedId(execId)
      }
    } catch {
      // silent
    } finally {
      setLoadingDetail(null)
    }
  }

  const submitFeedback = async (execId: string, feedback: "thumbs_up" | "thumbs_down") => {
    try {
      await fetch(`/api/policies/${policyId}/executions/${execId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      })
      setExecutions((prev) =>
        prev.map((e) => (e.id === execId ? { ...e, userFeedback: feedback } : e)),
      )
    } catch {
      // silent
    }
  }

  const handleRerun = async () => {
    try {
      await fetch(`/api/policies/${policyId}/test`, { method: "POST" })
      await fetchExecutions()
    } catch {
      // silent
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Success</Badge>
      case "FAILURE":
        return <Badge variant="destructive">Failed</Badge>
      case "TIMEOUT":
        return <Badge variant="destructive">Timeout</Badge>
      case "RUNNING":
        return <Badge variant="secondary">Running</Badge>
      case "PARTIAL":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Partial</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading execution history...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h3 className="text-lg font-semibold">Execution History</h3>
            <p className="text-sm text-muted-foreground">{policyName}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRerun}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Run Now
        </Button>
      </div>

      {executions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No executions yet. Test-run the policy or wait for the next scheduled run.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {executions.map((exec) => (
            <Card key={exec.id}>
              <CardContent className="p-4">
                <button
                  onClick={() => toggleExpand(exec.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {loadingDetail === exec.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : expandedId === exec.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {getStatusBadge(exec.status)}
                      <span className="text-sm">
                        {new Date(exec.startedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{exec.actionsCount} actions</span>
                      {exec.durationMs && (
                        <span>{(exec.durationMs / 1000).toFixed(1)}s</span>
                      )}
                      <span className="text-xs">{exec.triggerSource}</span>
                    </div>
                  </div>
                </button>

                {exec.errorMessage && (
                  <div className="mt-2 text-sm text-destructive pl-7">
                    {exec.errorMessage}
                  </div>
                )}

                {expandedId === exec.id && exec.actionLogs && (
                  <div className="mt-3 pl-7 space-y-2">
                    {exec.actionLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-2 rounded text-sm border ${
                          log.success
                            ? "border-green-200 dark:border-green-800"
                            : "border-red-200 dark:border-red-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Step {log.stepNumber}
                            </Badge>
                            <span className="font-mono text-xs">{log.toolName}</span>
                          </div>
                          {log.durationMs && (
                            <span className="text-xs text-muted-foreground">
                              {log.durationMs}ms
                            </span>
                          )}
                        </div>
                        {log.errorMessage && (
                          <div className="mt-1 text-xs text-destructive">
                            {log.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs text-muted-foreground">Was this helpful?</span>
                      <Button
                        variant={exec.userFeedback === "thumbs_up" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => submitFeedback(exec.id, "thumbs_up")}
                        className="h-7 w-7 p-0"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={exec.userFeedback === "thumbs_down" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => submitFeedback(exec.id, "thumbs_down")}
                        className="h-7 w-7 p-0"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
