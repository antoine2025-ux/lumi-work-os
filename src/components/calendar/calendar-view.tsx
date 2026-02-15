/**
 * Calendar view component
 * Renders day, week, and month views with event cards
 */

import { format } from 'date-fns'
import type { CalendarEvent } from '@/hooks/use-calendar-events'
import {
  getWeekDates,
  getMonthDates,
  getTimeSlots,
  getEventsForDate,
  getCurrentTimeGridRow,
  isInCurrentMonth,
} from '@/lib/calendar-utils'
import { EventCard } from './event-card'
import { cn } from '@/lib/utils'

interface CalendarViewProps {
  view: 'day' | 'week' | 'month'
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick?: (date: Date) => void
}

export function CalendarView({
  view,
  currentDate,
  events,
  onEventClick,
  onDayClick,
}: CalendarViewProps) {
  if (view === 'month') {
    return (
      <MonthView
        currentDate={currentDate}
        events={events}
        onEventClick={onEventClick}
        onDayClick={onDayClick}
      />
    )
  }
  
  if (view === 'day') {
    return (
      <DayView
        currentDate={currentDate}
        events={events}
        onEventClick={onEventClick}
      />
    )
  }
  
  return (
    <WeekView
      currentDate={currentDate}
      events={events}
      onEventClick={onEventClick}
    />
  )
}

// Week View Component
function WeekView({
  currentDate,
  events,
  onEventClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}) {
  const weekDates = getWeekDates(currentDate)
  const timeSlots = getTimeSlots()
  const currentTimeRow = getCurrentTimeGridRow()
  const today = new Date()

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header: Day names and dates */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
        <div className="border-r" /> {/* Empty corner */}
        {weekDates.map((date) => {
          const isToday = date.toDateString() === today.toDateString()
          return (
            <div
              key={date.toISOString()}
              className="py-3 px-2 text-center border-r last:border-r-0"
            >
              <div className="text-xs text-muted-foreground">
                {format(date, 'EEE')}
              </div>
              <div
                className={cn(
                  'text-sm font-semibold mt-1',
                  isToday && 'text-primary'
                )}
              >
                {format(date, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          {/* Time labels column */}
          <div className="border-r">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-16 px-2 text-xs text-muted-foreground text-right border-b"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Day columns with events */}
          {weekDates.map((date, dayIndex) => {
            const dayEvents = getEventsForDate(events, date)
            const isToday = date.toDateString() === today.toDateString()

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  'border-r last:border-r-0 relative',
                  isToday && 'bg-primary/5'
                )}
              >
                {/* Time slot backgrounds */}
                {timeSlots.map((time) => (
                  <div
                    key={`${time}-${dayIndex}`}
                    className="h-16 border-b hover:bg-muted/30 transition-colors relative z-0"
                  />
                ))}

                {/* Events */}
                <div className="absolute inset-0 p-1 space-y-1 overflow-hidden z-10">
                  {dayEvents.map((event) => (
                    <div key={event.id}>
                      <EventCard
                        event={event}
                        onClick={onEventClick}
                        variant="week"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Current time indicator */}
          {currentTimeRow !== null && (
            <div
              className="absolute left-[60px] right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
              style={{
                top: `${(currentTimeRow - 2) * 64}px`,
              }}
            >
              <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Day View Component
function DayView({
  currentDate,
  events,
  onEventClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}) {
  const timeSlots = getTimeSlots()
  const dayEvents = getEventsForDate(events, currentDate)
  const currentTimeRow = getCurrentTimeGridRow()
  const today = new Date()
  const isToday = currentDate.toDateString() === today.toDateString()

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="grid grid-cols-[60px_1fr] border-b bg-muted/30">
        <div className="border-r" />
        <div className="py-3 px-4">
          <div className="text-xs text-muted-foreground">
            {format(currentDate, 'EEEE')}
          </div>
          <div className={cn('text-sm font-semibold mt-1', isToday && 'text-primary')}>
            {format(currentDate, 'MMMM d, yyyy')}
          </div>
        </div>
      </div>

      {/* Time grid */}
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-[60px_1fr] relative">
          {/* Time labels */}
          <div className="border-r">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-20 px-2 text-xs text-muted-foreground text-right border-b"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Day column with events */}
          <div className={cn('relative', isToday && 'bg-primary/5')}>
            {/* Time slot backgrounds */}
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-20 border-b hover:bg-muted/30 transition-colors relative z-0"
              />
            ))}

            {/* Events */}
            <div className="absolute inset-0 p-2 space-y-2 overflow-hidden z-10">
              {dayEvents.map((event) => (
                <div key={event.id}>
                  <EventCard
                    event={event}
                    onClick={onEventClick}
                    variant="day"
                  />
                </div>
              ))}
            </div>

            {/* Current time indicator */}
            {isToday && currentTimeRow !== null && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                style={{
                  top: `${((currentTimeRow - 2) / timeSlots.length) * (timeSlots.length * 80)}px`,
                }}
              >
                <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Month View Component
function MonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick?: (date: Date) => void
}) {
  const monthDates = getMonthDates(currentDate)
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()

  // Group dates by week
  const weeks: Date[][] = []
  for (let i = 0; i < monthDates.length; i += 7) {
    weeks.push(monthDates.slice(i, i + 7))
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekDays.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-rows-[repeat(auto-fit,minmax(100px,1fr))]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((date) => {
              const dayEvents = getEventsForDate(events, date)
              const isToday = date.toDateString() === today.toDateString()
              const isCurrentMonth = isInCurrentMonth(date, currentDate)
              
              // Limit to 3 events in month view
              const visibleEvents = dayEvents.slice(0, 3)
              const remainingCount = dayEvents.length - visibleEvents.length

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => onDayClick?.(date)}
                  className={cn(
                    'min-h-[100px] border-r border-b last:border-r-0 p-2 cursor-pointer',
                    'hover:bg-muted/30 transition-colors',
                    !isCurrentMonth && 'bg-muted/10',
                    isToday && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'text-sm font-medium mb-1',
                      isToday && 'text-primary',
                      !isCurrentMonth && 'text-muted-foreground'
                    )}
                  >
                    {format(date, 'd')}
                  </div>
                  
                  <div className="space-y-0.5">
                    {visibleEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(event)
                        }}
                      >
                        <EventCard
                          event={event}
                          onClick={() => {}}
                          variant="month"
                        />
                      </div>
                    ))}
                    
                    {remainingCount > 0 && (
                      <div className="text-xs text-muted-foreground px-1.5">
                        +{remainingCount} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
