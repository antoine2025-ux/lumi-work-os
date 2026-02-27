/**
 * Calendar view component
 * Renders day, week, and month views with event cards
 */

import { format } from 'date-fns'
import type { CalendarEvent } from '@/hooks/use-calendar-events'
import {
  getVisibleWeekDates,
  getMonthDates,
  getTimeSlots,
  getEventsForDate,
  getCurrentTimeGridRow,
  getEventPosition,
  isInCurrentMonth,
} from '@/lib/calendar-utils'

const ROW_HEIGHT_PX = 48
import { EventCard } from './event-card'
import { cn } from '@/lib/utils'

interface CalendarViewProps {
  view: 'day' | 'week' | 'month'
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick?: (date: Date) => void
  showWeekend?: boolean
}

export function CalendarView({
  view,
  currentDate,
  events,
  onEventClick,
  onDayClick,
  showWeekend = false,
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
      showWeekend={showWeekend}
    />
  )
}

// Week View Component
function WeekView({
  currentDate,
  events,
  onEventClick,
  showWeekend = false,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  showWeekend?: boolean
}) {
  const weekDates = getVisibleWeekDates(currentDate, showWeekend)
  const timeSlots = getTimeSlots()
  const currentTimeRow = getCurrentTimeGridRow()
  const today = new Date()

  const colCount = weekDates.length
  return (
    <div className="border rounded-md overflow-hidden bg-card">
      {/* Header: Day names and dates */}
      <div
        className="grid border-b bg-muted/30"
        style={{ gridTemplateColumns: `56px repeat(${colCount}, 1fr)` }}
      >
        <div className="border-r" /> {/* Empty corner */}
        {weekDates.map((date: Date) => {
          const isToday = date.toDateString() === today.toDateString()
          return (
            <div
              key={date.toISOString()}
              className="py-2 px-1.5 text-center border-r last:border-r-0"
            >
              <div className="text-xs text-muted-foreground">
                {format(date, 'EEE')}
              </div>
              <span
                className={cn(
                  'inline-flex items-center justify-center w-8 h-8 rounded-full mt-1 text-sm',
                  isToday && 'bg-amber-500 text-black font-semibold',
                  !isToday && 'font-medium'
                )}
              >
                {format(date, 'd')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-auto max-h-[500px]">
        <div
          className="grid relative"
          style={{ gridTemplateColumns: `56px repeat(${colCount}, 1fr)` }}
        >
          {/* Time labels column */}
          <div className="border-r">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-12 px-1.5 text-xs text-muted-foreground text-right border-b"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Day columns with events */}
          {weekDates.map((date: Date, dayIndex: number) => {
            const dayEvents = getEventsForDate(events, date)
            const isToday = date.toDateString() === today.toDateString()

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  'border-r last:border-r-0 relative',
                  isToday && 'bg-amber-500/5'
                )}
              >
                {/* Time slot backgrounds */}
                {timeSlots.map((time) => (
                  <div
                    key={`${time}-${dayIndex}`}
                    className="h-12 border-b hover:bg-muted/30 transition-colors relative z-0"
                  />
                ))}

                {/* Events - positioned by start/end time */}
                <div className="absolute inset-0 p-1 overflow-hidden z-10 pointer-events-none">
                  {dayEvents.map((event) => {
                    const pos =
                      event.startTime && event.endTime
                        ? getEventPosition(event.startTime, event.endTime)
                        : { top: 0, height: ROW_HEIGHT_PX }
                    if (!pos) return null
                    return (
                      <div
                        key={event.id}
                        className="absolute left-1 right-1 pointer-events-auto"
                        style={{ top: pos.top + 4, height: pos.height - 8 }}
                      >
                        <EventCard
                          event={event}
                          onClick={onEventClick}
                          variant="week"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Current time indicator */}
          {currentTimeRow !== null && (
            <div
              className="absolute left-[56px] right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
              style={{
                top: `${(currentTimeRow - 2) * 48}px`,
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
    <div className="border rounded-md overflow-hidden bg-card">
      {/* Header */}
      <div className="grid grid-cols-[56px_1fr] border-b bg-muted/30">
        <div className="border-r" />
        <div className="py-2 px-4 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm',
              isToday && 'bg-amber-500 text-black font-semibold',
              !isToday && 'font-semibold'
            )}
          >
            {format(currentDate, 'd')}
          </span>
          <div>
            <div className="text-xs text-muted-foreground">
              {format(currentDate, 'EEEE')}
            </div>
            <div className="text-sm">{format(currentDate, 'MMMM yyyy')}</div>
          </div>
        </div>
      </div>

      {/* Time grid */}
      <div className="overflow-auto max-h-[500px]">
        <div className="grid grid-cols-[56px_1fr] relative">
          {/* Time labels */}
          <div className="border-r">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-12 px-1.5 text-xs text-muted-foreground text-right border-b"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Day column with events */}
          <div className={cn('relative', isToday && 'bg-amber-500/5')}>
            {/* Time slot backgrounds */}
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-12 border-b hover:bg-muted/30 transition-colors relative z-0"
              />
            ))}

            {/* Events - positioned by start/end time */}
            <div className="absolute inset-0 p-2 overflow-hidden z-10 pointer-events-none">
              {dayEvents.map((event) => {
                const pos =
                  event.startTime && event.endTime
                    ? getEventPosition(event.startTime, event.endTime)
                    : { top: 0, height: ROW_HEIGHT_PX }
                if (!pos) return null
                return (
                  <div
                    key={event.id}
                    className="absolute left-2 right-2 pointer-events-auto"
                    style={{ top: pos.top + 8, height: pos.height - 16 }}
                  >
                    <EventCard
                      event={event}
                      onClick={onEventClick}
                      variant="day"
                    />
                  </div>
                )
              })}
            </div>

            {/* Current time indicator */}
            {isToday && currentTimeRow !== null && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                style={{
                  top: `${((currentTimeRow - 2) / timeSlots.length) * (timeSlots.length * 48)}px`,
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
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date()

  // Group dates by week
  const weeks: Date[][] = []
  for (let i = 0; i < monthDates.length; i += 7) {
    weeks.push(monthDates.slice(i, i + 7))
  }

  return (
    <div className="border rounded-md overflow-hidden bg-card">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekDays.map((day) => (
          <div key={day} className="py-1.5 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-rows-[repeat(auto-fit,minmax(80px,1fr))]">
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
                    'min-h-[80px] border-r border-b last:border-r-0 p-1.5 cursor-pointer',
                    'hover:bg-muted/30 transition-colors',
                    !isCurrentMonth && 'bg-muted/10',
                    isToday && 'bg-amber-500/5'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm mb-1',
                      isToday && 'bg-amber-500 text-black font-semibold',
                      !isToday && isCurrentMonth && 'font-medium',
                      !isCurrentMonth && 'text-muted-foreground'
                    )}
                  >
                    {format(date, 'd')}
                  </span>
                  
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
