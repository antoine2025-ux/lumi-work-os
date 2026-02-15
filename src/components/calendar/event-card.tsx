/**
 * Calendar event card component
 * Displays event information in calendar grid views
 */

import { Video, Phone } from 'lucide-react'
import type { CalendarEvent } from '@/hooks/use-calendar-events'
import { formatEventTime } from '@/lib/calendar-utils'
import { cn } from '@/lib/utils'

interface EventCardProps {
  event: CalendarEvent
  onClick: (event: CalendarEvent) => void
  variant?: 'week' | 'day' | 'month'
  className?: string
}

export function EventCard({ event, onClick, variant = 'week', className }: EventCardProps) {
  const isVideoMeeting = event.type === 'video' && event.meetingLink
  
  // Month view: compact dot/pill
  if (variant === 'month') {
    return (
      <div
        onClick={() => onClick(event)}
        className={cn(
          'px-1.5 py-0.5 text-xs rounded cursor-pointer truncate',
          'hover:opacity-80 transition-opacity',
          isVideoMeeting ? 'bg-blue-500/20 text-blue-300' : 'bg-muted text-muted-foreground',
          className
        )}
        title={`${event.title} - ${event.time}`}
      >
        <span className="truncate">{event.title}</span>
      </div>
    )
  }
  
  // Week/Day view: detailed card
  return (
    <div
      onClick={() => onClick(event)}
      className={cn(
        'p-2 rounded-lg cursor-pointer transition-all',
        'hover:ring-2 hover:ring-primary/50',
        'overflow-hidden',
        isVideoMeeting 
          ? 'bg-blue-500/10 border border-blue-500/30' 
          : 'bg-muted/50 border border-border',
        variant === 'day' ? 'min-h-[80px]' : 'min-h-[60px]',
        className
      )}
    >
      <div className="flex items-start gap-1.5">
        {isVideoMeeting ? (
          <Video className="h-3 w-3 text-blue-400 flex-shrink-0 mt-0.5" />
        ) : event.type === 'phone' ? (
          <Phone className="h-3 w-3 text-green-400 flex-shrink-0 mt-0.5" />
        ) : null}
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground">
            {event.title}
          </p>
          
          {event.startTime && event.endTime && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatEventTime(event.startTime, event.endTime)}
            </p>
          )}
          
          {variant === 'day' && event.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
          
          {event.attendees > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {event.attendees} {event.attendees === 1 ? 'person' : 'people'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
