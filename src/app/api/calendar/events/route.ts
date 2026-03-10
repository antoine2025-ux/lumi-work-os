import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/authOptions'
import { handleApiError } from '@/lib/api-errors'
import { getGoogleCalendarClient, handleGoogleApiError } from '@/lib/google-calendar'
import {
  CalendarEventCreateSchema,
  CalendarEventUpdateSchema,
  CalendarEventDeleteSchema,
} from '@/lib/validations/calendar'
import type { calendar_v3 } from 'googleapis'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract meeting links from event description or location */
function extractMeetingLink(description: string, location: string): string | null {
  const patterns = [
    /https?:\/\/meet\.google\.com\/[a-z0-9-]+/gi,
    /https?:\/\/[a-z0-9.-]*zoom\.us\/j\/[0-9]+/gi,
    /https?:\/\/[a-z0-9.-]*zoom\.us\/my\/[a-z0-9.-]+/gi,
    /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[a-z0-9-]+/gi,
    /https?:\/\/[a-z0-9.-]*webex\.com\/meet\/[a-z0-9.-]+/gi,
    /https?:\/\/[a-z0-9.-]*gotomeeting\.com\/join\/[0-9]+/gi,
    /https?:\/\/[^\s]+(?:meet|join|conference|webinar)[^\s]*/gi,
  ]

  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match) return match[0]
  }
  for (const pattern of patterns) {
    const match = location.match(pattern)
    if (match) return match[0]
  }

  const fallback = /https?:\/\/[^\s]+/gi
  const descMatch = description.match(fallback)
  if (descMatch) return descMatch[0]
  const locMatch = location.match(fallback)
  if (locMatch) return locMatch[0]

  return null
}

const VIDEO_DOMAINS = [
  'meet.google.com',
  'zoom.us',
  'teams.microsoft.com',
  'webex.com',
  'gotomeeting.com',
]

/** Check if text references a known video conferencing platform */
function hasVideoReference(text: string): boolean {
  return VIDEO_DOMAINS.some((d) => text.includes(d))
}

/** Transform a Google Calendar event into our CalendarEvent shape */
function transformGoogleEvent(event: calendar_v3.Schema$Event) {
  const start = event.start?.dateTime || event.start?.date
  const end = event.end?.dateTime || event.end?.date

  let timeString = 'All day'
  if (start && event.start?.dateTime) {
    const startDate = new Date(start)
    timeString = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  let duration = 'Unknown'
  if (start && end) {
    const diffMs = new Date(end).getTime() - new Date(start).getTime()
    const diffMins = Math.round(diffMs / (1000 * 60))
    if (diffMins < 60) {
      duration = `${diffMins}m`
    } else {
      const hours = Math.floor(diffMins / 60)
      const mins = diffMins % 60
      duration = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
  }

  const description = event.description || ''
  const location = event.location || ''
  const isVideo = hasVideoReference(description) || hasVideoReference(location)
  const type = isVideo ? 'video' : 'phone'

  const attendees = event.attendees?.length || 0
  const attendeeList = (event.attendees || []).map((a) => ({
    email: a.email,
    displayName: a.displayName || a.email?.split('@')[0] || 'Guest',
    organizer: a.organizer ?? false,
    responseStatus: a.responseStatus,
  }))

  let priority = 'MEDIUM'
  const titleLower = event.summary?.toLowerCase() || ''
  if (titleLower.includes('urgent') || titleLower.includes('important')) {
    priority = 'HIGH'
  } else if (titleLower.includes('casual') || titleLower.includes('optional')) {
    priority = 'LOW'
  }

  // Extract Meet link from conferenceData first, then fallback to description/location
  let meetingLink: string | null = null
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find((ep) => ep.entryPointType === 'video')
    if (videoEntry?.uri) meetingLink = videoEntry.uri
  }
  if (!meetingLink && isVideo) {
    meetingLink = extractMeetingLink(description, location)
  }

  return {
    id: event.id || crypto.randomUUID(),
    title: event.summary || 'Untitled Event',
    time: timeString,
    duration,
    attendees,
    attendeeList,
    team: event.organizer?.displayName || 'Unknown',
    priority,
    type,
    description,
    location,
    startTime: start,
    endTime: end,
    meetingLink,
  }
}

// ---------------------------------------------------------------------------
// GET /api/calendar/events — List events for a date range
// Optional: ?personId={userId} — when absent or matches current user, fetches
// from Google Calendar. When different user: returns empty (calendar sharing
// would require OAuth per user or shared calendar IDs).
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const personId = searchParams.get('personId')
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')

    const session = await getServerSession(authOptions)
    const currentUserId = (session?.user as { id?: string } | undefined)?.id

    // When requesting another person's calendar: we can only fetch current user's
    // Google Calendar. Return empty until calendar sharing is implemented.
    if (personId && currentUserId && personId !== currentUserId) {
      return NextResponse.json({ events: [] })
    }

    const result = await getGoogleCalendarClient()
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, needsAuth: result.needsAuth },
        { status: result.status },
      )
    }

    const { calendar } = result

    const today = new Date()
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const defaultEnd = new Date(today)
    defaultEnd.setDate(today.getDate() + 7)

    const timeMin = startParam ? new Date(startParam) : defaultStart
    const timeMax = endParam ? new Date(endParam) : defaultEnd

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = (response.data.items || []).map(transformGoogleEvent)
    return NextResponse.json({ events })
  } catch (error: unknown) {
    try {
      const apiError = handleGoogleApiError(error)
      return NextResponse.json(apiError, { status: apiError.status })
    } catch {
      return handleApiError(error, request)
    }
  }
}

// ---------------------------------------------------------------------------
// POST /api/calendar/events — Create a new event
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const result = await getGoogleCalendarClient()
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, needsAuth: result.needsAuth, needsReAuth: result.needsReAuth },
        { status: result.status },
      )
    }

    const body = await request.json()
    const data = CalendarEventCreateSchema.parse(body)

    const { calendar } = result

    // Build the Google Calendar event resource
    const eventResource: calendar_v3.Schema$Event = {
      summary: data.title,
      description: data.description || undefined,
      location: data.location || undefined,
    }

    if (data.allDay) {
      // All-day events use date (not dateTime)
      eventResource.start = { date: data.startTime.split('T')[0] }
      eventResource.end = { date: data.endTime.split('T')[0] }
    } else {
      const tz = data.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      eventResource.start = { dateTime: new Date(data.startTime).toISOString(), timeZone: tz }
      eventResource.end = { dateTime: new Date(data.endTime).toISOString(), timeZone: tz }
    }

    if (data.attendees && data.attendees.length > 0) {
      eventResource.attendees = data.attendees.map((email) => ({ email }))
    }

    if (data.enableMeet) {
      eventResource.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      }
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventResource,
      conferenceDataVersion: data.enableMeet ? 1 : 0,
    })

    const created = response.data
    return NextResponse.json({ event: transformGoogleEvent(created) }, { status: 201 })
  } catch (error: unknown) {
    // Zod validation error
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 })
    }

    try {
      const apiError = handleGoogleApiError(error)
      return NextResponse.json(apiError, { status: apiError.status })
    } catch {
      return handleApiError(error, request)
    }
  }
}

// ---------------------------------------------------------------------------
// PUT /api/calendar/events — Update an existing event
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  try {
    const result = await getGoogleCalendarClient()
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, needsAuth: result.needsAuth, needsReAuth: result.needsReAuth },
        { status: result.status },
      )
    }

    const body = await request.json()
    const data = CalendarEventUpdateSchema.parse(body)

    const { calendar } = result
    const { eventId, ...updates } = data

    // Build partial event resource
    const eventResource: calendar_v3.Schema$Event = {}

    if (updates.title !== undefined) eventResource.summary = updates.title
    if (updates.description !== undefined) eventResource.description = updates.description
    if (updates.location !== undefined) eventResource.location = updates.location

    if (updates.startTime !== undefined) {
      const tz = updates.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      eventResource.start = { dateTime: new Date(updates.startTime).toISOString(), timeZone: tz }
    }
    if (updates.endTime !== undefined) {
      const tz = updates.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      eventResource.end = { dateTime: new Date(updates.endTime).toISOString(), timeZone: tz }
    }

    if (updates.attendees !== undefined) {
      eventResource.attendees = updates.attendees.map((email) => ({ email }))
    }

    let conferenceDataVersion = 0
    if (updates.enableMeet) {
      eventResource.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      }
      conferenceDataVersion = 1
    }

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: eventResource,
      conferenceDataVersion,
    })

    return NextResponse.json({ event: transformGoogleEvent(response.data) })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 })
    }

    try {
      const apiError = handleGoogleApiError(error)
      return NextResponse.json(apiError, { status: apiError.status })
    } catch {
      return handleApiError(error, request)
    }
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/calendar/events — Delete an event
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const result = await getGoogleCalendarClient()
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, needsAuth: result.needsAuth, needsReAuth: result.needsReAuth },
        { status: result.status },
      )
    }

    const body = await request.json()
    const data = CalendarEventDeleteSchema.parse(body)

    const { calendar } = result

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: data.eventId,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 })
    }

    try {
      const apiError = handleGoogleApiError(error)
      return NextResponse.json(apiError, { status: apiError.status })
    } catch {
      return handleApiError(error, request)
    }
  }
}

// Cache calendar data for 30 minutes (applies to GET only)
export const revalidate = 1800
