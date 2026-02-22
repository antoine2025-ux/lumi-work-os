/**
 * LoopBrain Signal Derivation
 * 
 * Derives signals from person data based on gaps and structural observations.
 * This is intentionally simple for v1 - future versions will add more sophisticated detection.
 */

import type { LoopBrainEvent } from "./signals";

export type PersonData = {
  id: string;
  name?: string | null;
  fullName?: string | null;
  managerId?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  team?: string | null;
  role?: string | null;
  title?: string | null;
  directReportCount?: number | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

/**
 * Derives signals for a single person based on their data.
 * Returns an array of signals representing gaps and observations.
 */
export function derivePersonSignals(person: PersonData): LoopBrainEvent[] {
  const events: LoopBrainEvent[] = [];
  const now = new Date();

  // MISSING_MANAGER: Person has no reporting line
  if (!person.managerId) {
    events.push({
      type: "MISSING_MANAGER",
      entityId: person.id,
      severity: "high",
      context: {
        personName: person.name || person.fullName || "Unnamed",
      },
      occurredAt: now,
    });
  }

  // MISSING_TEAM: Person has no team assignment
  const hasTeam = !!(person.teamId || person.teamName || person.team);
  if (!hasTeam) {
    events.push({
      type: "MISSING_TEAM",
      entityId: person.id,
      severity: "medium",
      context: {
        personName: person.name || person.fullName || "Unnamed",
      },
      occurredAt: now,
    });
  }

  // MISSING_ROLE: Person has no role/title
  const hasRole = !!(person.role || person.title);
  if (!hasRole) {
    events.push({
      type: "MISSING_ROLE",
      entityId: person.id,
      severity: "low",
      context: {
        personName: person.name || person.fullName || "Unnamed",
      },
      occurredAt: now,
    });
  }

  // ORPHAN_MANAGER: Manager has no reports (structural anomaly)
  // Note: ORPHAN_MANAGER detection would require cross-person analysis
  // For v1, we skip this as it requires full org context

  // NEW_NODE_CREATED: Person was recently created
  if (person.createdAt) {
    const createdAt = typeof person.createdAt === "string" 
      ? new Date(person.createdAt) 
      : person.createdAt;
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation < 1) {
      events.push({
        type: "NEW_NODE_CREATED",
        entityId: person.id,
        severity: "low",
        context: {
          personName: person.name || person.fullName || "Unnamed",
          daysSinceCreation: Math.round(daysSinceCreation * 24), // hours
        },
        occurredAt: now,
      });
    }
  }

  // STRUCTURE_CHANGED: Person's structure was recently updated
  if (person.updatedAt && person.createdAt) {
    const updatedAt = typeof person.updatedAt === "string"
      ? new Date(person.updatedAt)
      : person.updatedAt;
    const createdAt = typeof person.createdAt === "string"
      ? new Date(person.createdAt)
      : person.createdAt;
    
    // Only signal if updated after creation (not just creation timestamp)
    if (updatedAt.getTime() > createdAt.getTime()) {
      const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate < 7) {
        events.push({
          type: "STRUCTURE_CHANGED",
          entityId: person.id,
          severity: "medium",
          context: {
            personName: person.name || person.fullName || "Unnamed",
            daysSinceUpdate: Math.round(daysSinceUpdate),
          },
          occurredAt: now,
        });
      }
    }
  }

  return events;
}

/**
 * Derives signals for multiple people.
 * Useful for batch analysis and completeness calculations.
 */
export function derivePeopleSignals(people: PersonData[]): LoopBrainEvent[] {
  const allSignals: LoopBrainEvent[] = [];
  
  for (const person of people) {
    const signals = derivePersonSignals(person);
    allSignals.push(...signals);
  }
  
  return allSignals;
}

/**
 * Computes org completeness metrics from signals.
 * Returns percentages for reporting lines, teams, and roles.
 */
export function computeCompletenessFromSignals(
  people: PersonData[],
  signals: LoopBrainEvent[]
): {
  reportingLines: number; // % with manager
  teams: number; // % with team
  roles: number; // % with role
  overall: number; // Average of the three
} {
  if (people.length === 0) {
    return {
      reportingLines: 0,
      teams: 0,
      roles: 0,
      overall: 0,
    };
  }

  const personIds = new Set(people.map((p) => p.id));
  
  const missingManager = signals.filter(
    (s) => s.type === "MISSING_MANAGER" && personIds.has(s.entityId)
  ).length;
  const missingTeam = signals.filter(
    (s) => s.type === "MISSING_TEAM" && personIds.has(s.entityId)
  ).length;
  const missingRole = signals.filter(
    (s) => s.type === "MISSING_ROLE" && personIds.has(s.entityId)
  ).length;

  const total = people.length;

  const reportingLines = Math.round(((total - missingManager) / total) * 100);
  const teams = Math.round(((total - missingTeam) / total) * 100);
  const roles = Math.round(((total - missingRole) / total) * 100);
  const overall = Math.round((reportingLines + teams + roles) / 3);

  return {
    reportingLines,
    teams,
    roles,
    overall,
  };
}

