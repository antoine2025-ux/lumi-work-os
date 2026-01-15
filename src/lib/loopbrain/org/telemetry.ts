// src/lib/loopbrain/org/telemetry.ts

type OrgRoutingMode = "org" | "generic";

export type OrgRoutingEvent = {
  question: string;
  mode: OrgRoutingMode;
  wantsOrg: boolean;
  hasOrgContext: boolean;
  workspaceId?: string | null;
  timestamp: string; // ISO
};

type OrgRoutingStats = {
  total: number;
  org: number;
  generic: number;
};

let lastEvents: OrgRoutingEvent[] = [];
let stats: OrgRoutingStats = {
  total: 0,
  org: 0,
  generic: 0,
};

const MAX_EVENTS = 50; // keep last N events in memory only

/**
 * Record an Org routing event (dev-only).
 * This captures routing decisions for telemetry and debugging.
 */
export function recordOrgRoutingEvent(event: OrgRoutingEvent) {
  // dev-only: ignore in production for now
  if (process.env.NODE_ENV !== "development") return;

  stats.total += 1;
  if (event.mode === "org") stats.org += 1;
  if (event.mode === "generic") stats.generic += 1;

  lastEvents.unshift(event);
  if (lastEvents.length > MAX_EVENTS) {
    lastEvents = lastEvents.slice(0, MAX_EVENTS);
  }

  if (process.env.NODE_ENV === "development") {
    // Very lightweight console telemetry
    console.info("[OrgTelemetry] routing", {
      mode: event.mode,
      wantsOrg: event.wantsOrg,
      hasOrgContext: event.hasOrgContext,
      workspaceId: event.workspaceId ?? null,
      questionSample:
        event.question.length > 120
          ? event.question.slice(0, 120) + "…"
          : event.question,
    });
  }
}

/**
 * Get current Org routing statistics.
 */
export function getOrgRoutingStats(): OrgRoutingStats {
  return stats;
}

/**
 * Get recent Org routing events (last N events, up to MAX_EVENTS).
 */
export function getOrgRoutingEvents(): OrgRoutingEvent[] {
  return lastEvents;
}

