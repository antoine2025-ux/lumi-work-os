/**
 * Calendar Events Helper
 *
 * Shared server-side logic for creating Google Calendar events.
 * Used by: POST /api/integrations/calendar/events/create and Loopbrain
 * createCalendarEvent/createMultipleCalendarEvents tools.
 *
 * Uses getGoogleCalendarClient() (same auth path as the working calendar read route).
 */

import { calendar_v3 } from 'googleapis'
import { getGoogleCalendarClient } from '@/lib/google-calendar'

export interface CreateCalendarEventParams {
  userId: string
  workspaceId: string
  summary: string
  description?: string
  startDateTime: string // ISO 8601
  endDateTime: string
  attendees?: string[]
  location?: string
  recurrence?: string[] // RRULE strings
  timeZone?: string
}

export interface CreateCalendarEventResult {
  success: boolean
  eventId?: string
  htmlLink?: string
  error?: string
  /** User-safe message for UI */
  userMessage?: string
}

/**
 * Create a Google Calendar event.
 * Delegates auth to getGoogleCalendarClient() — the same working path used by
 * GET/POST /api/calendar/events.
 */
export async function createCalendarEvent(
  params: CreateCalendarEventParams
): Promise<CreateCalendarEventResult> {
  const {
    summary,
    description,
    startDateTime,
    endDateTime,
    attendees,
    location,
    recurrence,
    timeZone,
  } = params

  const clientResult = await getGoogleCalendarClient()
  if (!clientResult.ok) {
    return {
      success: false,
      error: 'CALENDAR_NOT_CONNECTED',
      userMessage: 'Google Calendar is not connected. Sign in with Google or connect it in Settings.',
    }
  }

  const { calendar } = clientResult

  const tz = timeZone ?? 'UTC'
  const eventResource: calendar_v3.Schema$Event = {
    summary,
    description: description ?? undefined,
    location: location ?? undefined,
    start: {
      dateTime: new Date(startDateTime).toISOString(),
      timeZone: tz,
    },
    end: {
      dateTime: new Date(endDateTime).toISOString(),
      timeZone: tz,
    },
  }

  if (attendees && attendees.length > 0) {
    eventResource.attendees = attendees.map((email) => ({ email }))
  }

  if (recurrence && recurrence.length > 0) {
    eventResource.recurrence = recurrence
  }

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventResource,
    })

    const created = response.data
    return {
      success: true,
      eventId: created.id ?? undefined,
      htmlLink: created.htmlLink ?? undefined,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const isScopeError =
      message.includes('insufficient') ||
      message.includes('Insufficient Permission') ||
      message.includes('forbidden') ||
      message.includes('invalid_grant')

    if (isScopeError || message.includes('403')) {
      return {
        success: false,
        error: 'CALENDAR_SCOPE_MISSING',
        userMessage:
          'Google Calendar permissions need to be upgraded. Please reconnect your Google account.',
      }
    }

    return {
      success: false,
      error: 'CREATE_FAILED',
      userMessage: message.length > 200 ? 'Failed to create calendar event. Please try again.' : message,
    }
  }
}
