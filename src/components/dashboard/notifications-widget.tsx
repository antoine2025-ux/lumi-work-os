"use client"

import { useQuery } from "@tanstack/react-query"
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
    <div className={cn("bg-card rounded-md border border-border flex flex-col h-full min-h-0", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" aria-hidden />
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent Activity</h3>
        </div>
        <div className="flex items-center gap-2"></div>
      </div>
      <div className="p-3 flex-1 space-y-2 max-h-[340px] overflow-y-auto dashboard-card-scroll">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-3 p-2 rounded-md animate-pulse"
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
            const className = "flex flex-col gap-0.5 py-2 px-2 rounded-md hover:bg-muted transition-colors"
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
    </div>
  )
}
