/**
 * Event detail panel - Google Calendar style
 * Displays full event details when clicking an event
 */

import { format } from 'date-fns'
import {
  Video,
  Users,
  Bell,
  Pencil,
  Trash2,
  X,
  ExternalLink,
  AlignLeft,
} from 'lucide-react'
import type { CalendarEvent } from '@/hooks/use-calendar-events'
import { formatEventTime } from '@/lib/calendar-utils'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const EVENT_COLOR_INDICATORS = [
  'bg-cyan-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-blue-500',
] as const

function getEventColorIndicator(event: CalendarEvent): string {
  if (event.type === 'video') return EVENT_COLOR_INDICATORS[0]
  if (event.type === 'phone') return EVENT_COLOR_INDICATORS[1]
  const hash = event.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return EVENT_COLOR_INDICATORS[hash % EVENT_COLOR_INDICATORS.length]
}

interface EventDetailPanelProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (eventId: string) => void
  isDeleting?: boolean
}

export function EventDetailPanel({
  event,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  isDeleting,
}: EventDetailPanelProps) {
  if (!event) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">Event details</DialogTitle>
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const eventStart = event.startTime ? new Date(event.startTime) : null
  const eventEnd = event.endTime ? new Date(event.endTime) : null
  const colorIndicator = getEventColorIndicator(event)
  const attendeeList = event.attendeeList || []

  const handleJoinMeeting = () => {
    if (event.meetingLink) {
      window.open(event.meetingLink, '_blank')
    }
  }

  const getMeetButtonLabel = () => {
    if (event.meetingLink?.includes('meet.google.com')) return 'Join with Google Meet'
    if (event.meetingLink?.includes('zoom.us')) return 'Join with Zoom'
    if (event.meetingLink?.includes('teams.microsoft.com')) return 'Join with Teams'
    return 'Join Meeting'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">{event.title}</DialogTitle>

        {/* Header with actions */}
        <div className="flex justify-end gap-2 p-4 pb-0">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(event)}
              className="h-9 w-9"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(event.id)}
              disabled={isDeleting}
              className="h-9 w-9 text-destructive hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-4 pb-4">
          {/* Event info */}
          <div className="flex gap-3 mb-4">
            <div
              className={cn('w-4 h-4 rounded flex-shrink-0 mt-1', colorIndicator)}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-foreground">{event.title}</h2>
              {eventStart && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {format(eventStart, 'EEEE, d MMMM')}
                  {eventEnd &&
                    !(
                      event.startTime?.length === 10 &&
                      event.endTime?.length === 10
                    ) && (
                      <>
                        {' · '}
                        {formatEventTime(event.startTime!, event.endTime!)}
                      </>
                    )}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3 mb-4">
              <AlignLeft className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Video call link */}
          {event.meetingLink && (event.type === 'video' || event.meetingLink) && (
            <div className="flex items-center gap-3 mb-4">
              <Video className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <Button
                onClick={handleJoinMeeting}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {getMeetButtonLabel()}
              </Button>
            </div>
          )}

          {/* Guests */}
          {(event.attendees > 0 || attendeeList.length > 0) && (
            <div className="flex items-start gap-3 mb-4">
              <Users className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">
                  {attendeeList.length > 0
                    ? `${attendeeList.length} guest${attendeeList.length === 1 ? '' : 's'}`
                    : `${event.attendees} guest${event.attendees === 1 ? '' : 's'}`}
                </p>
                {attendeeList.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {attendeeList.map((attendee, idx) => (
                      <div
                        key={attendee.email || idx}
                        className="flex items-center gap-2"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {(attendee.displayName || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm truncate">
                            {attendee.displayName || attendee.email || 'Guest'}
                          </p>
                          {attendee.organizer && (
                            <p className="text-xs text-muted-foreground">
                              Organiser
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {attendeeList.length === 0 && event.team && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Organised by {event.team}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && event.location !== event.meetingLink && (
            <div className="flex items-start gap-3 mb-4">
              <span className="text-muted-foreground text-sm flex-shrink-0">
                📍
              </span>
              <p className="text-sm text-muted-foreground">{event.location}</p>
            </div>
          )}

          {/* Notification placeholder - Google Calendar shows reminder */}
          <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
            <Bell className="w-5 h-5 flex-shrink-0" />
            <span>10 minutes before</span>
          </div>

          {/* Footer: View in Google Calendar */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('https://calendar.google.com/calendar/', '_blank')}
              className="text-muted-foreground"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View in Google Calendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
