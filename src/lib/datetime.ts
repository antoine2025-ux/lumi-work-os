/**
 * Timezone-aware datetime utilities for Todo filtering
 * Returns UTC Date objects suitable for Prisma queries
 */

import { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

// Default timezone when user hasn't set one
const DEFAULT_TIMEZONE = 'UTC'

// Validate IANA timezone string (basic validation)
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') return false
  
  try {
    // Try to use it with Intl - this will throw if invalid
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/**
 * Get start and end of today in the user's timezone, returned as UTC Date objects
 */
export function getTodayWindow(timezone?: string | null): { start: Date; end: Date } {
  const tz = isValidTimezone(timezone || '') ? timezone! : DEFAULT_TIMEZONE
  const now = new Date()
  
  // Convert current time to the user's timezone
  const zonedNow = toZonedTime(now, tz)
  
  // Get start and end of day in the user's timezone
  const zonedStart = startOfDay(zonedNow)
  const zonedEnd = endOfDay(zonedNow)
  
  // Convert back to UTC for database queries
  const utcStart = fromZonedTime(zonedStart, tz)
  const utcEnd = fromZonedTime(zonedEnd, tz)
  
  return { start: utcStart, end: utcEnd }
}

/**
 * Get start and end of the current week in the user's timezone
 * @param timezone - IANA timezone string
 * @param weekStartsOn - 0 = Sunday, 1 = Monday (default)
 */
export function getWeekWindow(
  timezone?: string | null, 
  weekStartsOn: 0 | 1 = 1
): { start: Date; end: Date } {
  const tz = isValidTimezone(timezone || '') ? timezone! : DEFAULT_TIMEZONE
  const now = new Date()
  
  // Convert current time to the user's timezone
  const zonedNow = toZonedTime(now, tz)
  
  // Get start and end of week in the user's timezone
  const zonedStart = startOfWeek(zonedNow, { weekStartsOn })
  const zonedEnd = endOfWeek(zonedNow, { weekStartsOn })
  
  // Ensure we get end of day for the end of week
  const zonedEndOfDay = endOfDay(zonedEnd)
  
  // Convert back to UTC for database queries
  const utcStart = fromZonedTime(zonedStart, tz)
  const utcEnd = fromZonedTime(zonedEndOfDay, tz)
  
  return { start: utcStart, end: utcEnd }
}

/**
 * Check if a date is before start of today (overdue) in user's timezone
 */
export function isOverdue(dueAt: Date | string, timezone?: string | null): boolean {
  const { start } = getTodayWindow(timezone)
  const due = typeof dueAt === 'string' ? new Date(dueAt) : dueAt
  return due < start
}

/**
 * Check if a date is today in user's timezone
 */
export function isToday(dueAt: Date | string, timezone?: string | null): boolean {
  const { start, end } = getTodayWindow(timezone)
  const due = typeof dueAt === 'string' ? new Date(dueAt) : dueAt
  return due >= start && due <= end
}

/**
 * Get tomorrow's window in the user's timezone
 */
export function getTomorrowWindow(timezone?: string | null): { start: Date; end: Date } {
  const tz = isValidTimezone(timezone || '') ? timezone! : DEFAULT_TIMEZONE
  const now = new Date()
  
  // Convert current time to the user's timezone
  const zonedNow = toZonedTime(now, tz)
  
  // Get tomorrow
  const zonedTomorrow = addDays(zonedNow, 1)
  const zonedStart = startOfDay(zonedTomorrow)
  const zonedEnd = endOfDay(zonedTomorrow)
  
  // Convert back to UTC for database queries
  const utcStart = fromZonedTime(zonedStart, tz)
  const utcEnd = fromZonedTime(zonedEnd, tz)
  
  return { start: utcStart, end: utcEnd }
}

/**
 * Format a date for display, respecting user's timezone
 */
export function formatInTimezone(
  date: Date | string, 
  timezone?: string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const tz = isValidTimezone(timezone || '') ? timezone! : DEFAULT_TIMEZONE
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    ...options
  }
  
  return dateObj.toLocaleDateString('en-US', defaultOptions)
}

