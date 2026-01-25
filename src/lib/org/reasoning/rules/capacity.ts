/**
 * Phase R: Capacity Recommendations
 *
 * Derives recommendations from snapshot.capacity signals.
 * Minimal v1 implementation - just surfaces "not modeled" state.
 *
 * No Prisma, no network calls - consumes snapshot only.
 */

import type { OrgIntelligenceSnapshotDTO } from "../../intelligence/snapshotTypes";
import type { OrgRecommendation, InputSnapshotMeta } from "../types";
import { createRecommendation, buildEvidence } from "../helpers";

/**
 * Derive capacity recommendations from snapshot.
 *
 * V1: Minimal implementation - just checks if capacity is modeled.
 */
export function deriveCapacityRecommendations(
  snapshot: OrgIntelligenceSnapshotDTO,
  snapshotMeta: InputSnapshotMeta
): OrgRecommendation[] {
  const recommendations: OrgRecommendation[] = [];
  const capacity = snapshot.capacity;

  // If capacity section is missing or empty, suggest enabling it
  if (!capacity) {
    recommendations.push(
      createRecommendation(
        "REC_ENABLE_CAPACITY_MODELING",
        "info",
        "Enable capacity modeling",
        {
          category: "capacity",
          summary:
            "Capacity modeling is not yet enabled. Enable it to track team workload and resource allocation.",
          evidence: buildEvidence(["CAPACITY_NOT_MODELED"], [], snapshotMeta),
          actions: [
            {
              label: "Learn More",
              href: "/org/settings/capacity",
              surface: "structure",
              primary: true,
            },
          ],
          rank: 100, // Low priority - informational
        }
      )
    );
    return recommendations;
  }

  // Check for CAPACITY_NOT_MODELED issue
  const notModeledIssue = capacity.issues.find((i) => i.code === "CAPACITY_NOT_MODELED");
  if (notModeledIssue) {
    recommendations.push(
      createRecommendation(
        "REC_ENABLE_CAPACITY_MODELING",
        "info",
        "Enable capacity modeling",
        {
          category: "capacity",
          summary:
            "Capacity modeling is not yet enabled. Enable it to track team workload and resource allocation.",
          evidence: buildEvidence(["CAPACITY_NOT_MODELED"], [], snapshotMeta),
          actions: [
            {
              label: "Learn More",
              href: "/org/settings/capacity",
              surface: "structure",
              primary: true,
            },
          ],
          rank: 100,
        }
      )
    );
  }

  // Future: Add recommendations for teams with zero execution capacity
  // when capacity modeling is enabled

  return recommendations;
}
