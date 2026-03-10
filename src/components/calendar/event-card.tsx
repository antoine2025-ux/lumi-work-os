/**
 * Calendar event card component
 * Displays event information in calendar grid views (Google Calendar style)
 */

import { Users, Video, Phone } from 'lucide-react'
import type { CalendarEvent } from '@/hooks/use-calendar-events'
import { formatEventTime } from '@/lib/calendar-utils'
import { cn } from '@/lib/utils'

/** Color variants for event cards - Google Calendar style */
const EVENT_COLORS = [
  'bg-cyan-500/90 text-white',
  'bg-purple-500/90 text-white',
  'bg-green-500/90 text-white',
  'bg-amber-500/90 text-white',
  'bg-pink-500/90 text-white',
  'bg-blue-500/90 text-white',
] as const

function getEventColor(event: CalendarEvent): (typeof EVENT_COLORS)[number] | string {
  // Multi-calendar overlay: use explicit color when provided
  if (event.color) {
    return event.color
  }
  // Video meetings → cyan
  if (event.type === 'video') return EVENT_COLORS[0]
  // Phone → purple
  if (event.type === 'phone') return EVENT_COLORS[1]
  // Cycle by event id hash for variety
  const hash = event.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return EVENT_COLORS[hash % EVENT_COLORS.length]
}

/**
 * Calculate event duration in minutes from startTime/endTime or duration string
 */
function calculateDurationMinutes(event: CalendarEvent): number {
  if (event.startTime && event.endTime) {
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)
    return (end.getTime() - start.getTime()) / (1000 * 60)
  }
  // Fallback: parse duration string "1h 30m" or "30m"
  if (event.duration) {
    const hours = event.duration.match(/(\d+)h/)?.[1] || '0'
    const minutes = event.duration.match(/(\d+)m/)?.[1] || '0'
    return parseInt(hours) * 60 + parseInt(minutes)
  }
  return 60 // Default 1 hour
}

interface EventCardProps {
  event: CalendarEvent
  onClick: (event: CalendarEvent) => void
  variant?: 'week' | 'day' | 'month'
  className?: string
}

export function EventCard({ event, onClick, variant = 'week', className }: EventCardProps) {
  const colorValue = getEventColor(event)
  const isHexColor = typeof colorValue === 'string' && colorValue.startsWith('#')
  const colorClasses = isHexColor ? '' : (colorValue as (typeof EVENT_COLORS)[number])
  const colorStyle = isHexColor ? { backgroundColor: colorValue, color: 'white' } : undefined

  // Month view: compact pill
  if (variant === 'month') {
    return (
      <div
        onClick={() => onClick(event)}
        className={cn(
          'px-1.5 py-0.5 text-xs rounded cursor-pointer truncate',
          !isHexColor && colorClasses,
          'hover:opacity-90 transition-opacity',
          className
        )}
        style={colorStyle}
        title={`${event.title} - ${event.time}`}
      >
        <span className="truncate font-medium">{event.title}</span>
      </div>
    )
  }

  // Week/Day view: enhanced card with smart truncation and visual hierarchy
  const durationMinutes = calculateDurationMinutes(event)
  const isTallCard = durationMinutes >= 60
  const isMediumCard = durationMinutes >= 30 && durationMinutes < 60
  const isShortCard = durationMinutes < 30

  const paddingClasses = isTallCard ? "px-2.5 py-2" : "px-2 py-1.5"
  
  const titleClasses = cn(
    "leading-tight",
    isTallCard 
      ? "text-sm font-semibold line-clamp-2" 
      : "text-xs font-medium",
    !isTallCard && !isMediumCard && "truncate",
    isMediumCard && "line-clamp-2"
  )

  return (
    <div
      onClick={() => onClick(event)}
      className={cn(
        'rounded cursor-pointer h-full overflow-hidden flex flex-col min-w-0',
        'hover:opacity-95 hover:shadow-md hover:scale-[1.02] hover:z-10',
        'transition-all duration-150 ease-out',
        !isHexColor && colorClasses,
        paddingClasses,
        event.priority === 'HIGH' && "border-l-2 border-white/40",
        variant === 'day' ? 'min-h-[44px]' : 'min-h-[36px]',
        className
      )}
      style={colorStyle}
    >
      <div className="flex items-start gap-1.5 min-w-0">
        {event.type === 'video' && (
          <Video className="h-3 w-3 mt-0.5 opacity-70 flex-shrink-0" />
        )}
        {event.type === 'phone' && (
          <Phone className="h-3 w-3 mt-0.5 opacity-70 flex-shrink-0" />
        )}
        <p className={titleClasses}>{event.title}</p>
      </div>
      {!isShortCard && event.startTime && event.endTime && (
        <div className="text-[10px] opacity-90 mt-0.5 truncate">
          {formatEventTime(event.startTime, event.endTime)}
        </div>
      )}
      {isTallCard && event.attendees > 1 && (
        <div className="flex items-center gap-1 mt-1 opacity-80 text-[10px]">
          <Users className="h-3 w-3 flex-shrink-0" />
          <span>{event.attendees}</span>
        </div>
      )}
    </div>
  )
}
