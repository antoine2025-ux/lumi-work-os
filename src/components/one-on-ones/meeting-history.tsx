'use client'

import Link from 'next/link'
import { CheckCircle2, Clock, XCircle, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Meeting {
  id: string
  scheduledAt: string | Date
  status: string
  _count: {
    talkingPoints: number
    actionItems: number
  }
}

interface MeetingHistoryProps {
  meetings: Meeting[]
  seriesId: string
  workspaceSlug: string
}

const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  SCHEDULED: { icon: Clock, label: 'Scheduled', color: 'text-blue-600' },
  IN_PROGRESS: { icon: Clock, label: 'In Progress', color: 'text-amber-600' },
  COMPLETED: { icon: CheckCircle2, label: 'Completed', color: 'text-green-600' },
  CANCELLED: { icon: XCircle, label: 'Cancelled', color: 'text-muted-foreground' },
  RESCHEDULED: { icon: Calendar, label: 'Rescheduled', color: 'text-orange-600' },
}

function formatMeetingDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMeetingTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function MeetingHistory({ meetings, seriesId, workspaceSlug }: MeetingHistoryProps) {
  if (meetings.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No meetings yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {meetings.map((meeting, index) => {
        const config = statusConfig[meeting.status] ?? statusConfig.SCHEDULED
        const StatusIcon = config.icon
        const isUpcoming = new Date(meeting.scheduledAt) > new Date()

        return (
          <Link
            key={meeting.id}
            href={`/w/${workspaceSlug}/one-on-ones/${seriesId}/${meeting.id}`}
          >
            <div
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer',
                index === 0 && isUpcoming && 'bg-primary/5 border border-primary/10'
              )}
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <StatusIcon className={cn('h-4 w-4', config.color)} />
                {index < meetings.length - 1 && (
                  <div className="w-px h-full bg-border mt-1 min-h-[8px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatMeetingDate(meeting.scheduledAt)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatMeetingTime(meeting.scheduledAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="outline"
                    className={cn('text-[10px]', config.color)}
                  >
                    {config.label}
                  </Badge>
                  {meeting._count.talkingPoints > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {meeting._count.talkingPoints} points
                    </span>
                  )}
                  {meeting._count.actionItems > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {meeting._count.actionItems} actions
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
