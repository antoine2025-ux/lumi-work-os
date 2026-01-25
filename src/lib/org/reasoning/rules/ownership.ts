/**
 * Phase R: Ownership Recommendations
 *
 * Derives recommendations from snapshot.ownership signals.
 * No Prisma, no network calls - consumes snapshot only.
 */

import type { OrgIntelligenceSnapshotDTO, OrgSnapshotIssueCode } from "../../intelligence/snapshotTypes";
import type { OrgRecommendation, InputSnapshotMeta } from "../types";
import { createRecommendation, buildEvidence } from "../helpers";
import { REASONING_PREVIEW_COUNT, OWNERSHIP_RANK_BASE } from "../version";

/**
 * Derive ownership recommendations from snapshot.
 *
 * AGGREGATION: Returns one recommendation per topic, not N per entity.
 * E.g., 10 unowned teams → 1 REC_ASSIGN_TEAM_OWNER with count=10.
 *
 * RANK LOGIC: Lower rank = higher priority.
 * We use RANK_BASE - count so more unowned entities = higher priority.
 */
export function deriveOwnershipRecommendations(
  snapshot: OrgIntelligenceSnapshotDTO,
  snapshotMeta: InputSnapshotMeta
): OrgRecommendation[] {
  const recommendations: OrgRecommendation[] = [];
  const ownership = snapshot.ownership;

  if (!ownership) {
    return recommendations;
  }

  // Unowned teams
  const unownedTeams = ownership.unownedEntities.filter((e) => e.type === "team");
  if (unownedTeams.length > 0) {
    const previewEntities = unownedTeams.slice(0, REASONING_PREVIEW_COUNT);
    recommendations.push(
      createRecommendation("REC_ASSIGN_TEAM_OWNER", "critical", "Assign team owners", {
        category: "ownership",
        summary: `${unownedTeams.length} team${unownedTeams.length > 1 ? "s" : ""} ${unownedTeams.length > 1 ? "are" : "is"} without an owner. Assign owners for clear accountability.`,
        evidence: {
          issueCodes: ["OWNERSHIP_UNOWNED_TEAM"],
          entities: previewEntities,
          meta: {
            count: unownedTeams.length,
            previewCount: previewEntities.length,
            aggregated: unownedTeams.length > REASONING_PREVIEW_COUNT,
            snapshotMeta,
          },
        },
        actions: [
          {
            label: "Manage Ownership",
            href: "/org/ownership",
            surface: "ownership",
            primary: true,
          },
        ],
        // Lower rank = higher priority. More unowned = higher priority.
        rank: OWNERSHIP_RANK_BASE - unownedTeams.length,
      })
    );
  }

  // Unowned departments
  const unownedDepts = ownership.unownedEntities.filter((e) => e.type === "department");
  if (unownedDepts.length > 0) {
    const previewEntities = unownedDepts.slice(0, REASONING_PREVIEW_COUNT);
    recommendations.push(
      createRecommendation("REC_ASSIGN_DEPT_OWNER", "critical", "Assign department owners", {
        category: "ownership",
        summary: `${unownedDepts.length} department${unownedDepts.length > 1 ? "s" : ""} ${unownedDepts.length > 1 ? "are" : "is"} without an owner. Assign owners for clear accountability.`,
        evidence: {
          issueCodes: ["OWNERSHIP_UNOWNED_DEPARTMENT"],
          entities: previewEntities,
          meta: {
            count: unownedDepts.length,
            previewCount: previewEntities.length,
            aggregated: unownedDepts.length > REASONING_PREVIEW_COUNT,
            snapshotMeta,
          },
        },
        actions: [
          {
            label: "Manage Ownership",
            href: "/org/ownership",
            surface: "ownership",
            primary: true,
          },
        ],
        rank: OWNERSHIP_RANK_BASE - unownedDepts.length,
      })
    );
  }

  // Ownership conflicts
  if (ownership.conflicts.length > 0) {
    // Determine which conflict types are present
    const teamConflicts = ownership.conflicts.filter((e) => e.type === "team");
    const deptConflicts = ownership.conflicts.filter((e) => e.type === "department");

    // Only include issue codes for conflict types that actually exist
    const conflictIssueCodes: OrgSnapshotIssueCode[] = [];
    if (teamConflicts.length > 0) {
      conflictIssueCodes.push("OWNERSHIP_CONFLICT_TEAM");
    }
    if (deptConflicts.length > 0) {
      conflictIssueCodes.push("OWNERSHIP_CONFLICT_DEPARTMENT");
    }

    const previewEntities = ownership.conflicts.slice(0, REASONING_PREVIEW_COUNT);
    recommendations.push(
      createRecommendation(
        "REC_RESOLVE_OWNERSHIP_CONFLICTS",
        "warning",
        "Resolve ownership conflicts",
        {
          category: "ownership",
          summary: `${ownership.conflicts.length} ${ownership.conflicts.length > 1 ? "entities have" : "entity has"} conflicting ownership sources. Review and resolve to ensure data consistency.`,
          evidence: {
            issueCodes: conflictIssueCodes,
            entities: previewEntities,
            meta: {
              count: ownership.conflicts.length,
              previewCount: previewEntities.length,
              aggregated: ownership.conflicts.length > REASONING_PREVIEW_COUNT,
              snapshotMeta,
            },
          },
          actions: [
            {
              label: "Review Conflicts",
              href: "/org/ownership",
              surface: "ownership",
              primary: true,
            },
          ],
          rank: OWNERSHIP_RANK_BASE - ownership.conflicts.length,
        }
      )
    );
  }

  return recommendations;
}
