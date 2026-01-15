/**
 * LoopBrain Impact Preview
 * 
 * Computes expected impact deltas and explanations for fixes.
 * This helps users understand why something matters and what changes if they act.
 */

import type { LoopBrainEvent } from "./signals";

export type ImpactPreview = {
  completenessDelta?: {
    reportingLines?: number; // percentage points
    teams?: number;
    roles?: number;
  };
  explanation: string;
};

export function previewFixImpact(args: {
  person: any;
  signals: LoopBrainEvent[];
  totalPeople?: number; // Optional: for more accurate percentage calculations
}): ImpactPreview {
  const personSignals = args.signals.filter((s) => s.entityId === args.person.id);

  const preview: ImpactPreview = {
    explanation: "",
  };

  const deltas: any = {};
  const explanations: string[] = [];

  if (personSignals.some((s) => s.type === "MISSING_MANAGER")) {
    // Calculate percentage point improvement
    const totalPeople = args.totalPeople || 1;
    deltas.reportingLines = Math.round((1 / totalPeople) * 100);
    explanations.push("Completes a reporting line and stabilizes hierarchy");
  }

  if (personSignals.some((s) => s.type === "MISSING_TEAM")) {
    const totalPeople = args.totalPeople || 1;
    deltas.teams = Math.round((1 / totalPeople) * 100);
    explanations.push("Improves team ownership and grouping");
  }

  if (personSignals.some((s) => s.type === "MISSING_ROLE")) {
    const totalPeople = args.totalPeople || 1;
    deltas.roles = Math.round((1 / totalPeople) * 100);
    explanations.push("Improves role clarity and accountability");
  }

  if (Object.keys(deltas).length > 0) {
    preview.completenessDelta = deltas;
  }

  preview.explanation =
    explanations.length > 0
      ? explanations.slice(0, 2).join(" · ")
      : "No structural impact detected";

  return preview;
}

