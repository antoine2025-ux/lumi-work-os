/**
 * Phase R: People Recommendations
 *
 * Derives recommendations from snapshot.people signals.
 * No Prisma, no network calls - consumes snapshot only.
 */

import type { OrgIntelligenceSnapshotDTO } from "../../intelligence/snapshotTypes";
import type { OrgRecommendation, InputSnapshotMeta } from "../types";
import { createRecommendation, buildEvidence } from "../helpers";
import { PEOPLE_RANK_BASE } from "../version";

/**
 * Threshold for considering a manager "overloaded".
 * Can be made configurable in the future.
 */
const OVERLOADED_MANAGER_THRESHOLD = 10;

/**
 * Derive people recommendations from snapshot.
 *
 * AGGREGATION: Returns one recommendation per topic, not N per entity.
 */
export function derivePeopleRecommendations(
  snapshot: OrgIntelligenceSnapshotDTO,
  snapshotMeta: InputSnapshotMeta
): OrgRecommendation[] {
  const recommendations: OrgRecommendation[] = [];
  const people = snapshot.people;

  if (!people) {
    return recommendations;
  }

  // People without managers
  if (people.peopleWithoutManagers.length > 0) {
    recommendations.push(
      createRecommendation("REC_FIX_MANAGER_GAPS", "warning", "Assign managers", {
        category: "people",
        summary: `${people.peopleWithoutManagers.length} ${people.peopleWithoutManagers.length > 1 ? "people are" : "person is"} without a manager. Assign managers to establish clear reporting lines.`,
        evidence: buildEvidence(
          ["PEOPLE_MISSING_MANAGER"],
          people.peopleWithoutManagers,
          snapshotMeta
        ),
        actions: [
          {
            label: "Manage People",
            href: "/org/people",
            surface: "people",
            primary: true,
          },
        ],
        // Lower rank = higher priority. More people without managers = higher priority.
        rank: PEOPLE_RANK_BASE - people.peopleWithoutManagers.length,
      })
    );
  }

  // Overloaded managers (using snapshot data, not threshold recalculation)
  const overloaded =
    people.overloadedManagers.length > 0
      ? people.overloadedManagers
      : people.managerLoad.filter((m) => m.directReports >= OVERLOADED_MANAGER_THRESHOLD);

  if (overloaded.length > 0) {
    const managers = overloaded.map((m) => m.manager);
    recommendations.push(
      createRecommendation(
        "REC_REBALANCE_MANAGER_LOAD",
        "info",
        "Review manager workloads",
        {
          category: "people",
          summary: `${overloaded.length} manager${overloaded.length > 1 ? "s have" : " has"} high direct report counts. Consider rebalancing to improve management quality.`,
          evidence: buildEvidence([], managers, snapshotMeta),
          actions: [
            {
              label: "View Manager Load",
              href: "/org/people",
              surface: "people",
              primary: true,
            },
          ],
          // Lower rank = higher priority. More overloaded managers = higher priority.
          rank: PEOPLE_RANK_BASE - overloaded.length,
        }
      )
    );
  }

  return recommendations;
}
