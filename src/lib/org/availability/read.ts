/**
 * Availability Read Functions
 * 
 * Phase G: Query and compute availability with precedence rules.
 * 
 * Precedence Rules:
 * - MANUAL overrides INTEGRATION when overlapping
 * - Effective factor = minimum of overlapping events
 * - Every computation produces a human-readable explanation
 */

import { prisma } from "@/lib/db";
import type { AvailabilityType, AvailabilityReason, AvailabilitySource } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

export type AvailabilityEvent = {
  id: string;
  personId: string;
  type: AvailabilityType;
  startDate: Date;
  endDate: Date | null;
  fraction: number | null; // 0-1, null for AVAILABLE/UNAVAILABLE
  reason: AvailabilityReason | null;
  source: AvailabilitySource;
  expectedReturnDate: Date | null;
  note: string | null;
  createdAt: Date;
};

export type LimitingEvent = {
  id: string;
  type: AvailabilityType;
  reason: AvailabilityReason | null;
  source: AvailabilitySource;
  dateRange: { start: Date; end: Date | null };
};

export type AvailabilityExplanation = {
  factor: number; // 0-1
  limitingEvent: LimitingEvent | null;
  explanation: string; // e.g., "Unavailable (0%) due to PTO from Jan 12–14"
};

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all availability events for a person within an optional time window
 * 
 * @param workspaceId - Workspace ID
 * @param personId - User ID (person in org context)
 * @param timeWindow - Optional time window filter
 */
export async function getAvailabilityEvents(
  workspaceId: string,
  personId: string,
  timeWindow?: { start: Date; end: Date }
): Promise<AvailabilityEvent[]> {
  const where: Parameters<typeof prisma.personAvailability.findMany>[0]["where"] = {
    workspaceId,
    personId,
  };

  // Filter by time window if provided
  if (timeWindow) {
    where.OR = [
      // Events that start within the window
      {
        startDate: {
          gte: timeWindow.start,
          lte: timeWindow.end,
        },
      },
      // Events that end within the window
      {
        endDate: {
          gte: timeWindow.start,
          lte: timeWindow.end,
        },
      },
      // Events that span the entire window
      {
        startDate: { lte: timeWindow.start },
        OR: [
          { endDate: { gte: timeWindow.end } },
          { endDate: null },
        ],
      },
    ];
  }

  const events = await prisma.personAvailability.findMany({
    where,
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      personId: true,
      type: true,
      startDate: true,
      endDate: true,
      fraction: true,
      reason: true,
      source: true,
      expectedReturnDate: true,
      note: true,
      createdAt: true,
    },
  });

  return events;
}

/**
 * Get availability events for multiple people (batch query)
 */
export async function getAvailabilityEventsBatch(
  workspaceId: string,
  personIds: string[],
  timeWindow?: { start: Date; end: Date }
): Promise<Map<string, AvailabilityEvent[]>> {
  if (personIds.length === 0) return new Map();

  const where: Parameters<typeof prisma.personAvailability.findMany>[0]["where"] = {
    workspaceId,
    personId: { in: personIds },
  };

  if (timeWindow) {
    where.OR = [
      { startDate: { gte: timeWindow.start, lte: timeWindow.end } },
      { endDate: { gte: timeWindow.start, lte: timeWindow.end } },
      {
        startDate: { lte: timeWindow.start },
        OR: [
          { endDate: { gte: timeWindow.end } },
          { endDate: null },
        ],
      },
    ];
  }

  const events = await prisma.personAvailability.findMany({
    where,
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      personId: true,
      type: true,
      startDate: true,
      endDate: true,
      fraction: true,
      reason: true,
      source: true,
      expectedReturnDate: true,
      note: true,
      createdAt: true,
    },
  });

  // Group by personId
  const result = new Map<string, AvailabilityEvent[]>();
  for (const personId of personIds) {
    result.set(personId, []);
  }
  for (const event of events) {
    const list = result.get(event.personId);
    if (list) {
      list.push(event);
    }
  }

  return result;
}

// ============================================================================
// Computation Functions
// ============================================================================

/**
 * Compute effective availability at a specific point in time
 * 
 * Precedence Rules:
 * 1. Filter to events active at the given time
 * 2. MANUAL events override INTEGRATION events
 * 3. Among same-source events, use minimum factor
 * 
 * @param events - All availability events for a person
 * @param atTime - Point in time to compute availability
 * @returns Availability explanation with factor and limiting event
 */
export function computeEffectiveAvailability(
  events: AvailabilityEvent[],
  atTime: Date
): AvailabilityExplanation {
  // Step 1: Filter to active events at the given time
  const activeEvents = events.filter((e) => {
    const startOk = e.startDate <= atTime;
    const endOk = e.endDate === null || e.endDate >= atTime;
    return startOk && endOk;
  });

  if (activeEvents.length === 0) {
    return {
      factor: 1,
      limitingEvent: null,
      explanation: "Fully available (no active availability events)",
    };
  }

  // Step 2: Separate by source (MANUAL takes precedence)
  const manualEvents = activeEvents.filter((e) => e.source === "MANUAL");
  const integrationEvents = activeEvents.filter((e) => e.source === "INTEGRATION");

  // Use MANUAL events if any exist, otherwise fall back to INTEGRATION
  const effectiveEvents = manualEvents.length > 0 ? manualEvents : integrationEvents;

  // Step 3: Compute minimum factor among effective events
  let minFactor = 1;
  let limitingEvent: AvailabilityEvent | null = null;

  for (const event of effectiveEvents) {
    const eventFactor = getEventFactor(event);
    if (eventFactor < minFactor) {
      minFactor = eventFactor;
      limitingEvent = event;
    }
  }

  // Step 4: Build explanation
  const explanation = buildExplanation(minFactor, limitingEvent);

  return {
    factor: minFactor,
    limitingEvent: limitingEvent
      ? {
          id: limitingEvent.id,
          type: limitingEvent.type,
          reason: limitingEvent.reason,
          source: limitingEvent.source,
          dateRange: {
            start: limitingEvent.startDate,
            end: limitingEvent.endDate,
          },
        }
      : null,
    explanation,
  };
}

/**
 * Compute minimum availability factor within a time window
 * 
 * Phase G: Uses minimum factor (conservative approach)
 * 
 * @param events - All availability events for a person
 * @param timeWindow - Time window to check
 */
export function computeMinAvailabilityInWindow(
  events: AvailabilityEvent[],
  timeWindow: { start: Date; end: Date }
): AvailabilityExplanation {
  // Filter to events that overlap with the window
  const overlappingEvents = events.filter((e) => {
    const eventStart = e.startDate;
    const eventEnd = e.endDate ?? new Date(8640000000000000); // Max date if open-ended
    
    // Events overlap if neither ends before the other starts
    return eventStart <= timeWindow.end && eventEnd >= timeWindow.start;
  });

  if (overlappingEvents.length === 0) {
    return {
      factor: 1,
      limitingEvent: null,
      explanation: "Fully available (no availability events in window)",
    };
  }

  // Separate by source (MANUAL takes precedence)
  const manualEvents = overlappingEvents.filter((e) => e.source === "MANUAL");
  const integrationEvents = overlappingEvents.filter((e) => e.source === "INTEGRATION");
  const effectiveEvents = manualEvents.length > 0 ? manualEvents : integrationEvents;

  // Find minimum factor
  let minFactor = 1;
  let limitingEvent: AvailabilityEvent | null = null;

  for (const event of effectiveEvents) {
    const eventFactor = getEventFactor(event);
    if (eventFactor < minFactor) {
      minFactor = eventFactor;
      limitingEvent = event;
    }
  }

  const explanation = buildExplanation(minFactor, limitingEvent);

  return {
    factor: minFactor,
    limitingEvent: limitingEvent
      ? {
          id: limitingEvent.id,
          type: limitingEvent.type,
          reason: limitingEvent.reason,
          source: limitingEvent.source,
          dateRange: {
            start: limitingEvent.startDate,
            end: limitingEvent.endDate,
          },
        }
      : null,
    explanation,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the availability factor for an event
 */
function getEventFactor(event: AvailabilityEvent): number {
  switch (event.type) {
    case "AVAILABLE":
      return 1;
    case "UNAVAILABLE":
      return 0;
    case "PARTIAL":
      return event.fraction ?? 0.5;
    default:
      return 1;
  }
}

/**
 * Build human-readable explanation
 */
function buildExplanation(
  factor: number,
  limitingEvent: AvailabilityEvent | null
): string {
  if (factor === 1) {
    return "Fully available";
  }

  if (!limitingEvent) {
    return factor === 0 ? "Unavailable" : `Partially available (${Math.round(factor * 100)}%)`;
  }

  const reasonStr = limitingEvent.reason
    ? formatReason(limitingEvent.reason)
    : limitingEvent.type === "UNAVAILABLE"
    ? "absence"
    : "reduced availability";

  const dateStr = formatDateRange(limitingEvent.startDate, limitingEvent.endDate);

  if (factor === 0) {
    return `Unavailable (0%) due to ${reasonStr} from ${dateStr}`;
  }

  return `Partially available (${Math.round(factor * 100)}%) due to ${reasonStr} from ${dateStr}`;
}

/**
 * Format availability reason for display
 */
function formatReason(reason: AvailabilityReason): string {
  const labels: Record<AvailabilityReason, string> = {
    VACATION: "PTO",
    SICK_LEAVE: "sick leave",
    PARENTAL_LEAVE: "parental leave",
    SABBATICAL: "sabbatical",
    JURY_DUTY: "jury duty",
    BEREAVEMENT: "bereavement",
    TRAINING: "training",
    OTHER: "absence",
  };
  return labels[reason] || "absence";
}

/**
 * Format date range for display
 */
function formatDateRange(start: Date, end: Date | null): string {
  const startStr = formatShortDate(start);
  if (!end) {
    return `${startStr} onwards`;
  }
  const endStr = formatShortDate(end);
  if (startStr === endStr) {
    return startStr;
  }
  return `${startStr}–${endStr}`;
}

/**
 * Format date as short string (e.g., "Jan 12")
 */
function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
