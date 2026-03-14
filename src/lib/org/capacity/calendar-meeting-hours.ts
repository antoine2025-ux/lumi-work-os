/**
 * Calendar Meeting Hours Calculator
 *
 * Capacity calculation contract v1.0 §3: Extract meeting hours from
 * Google Calendar for capacity computation.
 *
 * Auth pattern follows src/lib/loopbrain/context-sources/calendar.ts:
 * - Reads Google tokens from NextAuth Account table (prismaUnscoped)
 * - Falls back to JWT session tokens if Account lacks refresh_token
 * - Gracefully returns 0 if no calendar is connected
 */

import { google } from "googleapis";
import { prismaUnscoped } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  computeMeetingHoursUnion,
  type RawCalendarEvent,
  type WorkingHoursConfig,
  DEFAULT_WORKING_HOURS,
} from "./calendar-classification";

// ============================================================================
// Types
// ============================================================================

export interface MeetingHoursResult {
  /** Total meeting hours in the period (union of intervals, not sum) */
  meetingHours: number;
  /** Whether the user has a Google Calendar connected */
  calendarConnected: boolean;
}

// ============================================================================
// Single Person
// ============================================================================

/**
 * Get meeting hours for a person in a given time window.
 *
 * Follows the auth pattern from context-sources/calendar.ts:
 * 1. Look up Google Account tokens in the Account table
 * 2. Build OAuth2 client with token auto-refresh
 * 3. Fetch events with singleEvents: true (expands recurring)
 * 4. Classify and compute union of meeting intervals
 *
 * Returns { meetingHours: 0, calendarConnected: false } if no calendar
 * is connected or tokens are invalid. Never throws.
 */
export async function getPersonMeetingHours(
  userId: string,
  workspaceId: string,
  weekStart: Date,
  weekEnd: Date,
  config: WorkingHoursConfig = DEFAULT_WORKING_HOURS
): Promise<MeetingHoursResult> {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return { meetingHours: 0, calendarConnected: false };
    }

    // Get Google Account tokens (same pattern as context-sources/calendar.ts)
    const account = await prismaUnscoped.account.findFirst({
      where: { userId, provider: "google" },
      select: { access_token: true, refresh_token: true, expires_at: true },
    });

    if (!account?.refresh_token) {
      return { meetingHours: 0, calendarConnected: false };
    }

    // Build OAuth2 client
    const baseUrl = getOAuthRedirectBaseUrl();
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${baseUrl}/api/auth/callback/google`
    );

    oauth2Client.setCredentials({
      access_token: account.access_token ?? undefined,
      refresh_token: account.refresh_token,
      expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
    });

    // Persist refreshed tokens
    oauth2Client.on("tokens", (tokens) => {
      if (tokens.access_token) {
        prismaUnscoped.account
          .updateMany({
            where: { userId, provider: "google" },
            data: {
              access_token: tokens.access_token,
              expires_at: tokens.expiry_date
                ? Math.floor(tokens.expiry_date / 1000)
                : undefined,
            },
          })
          .catch((err: unknown) => {
            logger.warn("[CalendarMeetingHours] Failed to persist refreshed token", {
              userId,
              err,
            });
          });
      }
    });

    // Fetch calendar events
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: weekStart.toISOString(),
      timeMax: weekEnd.toISOString(),
      singleEvents: true, // Expands recurring events
      orderBy: "startTime",
      maxResults: 250, // Higher limit for weekly capacity (more thorough than context source)
    });

    const items = response.data.items ?? [];

    // Map to RawCalendarEvent for classifier
    const rawEvents: RawCalendarEvent[] = items
      .filter((e) => e.start && e.end && e.status !== "cancelled")
      .map((e) => ({
        id: e.id ?? "",
        summary: e.summary ?? null,
        start: {
          dateTime: e.start?.dateTime ?? null,
          date: e.start?.date ?? null,
        },
        end: {
          dateTime: e.end?.dateTime ?? null,
          date: e.end?.date ?? null,
        },
        attendees: e.attendees?.map((a) => ({
          email: a.email ?? null,
          self: a.self ?? null,
        })) ?? null,
        transparency: e.transparency ?? null,
        status: e.status ?? null,
      }));

    // Compute meeting hours using interval union
    const meetingHours = computeMeetingHoursUnion(rawEvents, config);

    logger.info("[CalendarMeetingHours] Computed meeting hours", {
      userId,
      workspaceId,
      weekStart: weekStart.toISOString(),
      meetingHours: meetingHours.toFixed(1),
      totalEvents: rawEvents.length,
    });

    return { meetingHours, calendarConnected: true };
  } catch (error: unknown) {
    const errorDetails =
      error instanceof Error
        ? { message: error.message, name: error.name }
        : { raw: String(error) };

    logger.error("[CalendarMeetingHours] Failed to get meeting hours", {
      userId,
      workspaceId,
      error: errorDetails,
    });

    // Graceful degradation — don't crash the snapshot
    return { meetingHours: 0, calendarConnected: false };
  }
}

// ============================================================================
// Batch
// ============================================================================

/**
 * Get meeting hours for multiple users in parallel.
 *
 * Uses Promise.allSettled to handle individual failures gracefully.
 * Returns a Map of userId → MeetingHoursResult.
 */
export async function getPersonMeetingHoursBatch(
  userIds: string[],
  workspaceId: string,
  weekStart: Date,
  weekEnd: Date,
  config: WorkingHoursConfig = DEFAULT_WORKING_HOURS
): Promise<Map<string, MeetingHoursResult>> {
  if (userIds.length === 0) return new Map();

  const results = await Promise.allSettled(
    userIds.map((userId) =>
      getPersonMeetingHours(userId, workspaceId, weekStart, weekEnd, config)
    )
  );

  const map = new Map<string, MeetingHoursResult>();
  for (let i = 0; i < userIds.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      map.set(userIds[i], result.value);
    } else {
      // Should not happen (getPersonMeetingHours catches internally),
      // but handle defensively
      map.set(userIds[i], { meetingHours: 0, calendarConnected: false });
    }
  }

  return map;
}

// ============================================================================
// Helpers
// ============================================================================

function getOAuthRedirectBaseUrl(): string {
  if (process.env.NODE_ENV === "development") {
    if (
      process.env.NEXTAUTH_URL &&
      process.env.NEXTAUTH_URL.includes("localhost")
    ) {
      return process.env.NEXTAUTH_URL;
    }
    return "http://localhost:3000";
  }
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
