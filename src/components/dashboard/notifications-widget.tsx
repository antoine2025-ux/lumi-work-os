"use client"

import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Activity, Loader2 } from "lucide-react"
import Link from "next/link"
import { useWorkspace } from "@/lib/workspace-context"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface ActivityItem {
  id: string
  entity: string
  entityId: string
  action: string
  actorName: string
  createdAt: string
  url: string
}

interface NotificationsWidgetProps {
  className?: string
}

function formatActivityDescription(item: ActivityItem): string {
  const actor = item.actorName || "Someone"
  const entityLabel =
    item.entity === "goal"
      ? "goal"
      : item.entity === "task"
        ? "task"
        : item.entity === "wiki_page"
          ? "page"
          : item.entity === "project"
            ? "project"
            : "item"
  const actionLabel =
    item.action === "WORKFLOW_NOTIFICATION"
      ? "received a notification about"
      : item.action === "GOAL_ESCALATED"
        ? "escalated"
        : item.action === "created"
          ? "created"
          : item.action === "updated"
            ? "updated"
            : item.action === "completed"
              ? "completed"
              : item.action.toLowerCase().replace(/_/g, " ")
  return `${actor} ${actionLabel} ${entityLabel}`
}

export function NotificationsWidget({ className }: NotificationsWidgetProps) {
  const { currentWorkspace } = useWorkspace()
  const baseHref = currentWorkspace?.slug ? `/w/${currentWorkspace.slug}` : ""

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "activity", currentWorkspace?.id],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/activity?limit=10")
      if (!response.ok) throw new Error("Failed to fetch activity")
      const json = await response.json()
      return (json.items ?? []) as ActivityItem[]
    },
    enabled: !!currentWorkspace,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })

  const items = data ?? []

  return (
    <Card className={cn("widget-card", className)}>
      <div className="widget-header">
        <div className="widget-header-start">
          <Activity className="h-4 w-4 flex-shrink-0" aria-hidden />
          <span className="widget-title">RECENT ACTIVITY</span>
        </div>
        <div className="widget-actions"></div>
      </div>
      <div className="widget-content space-y-2 max-h-[340px] overflow-y-auto dashboard-card-scroll">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-3 p-3 rounded-lg animate-pulse"
              >
                <div className="w-4 h-4 bg-muted rounded flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          items.map((item) => {
            const content = (
              <>
                <p className="text-sm truncate">{formatActivityDescription(item)}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </>
            )
            const className = "flex flex-col gap-0.5 py-2 px-3 rounded-lg hover:bg-muted transition-colors"
            return item.url !== "#" ? (
              <Link key={item.id} href={`${baseHref}${item.url}`} className={className}>
                {content}
              </Link>
            ) : (
              <div key={item.id} className={className}>
                {content}
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
