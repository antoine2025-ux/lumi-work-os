"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Play,
  Pause,
  History,
  Trash2,
  TestTube,
  Clock,
  Mail,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface PolicyExecution {
  id: string
  status: string
  startedAt: string
  durationMs: number | null
  actionsCount: number
}

interface Policy {
  id: string
  name: string
  description: string | null
  triggerType: string
  scheduleType: string | null
  enabled: boolean
  nextRunAt: string | null
  consecutiveFailures: number
  disabledReason: string | null
  compiledPlan: unknown
  compileError: string | null
  updatedAt: string
  executions: PolicyExecution[]
}

interface PolicyListProps {
  onCreateNew: () => void
  onEdit: (policyId: string) => void
  onViewHistory: (policyId: string) => void
}

export function PolicyList({ onCreateNew, onEdit, onViewHistory }: PolicyListProps) {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/policies")
      if (res.ok) {
        const data = await res.json()
        setPolicies(data.policies)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPolicies()
  }, [fetchPolicies])

  const handleToggle = async (policy: Policy) => {
    setToggling(policy.id)
    try {
      const res = await fetch(`/api/policies/${policy.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !policy.enabled }),
      })
      if (res.ok) {
        await fetchPolicies()
      }
    } catch {
      // silent
    } finally {
      setToggling(null)
    }
  }

  const handleTestRun = async (policyId: string) => {
    setToggling(policyId)
    try {
      await fetch(`/api/policies/${policyId}/test`, { method: "POST" })
      await fetchPolicies()
    } catch {
      // silent
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async (policyId: string) => {
    if (!confirm("Delete this policy? This cannot be undone.")) return
    try {
      await fetch(`/api/policies/${policyId}`, { method: "DELETE" })
      await fetchPolicies()
    } catch {
      // silent
    }
  }

  const getStatusBadge = (policy: Policy) => {
    if (policy.disabledReason) {
      return <Badge variant="destructive">Circuit Breaker</Badge>
    }
    if (!policy.enabled) {
      return <Badge variant="secondary">Paused</Badge>
    }
    if (!policy.compiledPlan) {
      return <Badge variant="outline">Not Compiled</Badge>
    }
    const lastExec = policy.executions[0]
    if (lastExec?.status === "FAILURE") {
      return <Badge variant="destructive">Failed</Badge>
    }
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
  }

  const getTriggerIcon = (triggerType: string) => {
    switch (triggerType) {
      case "SCHEDULE":
        return <Clock className="h-4 w-4" />
      case "EMAIL_KEYWORD":
        return <Mail className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getTriggerLabel = (policy: Policy) => {
    if (policy.triggerType === "SCHEDULE") {
      const labels: Record<string, string> = {
        DAILY: "Daily",
        WEEKLY: "Weekly",
        MONTHLY: "Monthly",
        CRON: "Custom",
      }
      return labels[policy.scheduleType ?? ""] ?? "Scheduled"
    }
    return "Email Trigger"
  }

  const getLastRunInfo = (policy: Policy) => {
    const lastExec = policy.executions[0]
    if (!lastExec) return "Never run"

    const date = new Date(lastExec.startedAt)
    const relative = getRelativeTime(date)
    const icon = lastExec.status === "SUCCESS"
      ? <CheckCircle className="h-3 w-3 text-green-500" />
      : <XCircle className="h-3 w-3 text-red-500" />

    return (
      <span className="flex items-center gap-1">
        {icon}
        {relative}
        {lastExec.durationMs ? ` (${(lastExec.durationMs / 1000).toFixed(1)}s)` : ""}
      </span>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading policies...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Automation Policies</h3>
          <p className="text-sm text-muted-foreground">
            Define rules for Loopbrain to execute autonomously on a schedule or in response to events.
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Policy
        </Button>
      </div>

      {policies.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              No policies yet. Create your first automation policy to get started.
            </p>
            <Button onClick={onCreateNew} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {policies.map((policy) => (
            <Card key={policy.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onEdit(policy.id)}
                      className="text-left hover:underline"
                    >
                      <CardTitle className="text-base">{policy.name}</CardTitle>
                    </button>
                    {getStatusBadge(policy)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={policy.enabled}
                      onCheckedChange={() => handleToggle(policy)}
                      disabled={toggling === policy.id}
                    />
                  </div>
                </div>
                {policy.description && (
                  <CardDescription className="mt-1">{policy.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {getTriggerIcon(policy.triggerType)}
                      {getTriggerLabel(policy)}
                    </span>
                    <span>{getLastRunInfo(policy)}</span>
                    {policy.nextRunAt && policy.enabled && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Next: {new Date(policy.nextRunAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestRun(policy.id)}
                      disabled={!policy.compiledPlan || toggling === policy.id}
                      title="Test run"
                    >
                      <TestTube className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewHistory(policy.id)}
                      title="View history"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(policy.id)}
                      className="text-destructive hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {policy.disabledReason && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {policy.disabledReason}
                  </div>
                )}
                {policy.compileError && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Compile error: {policy.compileError}
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

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
