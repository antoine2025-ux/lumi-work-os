/**
 * Calendar utility functions for date calculations and event formatting
 */

import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay,
  format,
  startOfDay,
  endOfDay
} from 'date-fns'
import type { CalendarEvent } from '@/hooks/use-calendar-events'

/**
 * Get array of 7 dates for week view
 * @param date - Reference date (defaults to today)
 * @param weekStartsOn - 0 = Sunday, 1 = Monday (default: 0)
 */
export function getWeekDates(date: Date = new Date(), weekStartsOn: 0 | 1 = 0): Date[] {
  const start = startOfWeek(date, { weekStartsOn })
  const end = endOfWeek(date, { weekStartsOn })
  
  return eachDayOfInterval({ start, end })
}

/**
 * Get array of dates for month grid (includes prev/next month padding)
 * @param date - Reference date (defaults to today)
 * @param weekStartsOn - 0 = Sunday, 1 = Monday (default: 0)
 */
export function getMonthDates(date: Date = new Date(), weekStartsOn: 0 | 1 = 0): Date[] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  
  // Get the start of the week containing the first day of the month
  const gridStart = startOfWeek(monthStart, { weekStartsOn })
  
  // Get the end of the week containing the last day of the month
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn })
  
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

/**
 * Format event time range
 * @param startTime - ISO date string or Date
 * @param endTime - ISO date string or Date
 */
export function formatEventTime(startTime: string | Date, endTime: string | Date): string {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime
  
  // Check if it's an all-day event (no time component)
  const isAllDay = start.getHours() === 0 && start.getMinutes() === 0 && 
                   end.getHours() === 0 && end.getMinutes() === 0
  
  if (isAllDay) {
    return 'All day'
  }
  
  const startStr = format(start, 'h:mm a')
  const endStr = format(end, 'h:mm a')
  
  return `${startStr} - ${endStr}`
}

/**
 * Get time slots for day/week view (7:00 AM - 9:00 PM)
 */
export function getTimeSlots(): string[] {
  const slots: string[] = []
  
  // 7 AM to 9 PM (14 hours)
  for (let hour = 7; hour <= 21; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour
    slots.push(`${displayHour}:00 ${period}`)
  }
  
  return slots
}

/**
 * Get detailed time slots for day view (30-minute intervals)
 */
export function getDetailedTimeSlots(): string[] {
  const slots: string[] = []
  
  // 7 AM to 9 PM with 30-minute intervals
  for (let hour = 7; hour <= 21; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour
    
    slots.push(`${displayHour}:00 ${period}`)
    if (hour < 21) {
      slots.push(`${displayHour}:30 ${period}`)
    }
  }
  
  return slots
}

/**
 * Filter events for a specific date
 */
export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter(event => {
    if (!event.startTime) return false
    
    const eventStart = new Date(event.startTime)
    return isSameDay(eventStart, date)
  })
}

/**
 * Parse event dates from ISO strings
 */
export function parseEventDates(event: CalendarEvent): {
  start: Date | null
  end: Date | null
} {
  return {
    start: event.startTime ? new Date(event.startTime) : null,
    end: event.endTime ? new Date(event.endTime) : null,
  }
}

/**
 * Calculate grid position for event in time-based view
 * @param startTime - Event start time
 * @param endTime - Event end time
 * @returns Grid row start and span
 */
export function calculateEventGridPosition(
  startTime: Date,
  endTime: Date
): { rowStart: number; rowSpan: number } {
  const startHour = startTime.getHours()
  const startMinute = startTime.getMinutes()
  const endHour = endTime.getHours()
  const endMinute = endTime.getMinutes()
  
  // Grid starts at 7 AM (hour 7)
  const baseHour = 7
  
  // Calculate row start (1-based, each hour is 1 row)
  // Add 2 to account for header row
  const rowStart = (startHour - baseHour) + (startMinute / 60) + 2
  
  // Calculate duration in hours
  const durationHours = (endHour - startHour) + (endMinute - startMinute) / 60
  
  // Each row is 1 hour, minimum span of 0.5 (30 minutes)
  const rowSpan = Math.max(durationHours, 0.5)
  
  return {
    rowStart: Math.round(rowStart * 2), // Double for 30-minute precision
    rowSpan: Math.round(rowSpan * 2),
  }
}

/**
 * Get date range for calendar view
 */
export function getDateRangeForView(
  view: 'day' | 'week' | 'month',
  currentDate: Date
): { start: Date; end: Date } {
  switch (view) {
    case 'day':
      return {
        start: startOfDay(currentDate),
        end: endOfDay(currentDate),
      }
    case 'week': {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
      return {
        start: startOfDay(weekStart),
        end: endOfDay(weekEnd),
      }
    }
    case 'month': {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      // Extend to full weeks
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
      return {
        start: startOfDay(gridStart),
        end: endOfDay(gridEnd),
      }
    }
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(
  view: 'day' | 'week' | 'month',
  currentDate: Date
): string {
  switch (view) {
    case 'day':
      return format(currentDate, 'EEEE, MMMM d, yyyy')
    case 'week': {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
      
      // If same month, show "Jan 1 - 7, 2024"
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`
      }
      // Different months: "Jan 29 - Feb 4, 2024"
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    }
    case 'month':
      return format(currentDate, 'MMMM yyyy')
  }
}

/**
 * Check if a date is in the current month
 */
export function isInCurrentMonth(date: Date, referenceDate: Date): boolean {
  return date.getMonth() === referenceDate.getMonth() &&
         date.getFullYear() === referenceDate.getFullYear()
}

/**
 * Get current time as grid row position
 * Used for the "current time" indicator line
 */
export function getCurrentTimeGridRow(): number | null {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  
  // Only show indicator during business hours (7 AM - 9 PM)
  if (currentHour < 7 || currentHour > 21) {
    return null
  }
  
  // Calculate position (7 AM = row 2)
  const baseHour = 7
  const rowPosition = (currentHour - baseHour) + (currentMinute / 60) + 2
  
  return rowPosition * 2 // Double for 30-minute precision
}
