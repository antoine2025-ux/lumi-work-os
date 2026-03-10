/**
 * TanStack Query hook for fetching calendar events with date range
 * Used by the calendar page for day/week/month views
 */

import { useQuery } from '@tanstack/react-query'
import type { CalendarEventsResponse } from './use-calendar-events'

interface UseCalendarRangeOptions {
  start: Date
  end: Date
  personId?: string | null
  enabled?: boolean
}

/**
 * Fetch calendar events for a specific date range and optional person.
 * Exported for use with useQueries when fetching multiple calendars.
 */
export async function fetchCalendarEvents(
  start: Date,
  end: Date,
  personId?: string | null
): Promise<CalendarEventsResponse> {
  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
  })
  if (personId) params.set('personId', personId)

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
export function useCalendarRange({
  start,
  end,
  personId,
  enabled = true,
}: UseCalendarRangeOptions) {
  return useQuery({
    queryKey: ['calendar-events', start.toISOString(), end.toISOString(), personId ?? 'me'],
    queryFn: () => fetchCalendarEvents(start, end, personId),
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled,
  })
}
