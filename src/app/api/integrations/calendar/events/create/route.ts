/**
 * POST /api/integrations/calendar/events/create
 * Creates a Google Calendar event. Used by Loopbrain createCalendarEvent tool.
 * Body: { summary, startDateTime, endDateTime, description?, attendees?, location?, timeZone?, recurrence? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { createCalendarEvent } from '@/lib/integrations/calendar-events'
import { CalendarEventCreateIntegrationSchema } from '@/lib/validations/calendar'
import { handleApiError } from '@/lib/api-errors'

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })

    setWorkspaceContext(workspaceId)

    const body = await request.json()
    const data = CalendarEventCreateIntegrationSchema.parse(body)

    const result = await createCalendarEvent({
      userId,
      workspaceId,
      summary: data.summary,
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime,
      description: data.description,
      attendees: data.attendees,
      location: data.location,
      timeZone: data.timeZone,
      recurrence: data.recurrence,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.userMessage ?? result.error ?? 'Failed to create event' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      htmlLink: result.htmlLink,
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
