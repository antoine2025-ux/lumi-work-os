"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sun,
  X,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Activity,
  Calendar,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { DailyBriefing } from "@/lib/loopbrain/scenarios/daily-briefing"
import { cn } from "@/lib/utils"

// =============================================================================
// Types
// =============================================================================

interface DailyBriefingInsight {
  id: string
  createdAt: string
  metadata: {
    userId?: string
    briefing?: DailyBriefing
  }
}

interface DailyBriefingCardProps {
  userId: string
  className?: string
}

// =============================================================================
// Icon Mapping
// =============================================================================

const SECTION_ICONS: Record<string, typeof CheckCircle> = {
  "check-circle": CheckCircle,
  activity: Activity,
  calendar: Calendar,
  "alert-triangle": AlertTriangle,
  lightbulb: Lightbulb,
}

// =============================================================================
// Component
// =============================================================================

export function DailyBriefingCard({ userId, className }: DailyBriefingCardProps) {
  const [insight, setInsight] = useState<DailyBriefingInsight | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/loopbrain/insights?category=DAILY_BRIEFING&status=ACTIVE&limit=1",
        { cache: "no-store" }
      )
      if (!res.ok) return
      const data = (await res.json()) as { insights?: DailyBriefingInsight[] }
      const items = data.insights ?? []
      if (items.length === 0) return

      const item = items[0]
      const createdAt = new Date(item.createdAt)
      const isToday =
        createdAt.toDateString() === new Date().toDateString()
      const belongsToUser = item.metadata?.userId === userId

      if (isToday && belongsToUser && item.metadata?.briefing) {
        setInsight(item)
      }
    } catch {
      // Non-fatal
    }
  }, [userId])

  useEffect(() => {
    void fetchBriefing()
  }, [fetchBriefing])

  const handleDismiss = useCallback(async () => {
    if (!insight) return
    setIsDismissed(true)
    setIsOpen(false)
    try {
      await fetch("/api/loopbrain/insights/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightIds: [insight.id] }),
      })
    } catch {
      // Non-fatal
    }
  }, [insight])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await fetch("/api/loopbrain/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: ["DAILY_BRIEFING"] }),
      })
      await fetchBriefing()
    } catch {
      // Non-fatal
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchBriefing])

  if (!insight || isDismissed) return null

  const briefing = insight.metadata.briefing!
  const taskCount = briefing.sections.find((s) => s.icon === "check-circle")?.items?.length ?? 0
  const meetingCount = briefing.sections.find((s) => s.icon === "calendar")?.items?.length ?? 0
  const alertCount = briefing.sections.find((s) => s.icon === "alert-triangle")?.items?.length ?? 0

  const statParts: string[] = []
  if (taskCount > 0) statParts.push(`${taskCount} task${taskCount !== 1 ? "s" : ""}`)
  if (meetingCount > 0) statParts.push(`${meetingCount} meeting${meetingCount !== 1 ? "s" : ""}`)
  if (alertCount > 0) statParts.push(`${alertCount} alert${alertCount !== 1 ? "s" : ""}`)
  const subtitle = statParts.length > 0 ? statParts.join(" · ") : "All clear today"

  return (
    <>
      <Card
        className={cn(
          "border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-background cursor-pointer hover:border-amber-500/50 transition-colors",
          className
        )}
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsOpen(true)
        }}
        aria-label="View your daily briefing"
      >
        <CardContent className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
            <Sun className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{briefing.greeting}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {subtitle}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-amber-600 font-medium">View briefing</span>
            <ChevronRight className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              void handleDismiss()
            }}
            aria-label="Dismiss briefing"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-600" />
              Daily Briefing
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-xs"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <p className="text-lg font-medium">{briefing.greeting}</p>

            {briefing.sections.map((section, idx) => {
              const Icon = SECTION_ICONS[section.icon] ?? Lightbulb
              return (
                <BriefingSection
                  key={idx}
                  title={section.title}
                  icon={<Icon className="h-4 w-4" />}
                  content={section.content}
                  items={section.items}
                />
              )
            })}

            {briefing.keyActions.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">Key Actions</h3>
                <ul className="space-y-2">
                  {briefing.keyActions.map((action, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Badge
                        variant={
                          action.priority === "high"
                            ? "destructive"
                            : action.priority === "medium"
                              ? "default"
                              : "secondary"
                        }
                        className="text-[10px] px-1.5"
                      >
                        {action.priority}
                      </Badge>
                      {action.href ? (
                        <a href={action.href} className="text-primary hover:underline">
                          {action.title}
                        </a>
                      ) : (
                        <span>{action.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// =============================================================================
// Collapsible Section
// =============================================================================

function BriefingSection({
  title,
  icon,
  content,
  items,
}: {
  title: string
  icon: React.ReactNode
  content: string
  items?: Array<{ text: string; href?: string; badge?: string }>
}) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1 hover:bg-muted/50 rounded px-1 -mx-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-semibold flex-1">{title}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            !isOpen && "-rotate-90"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pt-1 pb-2">
        <p className="text-sm text-muted-foreground whitespace-pre-line">{content}</p>
        {items && items.length > 0 && (
          <ul className="mt-2 space-y-1">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                {item.href ? (
                  <a href={item.href} className="text-primary hover:underline">
                    {item.text}
                  </a>
                ) : (
                  <span>{item.text}</span>
                )}
                {item.badge && (
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {item.badge}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
