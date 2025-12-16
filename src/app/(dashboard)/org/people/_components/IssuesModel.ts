/**
 * Issues Model
 * 
 * Builds issue rows from people and signals, sorted by impact score.
 * This creates a single source of truth for the Issues tab.
 */

import type { LoopBrainEvent } from "@/lib/loopbrain/signals";
import { computeImpactForPerson } from "@/lib/loopbrain/impact";

export type IssueRow = {
  personId: string;
  personName: string;
  person: any; // Full person object for rendering
  issueTypes: string[];
  impactScore: number;
  impactReason: string;
  signals: LoopBrainEvent[]; // Signals for this person
};

export function buildIssueRows(args: {
  people: any[];
  signals: LoopBrainEvent[];
  filterTypes?: string[]; // Optional filter by issue types
}): IssueRow[] {
  const rows: IssueRow[] = [];

  for (const p of args.people) {
    const personSignals = args.signals.filter((s) => s.entityId === p.id);
    
    // Filter by issue types if provided
    const filteredSignals = args.filterTypes
      ? personSignals.filter((s) => args.filterTypes!.includes(s.type))
      : personSignals;
    
    const issueTypes = Array.from(new Set(filteredSignals.map((s) => s.type)));

    if (issueTypes.length === 0) continue;

    const impact = computeImpactForPerson({
      person: p,
      signals: args.signals,
      directReportCount: p.directReportCount || 0,
    });

    rows.push({
      personId: p.id,
      personName: p.name || p.fullName || "Unnamed",
      person: p,
      issueTypes,
      impactScore: impact.score,
      impactReason: impact.reason,
      signals: filteredSignals,
    });
  }

  return rows.sort((a, b) => b.impactScore - a.impactScore);
}

