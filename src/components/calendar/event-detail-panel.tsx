/**
 * Event detail panel component
 * Displays full event details in a centered modal dialog
 */

import { Calendar, Clock, MapPin, Users, Video, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { CalendarEvent } from '@/hooks/use-calendar-events'
import { formatEventTime } from '@/lib/calendar-utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface EventDetailPanelProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (eventId: string) => void
  isDeleting?: boolean
}

export function EventDetailPanel({ event, open, onOpenChange, onEdit, onDelete, isDeleting }: EventDetailPanelProps) {
  if (!event) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const eventStart = event.startTime ? new Date(event.startTime) : null
  const eventEnd = event.endTime ? new Date(event.endTime) : null
  
  const handleJoinMeeting = () => {
    if (event.meetingLink) {
      window.open(event.meetingLink, '_blank')
    }
  }

  const handleViewInCalendar = () => {
    // Open Google Calendar
    window.open('https://calendar.google.com/calendar/', '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl flex-1">{event.title}</DialogTitle>
            <Badge 
              variant={event.priority === 'HIGH' ? 'destructive' : 'secondary'}
              className="flex-shrink-0"
            >
              {event.priority}
            </Badge>
          </div>
          
          {eventStart && (
            <DialogDescription className="text-left">
              {format(eventStart, 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Time */}
          {eventStart && eventEnd && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Time</p>
                <p className="text-sm text-muted-foreground">
                  {formatEventTime(event.startTime!, event.endTime!)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Duration: {event.duration}
                </p>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {event.meetingLink && event.type === 'video' && (
            <div className="flex items-start gap-3">
              <Video className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Video Meeting</p>
                <Button 
                  onClick={handleJoinMeeting}
                  className="w-full"
                  size="sm"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Meeting
                </Button>
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees > 0 && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Attendees</p>
                <p className="text-sm text-muted-foreground">
                  {event.attendees} {event.attendees === 1 ? 'person' : 'people'}
                </p>
                {event.team && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Organized by {event.team}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && event.location !== event.meetingLink && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground break-words">
                  {event.location}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Description</p>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {event.description}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t space-y-2">
            {onEdit && (
              <Button
                onClick={() => onEdit(event)}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            )}
            {onDelete && (
              <Button
                onClick={() => onDelete(event.id)}
                variant="destructive"
                className="w-full"
                size="sm"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete Event'}
              </Button>
            )}
            <Button
              onClick={handleViewInCalendar}
              variant="outline"
              className="w-full"
              size="sm"
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
