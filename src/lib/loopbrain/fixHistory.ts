/**
 * LoopBrain Fix History
 * 
 * Standardizes fix event logging for learning loops and executive narratives.
 * This enables tracking what changed, what improved, and when.
 */

import type { LoopBrainEvent } from "./signals";

export type FixEventInput = {
  orgId: string;
  personId?: string;
  fixType: string; // e.g. "ASSIGN_MANAGER", "ASSIGN_TEAM", "ASSIGN_ROLE"
  beforeState: Record<string, any>;
  afterState: Record<string, any>;
  impactScore: number;
};

export type FixEvent = FixEventInput & {
  id?: string;
  createdAt: Date;
};

export function buildFixEvent(input: FixEventInput): FixEvent {
  return {
    ...input,
    createdAt: new Date(),
  };
}

/**
 * Determines fix type from state changes
 */
export function determineFixType(before: Record<string, any>, after: Record<string, any>): string {
  if (before.managerId !== after.managerId) return "ASSIGN_MANAGER";
  if (before.teamId !== after.teamId || before.teamName !== after.teamName) return "ASSIGN_TEAM";
  if (before.role !== after.role || before.title !== after.title) return "ASSIGN_ROLE";
  return "UNKNOWN";
}

/**
 * Captures minimal before state (only relevant fields)
 */
export function captureBeforeState(person: any): Record<string, any> {
  return {
    managerId: person.managerId || null,
    managerName: person.managerName || null,
    teamId: person.teamId || null,
    teamName: person.teamName || null,
    team: person.team || null,
    role: person.role || null,
    title: person.title || null,
  };
}

/**
 * Captures minimal after state (only relevant fields)
 */
export function captureAfterState(person: any): Record<string, any> {
  return {
    managerId: person.managerId || null,
    managerName: person.managerName || null,
    teamId: person.teamId || null,
    teamName: person.teamName || null,
    team: person.team || null,
    role: person.role || null,
    title: person.title || null,
  };
}

