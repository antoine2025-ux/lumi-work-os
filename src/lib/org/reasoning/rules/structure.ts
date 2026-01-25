/**
 * Phase R: Structure Recommendations
 *
 * Derives recommendations from snapshot.structure signals.
 * No Prisma, no network calls - consumes snapshot only.
 */

import type { OrgIntelligenceSnapshotDTO } from "../../intelligence/snapshotTypes";
import type { OrgRecommendation, InputSnapshotMeta } from "../types";
import { createRecommendation, buildEvidence } from "../helpers";
import { STRUCTURE_RANK_BASE } from "../version";

/**
 * Derive structure recommendations from snapshot.
 *
 * AGGREGATION: Returns one recommendation per topic, not N per entity.
 */
export function deriveStructureRecommendations(
  snapshot: OrgIntelligenceSnapshotDTO,
  snapshotMeta: InputSnapshotMeta
): OrgRecommendation[] {
  const recommendations: OrgRecommendation[] = [];
  const structure = snapshot.structure;

  if (!structure) {
    return recommendations;
  }

  // Unassigned teams (not in any department)
  if (structure.unassignedTeams.length > 0) {
    recommendations.push(
      createRecommendation(
        "REC_ASSIGN_TEAMS_TO_DEPARTMENTS",
        "warning",
        "Assign teams to departments",
        {
          category: "structure",
          summary: `${structure.unassignedTeams.length} team${structure.unassignedTeams.length > 1 ? "s are" : " is"} not assigned to any department. Assign to establish organizational structure.`,
          evidence: buildEvidence(
            ["STRUCTURE_UNASSIGNED_TEAM"],
            structure.unassignedTeams,
            snapshotMeta
          ),
          actions: [
            {
              label: "Manage Structure",
              href: "/org/structure",
              surface: "structure",
              primary: true,
            },
          ],
          // Lower rank = higher priority. More unassigned teams = higher priority.
          rank: STRUCTURE_RANK_BASE - structure.unassignedTeams.length,
        }
      )
    );
  }

  // Empty departments (no teams)
  if (structure.departmentsWithoutTeams.length > 0) {
    recommendations.push(
      createRecommendation(
        "REC_REVIEW_EMPTY_DEPARTMENTS",
        "info",
        "Review empty departments",
        {
          category: "structure",
          summary: `${structure.departmentsWithoutTeams.length} department${structure.departmentsWithoutTeams.length > 1 ? "s have" : " has"} no teams. Consider adding teams or removing unused departments.`,
          evidence: buildEvidence(
            ["STRUCTURE_EMPTY_DEPARTMENT"],
            structure.departmentsWithoutTeams,
            snapshotMeta
          ),
          actions: [
            {
              label: "Manage Departments",
              href: "/org/structure",
              surface: "structure",
              primary: true,
            },
          ],
          // Lower rank = higher priority. More empty departments = higher priority.
          rank: STRUCTURE_RANK_BASE - structure.departmentsWithoutTeams.length,
        }
      )
    );
  }

  // Check for missing entity names from issues
  const missingNameIssue = structure.issues.find(
    (i) => i.code === "STRUCTURE_MISSING_ENTITY_NAME"
  );
  if (missingNameIssue && missingNameIssue.entities && missingNameIssue.entities.length > 0) {
    recommendations.push(
      createRecommendation("REC_NAME_MISSING_ENTITIES", "info", "Add missing entity names", {
        category: "structure",
        summary: `Some teams or departments have missing names. Add names for clarity in the org chart.`,
        evidence: buildEvidence(
          ["STRUCTURE_MISSING_ENTITY_NAME"],
          missingNameIssue.entities,
          snapshotMeta
        ),
        actions: [
          {
            label: "Review Entities",
            href: "/org/structure",
            surface: "structure",
            primary: true,
          },
        ],
        // Lower priority than unassigned teams and empty departments
        rank: STRUCTURE_RANK_BASE - missingNameIssue.entities.length,
      })
    );
  }

  return recommendations;
}
