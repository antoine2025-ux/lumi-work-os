/**
 * Calendar Event Classification
 *
 * Capacity calculation contract v1.0 §3: Classify calendar events as
 * MEETING, FOCUS_BLOCK, or IGNORE for capacity computation.
 *
 * Rules are evaluated in order (first match wins):
 * 1. All-day + no attendees → IGNORE
 * 2. All-day + has attendees → MEETING
 * 3. Outside working hours → IGNORE
 * 4. Transparency = "transparent" → FOCUS_BLOCK
 * 5. ≤1 attendee + focus keywords → FOCUS_BLOCK
 * 6. ≤1 attendee + no focus keywords → FOCUS_BLOCK
 * 7. ≥2 attendees → MEETING
 */

// ============================================================================
// Types
// ============================================================================

export type CalendarEventClassification = "MEETING" | "FOCUS_BLOCK" | "IGNORE";

export interface ClassifiedEvent {
  classification: CalendarEventClassification;
  /** Duration in minutes, clipped to working hours window */
  durationMinutes: number;
  title: string;
  attendeeCount: number;
}

/**
 * Raw calendar event with the fields needed for classification.
 * Matches Google Calendar API response structure.
 */
export interface RawCalendarEvent {
  id: string;
  summary: string | null;
  start: {
    dateTime?: string | null;
    date?: string | null;
  };
  end: {
    dateTime?: string | null;
    date?: string | null;
  };
  attendees?: Array<{ email?: string | null; self?: boolean | null }> | null;
  transparency?: string | null;
  status?: string | null;
}

export interface WorkingHoursConfig {
  /** Working day start time, e.g. "08:00" */
  workingHoursStart: string;
  /** Working day end time, e.g. "17:00" */
  workingHoursEnd: string;
  /** Hours per working day (for all-day meeting duration) */
  dailyHours: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Focus keywords (case-insensitive) — contract §3.2 */
const FOCUS_KEYWORDS = [
  "focus",
  "deep work",
  "heads down",
  "no meetings",
  "block",
  "do not book",
  "working time",
  "maker time",
  "focus time",
  "personal",
  "lunch",
  "break",
  "admin time",
  "prep time",
  "planning time",
  "writing time",
  "coding",
];

export const DEFAULT_WORKING_HOURS: WorkingHoursConfig = {
  workingHoursStart: "08:00",
  workingHoursEnd: "17:00",
  dailyHours: 8,
};

// ============================================================================
// Core Classifier
// ============================================================================

/**
 * Classify a single calendar event per contract §3.1.
 *
 * Rules evaluated in order — first match wins.
 */
export function classifyCalendarEvent(
  event: RawCalendarEvent,
  config: WorkingHoursConfig = DEFAULT_WORKING_HOURS
): ClassifiedEvent {
  const title = event.summary ?? "(No title)";
  const attendeeCount = countNonSelfAttendees(event.attendees);
  const isAllDay = !event.start.dateTime;

  // Rule 1: All-day + no attendees → IGNORE
  if (isAllDay && attendeeCount === 0) {
    return { classification: "IGNORE", durationMinutes: 0, title, attendeeCount };
  }

  // Rule 2: All-day + has attendees → MEETING (full working day)
  if (isAllDay && attendeeCount > 0) {
    return {
      classification: "MEETING",
      durationMinutes: config.dailyHours * 60,
      title,
      attendeeCount,
    };
  }

  // Parse start/end times for timed events
  const startTime = new Date(event.start.dateTime!);
  const endTime = new Date(event.end.dateTime!);

  // Rule 3: Outside working hours → IGNORE
  const clippedMinutes = clipToWorkingHours(startTime, endTime, config);
  if (clippedMinutes <= 0) {
    return { classification: "IGNORE", durationMinutes: 0, title, attendeeCount };
  }

  // Rule 4: Transparency = "transparent" → FOCUS_BLOCK
  if (event.transparency === "transparent") {
    return { classification: "FOCUS_BLOCK", durationMinutes: clippedMinutes, title, attendeeCount };
  }

  // Rules 5 & 6: ≤1 attendee → FOCUS_BLOCK (regardless of title)
  if (attendeeCount <= 1) {
    return { classification: "FOCUS_BLOCK", durationMinutes: clippedMinutes, title, attendeeCount };
  }

  // Rule 7: ≥2 attendees → MEETING
  return { classification: "MEETING", durationMinutes: clippedMinutes, title, attendeeCount };
}

/**
 * Classify a batch of events and return only meetings.
 */
export function classifyEvents(
  events: RawCalendarEvent[],
  config: WorkingHoursConfig = DEFAULT_WORKING_HOURS
): ClassifiedEvent[] {
  return events.map((e) => classifyCalendarEvent(e, config));
}

// ============================================================================
// Meeting Time Union (overlapping meeting handling — contract §3.4)
// ============================================================================

/**
 * Interval representing a meeting's time within the working day (minutes from midnight).
 */
interface TimeInterval {
  start: number; // minutes from midnight
  end: number;   // minutes from midnight
}

/**
 * Compute total meeting hours from classified events, handling overlaps.
 *
 * Contract §3.4: Count the union of meeting time intervals, not the sum.
 * Two meetings from 2pm-3pm count as 1 hour, not 2.
 */
export function computeMeetingHoursUnion(
  events: RawCalendarEvent[],
  config: WorkingHoursConfig = DEFAULT_WORKING_HOURS
): number {
  // Group events by day, classify, filter to MEETING, then merge intervals per day
  const meetingsByDay = new Map<string, TimeInterval[]>();

  for (const event of events) {
    const classified = classifyCalendarEvent(event, config);
    if (classified.classification !== "MEETING") continue;

    const isAllDay = !event.start.dateTime;

    if (isAllDay) {
      // All-day meetings: add full working day interval for each day in the range
      const startDate = new Date(event.start.date!);
      const endDate = new Date(event.end.date!);
      const workStart = parseTimeToMinutes(config.workingHoursStart);
      const workEnd = parseTimeToMinutes(config.workingHoursEnd);

      // end date in Google all-day events is exclusive
      const current = new Date(startDate);
      while (current < endDate) {
        const dayKey = current.toISOString().split("T")[0];
        if (!meetingsByDay.has(dayKey)) meetingsByDay.set(dayKey, []);
        meetingsByDay.get(dayKey)!.push({ start: workStart, end: workEnd });
        current.setDate(current.getDate() + 1);
      }
    } else {
      const startTime = new Date(event.start.dateTime!);
      const endTime = new Date(event.end.dateTime!);
      const dayKey = startTime.toISOString().split("T")[0];

      const workStart = parseTimeToMinutes(config.workingHoursStart);
      const workEnd = parseTimeToMinutes(config.workingHoursEnd);

      const eventStart = startTime.getHours() * 60 + startTime.getMinutes();
      const eventEnd = endTime.getHours() * 60 + endTime.getMinutes();

      // Clip to working hours
      const clippedStart = Math.max(eventStart, workStart);
      const clippedEnd = Math.min(eventEnd, workEnd);

      if (clippedStart < clippedEnd) {
        if (!meetingsByDay.has(dayKey)) meetingsByDay.set(dayKey, []);
        meetingsByDay.get(dayKey)!.push({ start: clippedStart, end: clippedEnd });
      }
    }
  }

  // Merge intervals per day and sum
  let totalMinutes = 0;
  for (const intervals of meetingsByDay.values()) {
    totalMinutes += mergeIntervalsAndSum(intervals);
  }

  return totalMinutes / 60;
}

/**
 * Merge overlapping intervals and return total covered minutes.
 */
function mergeIntervalsAndSum(intervals: TimeInterval[]): number {
  if (intervals.length === 0) return 0;

  // Sort by start time
  const sorted = [...intervals].sort((a, b) => a.start - b.start);

  let totalMinutes = 0;
  let currentStart = sorted[0].start;
  let currentEnd = sorted[0].end;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start <= currentEnd) {
      // Overlapping — extend
      currentEnd = Math.max(currentEnd, sorted[i].end);
    } else {
      // Gap — add current interval and start new one
      totalMinutes += currentEnd - currentStart;
      currentStart = sorted[i].start;
      currentEnd = sorted[i].end;
    }
  }

  // Add last interval
  totalMinutes += currentEnd - currentStart;

  return totalMinutes;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Count non-self attendees (excluding the calendar owner).
 */
function countNonSelfAttendees(
  attendees: RawCalendarEvent["attendees"]
): number {
  if (!attendees || attendees.length === 0) return 0;
  // Count attendees that are not the calendar owner (self)
  // If no "self" flag exists, count all
  const hasSelf = attendees.some((a) => a.self === true);
  if (hasSelf) {
    return attendees.filter((a) => a.self !== true).length;
  }
  // No self marker — total attendee count represents others + self
  return attendees.length;
}

/**
 * Clip an event's duration to the working hours window.
 * Returns duration in minutes, or 0 if entirely outside working hours.
 */
function clipToWorkingHours(
  eventStart: Date,
  eventEnd: Date,
  config: WorkingHoursConfig
): number {
  const workStart = parseTimeToMinutes(config.workingHoursStart);
  const workEnd = parseTimeToMinutes(config.workingHoursEnd);

  const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
  const eventEndMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();

  const clippedStart = Math.max(eventStartMinutes, workStart);
  const clippedEnd = Math.min(eventEndMinutes, workEnd);

  return Math.max(0, clippedEnd - clippedStart);
}

/**
 * Parse "HH:MM" time string to minutes from midnight.
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}
