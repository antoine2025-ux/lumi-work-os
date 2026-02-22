/**
 * Compute Intelligence Summaries (Client-Safe)
 *
 * Pure function to compute section summaries from issues.
 * Can be used on both server and client.
 */

import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import type { IntelligenceSummaries } from "./types";
import { getIssueSection } from "./constants";

/**
 * Compute summaries for all intelligence sections from issues.
 */
export function computeSummaries(issues: OrgIssueMetadata[]): IntelligenceSummaries {
  const summaries: IntelligenceSummaries = {
    ownership: { total: 0, critical: 0, warning: 0, conflicts: 0, unowned: 0 },
    capacity: { total: 0, critical: 0, warning: 0, overallocated: 0, lowCapacity: 0, noCover: 0 },
    work: { total: 0, critical: 0, warning: 0, notStaffable: 0, capacityGap: 0 },
    responsibility: { total: 0, critical: 0, warning: 0, unknown: 0, misaligned: 0 },
    decisions: { total: 0, critical: 0, warning: 0, missing: 0, unavailable: 0 },
    impact: { total: 0, critical: 0, warning: 0, undefined: 0, highImpact: 0 },
  };

  for (const issue of issues) {
    const section = getIssueSection(issue.type);
    if (!section) continue;

    const isCritical = issue.severity === "error";
    const isWarning = issue.severity === "warning";

    switch (section) {
      case "ownership":
        summaries.ownership.total++;
        if (isCritical) summaries.ownership.critical++;
        if (isWarning) summaries.ownership.warning++;
        if (issue.type === "UNOWNED_TEAM") summaries.ownership.unowned++;
        if (issue.type === "UNOWNED_DEPARTMENT") summaries.ownership.unowned++;
        if (issue.type === "OWNERSHIP_CONFLICT") summaries.ownership.conflicts++;
        break;

      case "capacity":
        summaries.capacity.total++;
        if (isCritical) summaries.capacity.critical++;
        if (isWarning) summaries.capacity.warning++;
        if (issue.type === "OVERALLOCATED_PERSON") summaries.capacity.overallocated++;
        if (issue.type === "UNAVAILABLE_OWNER") summaries.capacity.noCover++;
        break;

      case "work":
        summaries.work.total++;
        if (isCritical) summaries.work.critical++;
        if (isWarning) summaries.work.warning++;
        if (issue.type === "WORK_NOT_STAFFABLE") summaries.work.notStaffable++;
        if (issue.type === "WORK_CAPACITY_GAP") summaries.work.capacityGap++;
        break;

      case "responsibility":
        summaries.responsibility.total++;
        if (isCritical) summaries.responsibility.critical++;
        if (isWarning) summaries.responsibility.warning++;
        if (issue.type === "ROLE_ALIGNMENT_UNKNOWN") summaries.responsibility.unknown++;
        if (issue.type === "WORK_ROLE_MISALIGNED") summaries.responsibility.misaligned++;
        break;

      case "decisions":
        summaries.decisions.total++;
        if (isCritical) summaries.decisions.critical++;
        if (isWarning) summaries.decisions.warning++;
        if (issue.type === "DECISION_AUTHORITY_MISSING") summaries.decisions.missing++;
        if (issue.type === "DECISION_AUTHORITY_PRIMARY_UNAVAILABLE") summaries.decisions.unavailable++;
        break;

      case "impact":
        summaries.impact.total++;
        if (isCritical) summaries.impact.critical++;
        if (isWarning) summaries.impact.warning++;
        if (issue.type === "WORK_IMPACT_UNDEFINED") summaries.impact.undefined++;
        if (issue.type === "HIGH_IMPACT_SINGLE_OWNER") summaries.impact.highImpact++;
        break;
    }
  }

  return summaries;
}
