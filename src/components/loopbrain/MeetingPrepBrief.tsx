"use client"

import {
  Calendar,
  Users,
  FolderKanban,
  MessageSquare,
  FileText,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MeetingPrepBrief as MeetingPrepBriefType } from "@/lib/loopbrain/scenarios/meeting-prep"

// =============================================================================
// Types
// =============================================================================

interface MeetingPrepBriefProps {
  brief?: MeetingPrepBriefType
  isLoading?: boolean
  onDismiss?: () => void
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function MeetingPrepBrief({
  brief,
  isLoading = false,
  onDismiss,
  className,
}: MeetingPrepBriefProps) {
  if (isLoading) {
    return (
      <Card className={cn("border-blue-500/20", className)}>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <Calendar className="h-5 w-5 animate-pulse text-blue-500" />
          <p className="text-sm font-medium">Preparing your meeting brief...</p>
        </CardContent>
      </Card>
    )
  }

  if (!brief) return null

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Header */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-background">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold leading-snug">{brief.meetingTitle}</h2>
                {brief.meetingTime && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{brief.meetingTime}</p>
                )}
              </div>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={onDismiss}
                aria-label="Dismiss meeting prep"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Attendees */}
      {brief.attendees.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Attendees ({brief.attendees.length})</h3>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <ul className="space-y-2">
              {brief.attendees.map((attendee, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {attendee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{attendee.name}</span>
                      {attendee.role && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {attendee.role}
                        </Badge>
                      )}
                      {attendee.team && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {attendee.team}
                        </Badge>
                      )}
                    </div>
                    {attendee.recentActivity && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {attendee.recentActivity}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Project Context */}
      {brief.projectContext && (
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{brief.projectContext.projectName}</h3>
              <Badge
                variant={
                  brief.projectContext.healthStatus === "ACTIVE"
                    ? "default"
                    : brief.projectContext.healthStatus === "CRITICAL"
                      ? "destructive"
                      : "secondary"
                }
                className="text-[10px] px-1.5 py-0"
              >
                {brief.projectContext.healthStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4 space-y-2">
            {brief.projectContext.recentTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Recent Tasks</p>
                <ul className="space-y-0.5">
                  {brief.projectContext.recentTasks.slice(0, 5).map((task, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground">
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {brief.projectContext.blockers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-destructive mb-1">Blockers</p>
                <ul className="space-y-0.5">
                  {brief.projectContext.blockers.map((blocker, idx) => (
                    <li key={idx} className="text-xs text-destructive/80">
                      {blocker}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggested Topics */}
      {brief.suggestedTopics.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Suggested Topics</h3>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <ul className="space-y-1.5">
              {brief.suggestedTopics.map((topic, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">{idx + 1}.</span>
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recent Docs */}
      {brief.recentDocs.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Recent Docs</h3>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <ul className="space-y-1.5">
              {brief.recentDocs.map((doc, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <a href={doc.href} className="text-primary hover:underline truncate">
                    {doc.title}
                  </a>
                  <span className="text-xs text-muted-foreground shrink-0">
                    by {doc.editedBy}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
