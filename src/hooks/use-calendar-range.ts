/**
 * TanStack Query hook for fetching calendar events with date range
 * Used by the calendar page for day/week/month views
 */

import { useQuery } from '@tanstack/react-query'
import type { CalendarEventsResponse } from './use-calendar-events'

interface UseCalendarRangeOptions {
  start: Date
  end: Date
  enabled?: boolean
}

/**
 * Fetch calendar events for a specific date range
 */
async function fetchCalendarEvents(start: Date, end: Date): Promise<CalendarEventsResponse> {
  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
  })
  
  const response = await fetch(`/api/calendar/events?${params}`)
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch calendar events')
  }
  
  return response.json()
}

/**
 * Hook to fetch calendar events for a date range with caching
 */
export function useCalendarRange({ start, end, enabled = true }: UseCalendarRangeOptions) {
  return useQuery({
    queryKey: ['calendar-events', start.toISOString(), end.toISOString()],
    queryFn: () => fetchCalendarEvents(start, end),
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled,
  })
}
