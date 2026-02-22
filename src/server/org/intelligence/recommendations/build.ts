/**
 * Build recommendations from intelligence findings.
 * 
 * Translates findings into actionable recommendations with clear navigation paths.
 */

import type { OrgIntelligenceFinding } from "@/server/org/intelligence/types";
import type { OrgRecommendation } from "./types";

/**
 * Generate a stable deterministic ID from a finding.
 * Uses a simple hash function to ensure consistency.
 */
function stableId(f: OrgIntelligenceFinding): string {
  const key = `${f.signal}:${f.entityType}:${f.entityId ?? "org"}:${f.title}`;
  // Simple stable hash (not crypto)
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `rec_${h}`;
}

/**
 * Build recommendations from intelligence findings.
 * Maps each finding to a concrete actionable recommendation.
 */
export function buildRecommendations(
  findings: OrgIntelligenceFinding[]
): OrgRecommendation[] {
  const out: OrgRecommendation[] = [];

  for (const f of findings) {
    // OWNERSHIP_RISK → ASSIGN_OWNER
    if (
      f.signal === "OWNERSHIP_RISK" &&
      (f.entityType === "TEAM" || f.entityType === "DEPARTMENT")
    ) {
      out.push({
        id: stableId(f),
        actionType: "ASSIGN_OWNER",
        title: "Assign an owner",
        description: f.explanation,
        severity: f.severity,
        entityType: f.entityType as "TEAM" | "DEPARTMENT",
        entityId: f.entityId,
        fixHref: "/org/ownership",
        sourceFinding: f,
      });
      continue;
    }

    // STRUCTURAL_GAP + PERSON "without manager" → SET_MANAGER
    if (f.signal === "STRUCTURAL_GAP" && f.entityType === "PERSON" && f.entityId) {
      const t = f.title.toLowerCase();
      
      // STRUCTURAL_GAP + PERSON "availability unknown/stale" → SET_AVAILABILITY
      if (t.includes("availability unknown") || t.includes("availability stale")) {
        out.push({
          id: stableId(f),
          actionType: "SET_AVAILABILITY",
          title: "Set availability",
          description: f.explanation,
          severity: f.severity,
          entityType: "PERSON",
          entityId: f.entityId,
          fixHref: `/org/people/${f.entityId}`,
          sourceFinding: f,
        });
        continue;
      }
      
      if (t.includes("without manager")) {
        out.push({
          id: stableId(f),
          actionType: "SET_MANAGER",
          title: "Set a manager",
          description: f.explanation,
          severity: f.severity,
          entityType: "PERSON",
          entityId: f.entityId,
          fixHref: `/org/people/${f.entityId}`,
          sourceFinding: f,
        });
        continue;
      }
      // STRUCTURAL_GAP + PERSON "without team" → ASSIGN_TEAM
      if (t.includes("without team")) {
        out.push({
          id: stableId(f),
          actionType: "ASSIGN_TEAM",
          title: "Assign a team",
          description: f.explanation,
          severity: f.severity,
          entityType: "PERSON",
          entityId: f.entityId,
          fixHref: `/org/people/${f.entityId}`,
          sourceFinding: f,
        });
        continue;
      }
    }

    // MANAGEMENT_LOAD → REVIEW_MANAGEMENT_LOAD
    if (f.signal === "MANAGEMENT_LOAD" && f.entityType === "PERSON" && f.entityId) {
      out.push({
        id: stableId(f),
        actionType: "REVIEW_MANAGEMENT_LOAD",
        title: "Review management load",
        description: f.explanation,
        severity: f.severity,
        entityType: "PERSON",
        entityId: f.entityId,
        fixHref: `/org/people/${f.entityId}`,
        sourceFinding: f,
      });
      continue;
    }
  }

  // Prioritize HIGH, then MEDIUM, then LOW
  const rank = (s: string) => (s === "HIGH" ? 3 : s === "MEDIUM" ? 2 : 1);
  return out.sort((a, b) => rank(b.severity) - rank(a.severity));
}

