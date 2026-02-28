"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ProactiveInsightV0 } from "@/lib/loopbrain/contract/proactiveInsight.v0"

// =============================================================================
// Types
// =============================================================================

interface HealthAlertItem {
  id: string
  projectId: string
  projectName: string
  alertType: string
  priority: string
  title: string
  suggestedAction: string
}

interface InsightBatchResponse {
  insights?: ProactiveInsightV0[]
}

// =============================================================================
// Helpers
// =============================================================================

const PRIORITY_CONFIG = {
  CRITICAL: {
    border: "border-l-red-500",
    icon: AlertTriangle,
    iconClass: "text-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  HIGH: {
    border: "border-l-amber-500",
    icon: AlertCircle,
    iconClass: "text-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  MEDIUM: {
    border: "border-l-blue-400",
    icon: Info,
    iconClass: "text-blue-400",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
} as const

function getPriorityConfig(priority: string) {
  if (priority === "CRITICAL") return PRIORITY_CONFIG.CRITICAL
  if (priority === "HIGH") return PRIORITY_CONFIG.HIGH
  return PRIORITY_CONFIG.MEDIUM
}

function parseAlerts(insights: ProactiveInsightV0[]): HealthAlertItem[] {
  return insights
    .filter((i) => {
      const meta = i.metadata as Record<string, unknown> | undefined
      return typeof meta?.alertType === "string"
    })
    .map((i) => {
      const meta = i.metadata as Record<string, string>
      const entity = i.affectedEntities?.[0]
      return {
        id: i.id,
        projectId: entity?.entityId ?? "",
        projectName: entity?.label ?? "Unknown project",
        alertType: meta.alertType,
        priority: i.priority,
        title: i.title,
        suggestedAction: meta.suggestedAction ?? i.recommendations?.[0]?.action ?? "",
      }
    })
    .filter((a) => a.projectId !== "")
}

// =============================================================================
// Component
// =============================================================================

interface ProjectHealthAlertsProps {
  className?: string
}

export function ProjectHealthAlerts({ className }: ProjectHealthAlertsProps) {
  const [alerts, setAlerts] = useState<HealthAlertItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch(
          "/api/loopbrain/insights?status=ACTIVE&category=PROJECT&limit=20"
        )
        if (!res.ok) return
        const data: InsightBatchResponse = await res.json()
        const parsed = parseAlerts(data.insights ?? [])
        setAlerts(parsed)
      } catch {
        // Non-critical widget — fail silently
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  const displayed = alerts.slice(0, 5)
  const hasMore = alerts.length > 5

  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 rounded-lg bg-muted/60 animate-pulse border-l-4 border-l-muted"
          />
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30",
          className
        )}
      >
        <CheckCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-700 dark:text-green-300">
          All projects are healthy
        </span>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {displayed.map((alert) => {
        const cfg = getPriorityConfig(alert.priority)
        const Icon = cfg.icon

        return (
          <Link
            key={alert.id}
            href={`/projects/${alert.projectId}`}
            className={cn(
              "group flex items-start gap-3 rounded-lg border border-border/60 border-l-4 bg-card px-3 py-2.5 transition-colors hover:bg-muted/40",
              cfg.border
            )}
          >
            <Icon
              className={cn("mt-0.5 h-4 w-4 shrink-0", cfg.iconClass)}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <Badge
                  className={cn(
                    "h-4 px-1.5 text-[10px] font-medium rounded-full border-0 shrink-0",
                    cfg.badge
                  )}
                >
                  {alert.projectName}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground leading-tight truncate">
                {alert.title}
              </p>
              {alert.suggestedAction && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {alert.suggestedAction}
                </p>
              )}
            </div>
            <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        )
      })}

      {hasMore && (
        <Link
          href="/projects"
          className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          View {alerts.length - 5} more alert{alerts.length - 5 > 1 ? "s" : ""}
          &nbsp;&rarr;
        </Link>
      )}
    </div>
  )
}
