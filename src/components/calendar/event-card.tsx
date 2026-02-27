/**
 * Calendar event card component
 * Displays event information in calendar grid views (Google Calendar style)
 */

import { Users } from 'lucide-react'
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

  // Week/Day view: detailed card with title prominent
  return (
    <div
      onClick={() => onClick(event)}
      className={cn(
        'rounded px-2 py-1 cursor-pointer transition-all hover:opacity-90 h-full overflow-hidden flex flex-col min-w-0',
        !isHexColor && colorClasses,
        variant === 'day' ? 'min-h-[44px]' : 'min-h-[36px]',
        className
      )}
      style={colorStyle}
    >
      <div className="font-medium text-xs truncate leading-tight">{event.title}</div>
      {event.startTime && event.endTime && (
        <div className="text-[10px] opacity-90 mt-0.5 truncate">
          {formatEventTime(event.startTime, event.endTime)}
        </div>
      )}
      {event.attendees > 0 && (
        <div className="flex items-center gap-1 mt-0.5 opacity-80 text-[10px]">
          <Users className="w-3 h-3 flex-shrink-0" />
          <span>{event.attendees}</span>
        </div>
      )}
    </div>
  )
}
