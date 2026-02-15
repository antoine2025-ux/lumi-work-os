import { z } from 'zod'
import { nonEmptyString, dateString } from './common'

/** POST /api/calendar/events — Create a new Google Calendar event */
export const CalendarEventCreateSchema = z.object({
  title: nonEmptyString.max(255),
  description: z.string().optional().default(''),
  location: z.string().optional().default(''),
  startTime: dateString,
  endTime: dateString,
  timeZone: z.string().optional(),
  attendees: z.array(z.string().email()).optional().default([]),
  enableMeet: z.boolean().optional().default(false),
  allDay: z.boolean().optional().default(false),
}).strict()

/** PUT /api/calendar/events — Update an existing Google Calendar event */
export const CalendarEventUpdateSchema = z.object({
  eventId: nonEmptyString,
  title: nonEmptyString.max(255).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: dateString.optional(),
  endTime: dateString.optional(),
  timeZone: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  enableMeet: z.boolean().optional(),
}).strict()

/** DELETE /api/calendar/events — Delete a Google Calendar event */
export const CalendarEventDeleteSchema = z.object({
  eventId: nonEmptyString,
}).strict()
