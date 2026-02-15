'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CalendarEvent } from './use-calendar-events'

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateEventInput {
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  timeZone?: string
  attendees?: string[]
  enableMeet?: boolean
  allDay?: boolean
}

export interface UpdateEventInput {
  eventId: string
  title?: string
  description?: string
  location?: string
  startTime?: string
  endTime?: string
  timeZone?: string
  attendees?: string[]
  enableMeet?: boolean
}

export interface DeleteEventInput {
  eventId: string
}

// ---------------------------------------------------------------------------
// Error class for scope issues
// ---------------------------------------------------------------------------

export class CalendarScopeError extends Error {
  needsReAuth = true
  constructor(message: string) {
    super(message)
    this.name = 'CalendarScopeError'
  }
}

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------

async function calendarFetch<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  body: unknown,
): Promise<T> {
  const response = await fetch('/api/calendar/events', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    if (data.needsReAuth) {
      throw new CalendarScopeError(data.error || 'Calendar permissions need to be upgraded')
    }
    throw new Error(data.error || `Failed to ${method.toLowerCase()} calendar event`)
  }

  return data as T
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateEventInput) =>
      calendarFetch<{ event: CalendarEvent }>('POST', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateEventInput) =>
      calendarFetch<{ event: CalendarEvent }>('PUT', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: DeleteEventInput) =>
      calendarFetch<{ success: boolean }>('DELETE', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })
}
