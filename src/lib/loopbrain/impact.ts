/**
 * LoopBrain v1 Impact Scoring
 * 
 * Computes impact scores for people/issues based on org structure signals.
 * Higher scores indicate issues that matter more to org completeness and reasoning.
 */

import type { LoopBrainEvent } from "./signals";

export type ImpactScore = {
  score: number;
  reason: string; // short explainer for enterprise trust
};

export function computeImpactForPerson(args: {
  person: { id: string };
  signals: LoopBrainEvent[];
  directReportCount?: number;
  depth?: number; // optional future extension
}): ImpactScore {
  const personSignals = args.signals.filter((s) => s.entityId === args.person.id);

  const missingManager = personSignals.some((s) => s.type === "MISSING_MANAGER");
  const missingTeam = personSignals.some((s) => s.type === "MISSING_TEAM");
  const missingRole = personSignals.some((s) => s.type === "MISSING_ROLE");
  const isManager = (args.directReportCount || 0) > 0;

  // Base weights (v1)
  let score = 0;
  const reasons: string[] = [];

  if (missingManager) {
    score += 6;
    reasons.push("Missing reporting line blocks structure");
  }
  if (missingTeam) {
    score += 3;
    reasons.push("Missing team reduces grouping");
  }
  if (missingRole) {
    score += 1;
    reasons.push("Missing role reduces clarity");
  }

  // Manager multiplier (v1) — managers affect more downstream
  if (isManager && (missingManager || missingTeam || missingRole)) {
    score += 3;
    reasons.unshift("Manager impacts downstream reporting");
  }

  // More reports → higher impact
  if (isManager) {
    const dr = Math.min(20, args.directReportCount || 0);
    score += Math.round(dr / 5); // 0..4 bonus
    if (dr >= 5) reasons.push("Large team size increases impact");
  }

  if (score === 0) return { score: 0, reason: "No unresolved gaps detected" };

  // Keep reason compact and trustable
  return {
    score,
    reason: reasons.slice(0, 2).join(" · "),
  };
}

