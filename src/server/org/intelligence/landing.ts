/**
 * Intelligence Landing Aggregator Service
 *
 * Aggregates derived issues from existing resolvers.
 * No new derivation logic — only grouping, filtering, and presentation.
 */

import { prisma } from "@/lib/db";
import { deriveAllIssues } from "@/lib/org/issues/deriveAllIssues";
import type { OrgIssueMetadata, OrgIssue } from "@/lib/org/deriveIssues";
import {
} from "@/lib/org/capacity/thresholds";
import {
  getIntelligenceResponseMeta,
  type IntelligenceLandingResult,
  type IntelligenceSummaries,
  type WorkRiskSummary,
} from "@/lib/org/intelligence/types";
import { resolveWorkImpactSummary } from "@/lib/org/impact/resolveWorkImpact";
import {
  getIssueSection,
} from "@/lib/org/intelligence/constants";

// ============================================================================
// Helper: Severity Ranking
// ============================================================================

function severityRank(severity: "error" | "warning" | "info"): number {
  switch (severity) {
    case "error":
      return 3;
    case "warning":
      return 2;
    case "info":
      return 1;
    default:
      return 0;
  }
}

// ============================================================================
// Helper: Sort Issues Deterministically
// ============================================================================

function sortIssuesDeterministically(issues: OrgIssueMetadata[]): OrgIssueMetadata[] {
  return [...issues].sort((a, b) => {
    // Primary: severity desc
    const severityDiff = severityRank(b.severity) - severityRank(a.severity);
    if (severityDiff !== 0) return severityDiff;
    // Secondary: issueKey asc (tie-breaker)
    return a.issueKey.localeCompare(b.issueKey);
  });
}

// ============================================================================
// Helper: Compute Summaries
// ============================================================================

function computeSummaries(issues: OrgIssueMetadata[]): IntelligenceSummaries {
  // Initialize empty summaries
  const createBaseSummary = () => ({ total: 0, critical: 0, warning: 0 });

  const ownership = { ...createBaseSummary(), conflicts: 0, unowned: 0 };
  const capacity = { ...createBaseSummary(), overallocated: 0, lowCapacity: 0, noCover: 0 };
  const work = { ...createBaseSummary(), notStaffable: 0, capacityGap: 0 };
  const responsibility = { ...createBaseSummary(), unknown: 0, misaligned: 0 };
  const decisions = { ...createBaseSummary(), missing: 0, unavailable: 0 };
  const impact = { ...createBaseSummary(), undefined: 0, highImpact: 0 };

  for (const issue of issues) {
    const section = getIssueSection(issue.type as OrgIssue);
    const isCritical = issue.severity === "error";
    const isWarning = issue.severity === "warning";

    switch (section) {
      case "ownership":
        ownership.total++;
        if (isCritical) ownership.critical++;
        if (isWarning) ownership.warning++;
        if (issue.type === "OWNERSHIP_CONFLICT") ownership.conflicts++;
        if (issue.type === "UNOWNED_TEAM" || issue.type === "UNOWNED_DEPARTMENT") {
          ownership.unowned++;
        }
        break;

      case "capacity":
        capacity.total++;
        if (isCritical) capacity.critical++;
        if (isWarning) capacity.warning++;
        if (issue.type === "OVERALLOCATED_PERSON") capacity.overallocated++;
        if (issue.type === "LOW_EFFECTIVE_CAPACITY") capacity.lowCapacity++;
        if (issue.type === "NO_AVAILABLE_COVER") capacity.noCover++;
        break;

      case "work":
        work.total++;
        if (isCritical) work.critical++;
        if (isWarning) work.warning++;
        if (issue.type === "WORK_NOT_STAFFABLE") work.notStaffable++;
        if (issue.type === "WORK_CAPACITY_GAP") work.capacityGap++;
        break;

      case "responsibility":
        responsibility.total++;
        if (isCritical) responsibility.critical++;
        if (isWarning) responsibility.warning++;
        if (issue.type === "ROLE_ALIGNMENT_UNKNOWN") responsibility.unknown++;
        if (issue.type === "WORK_ROLE_MISALIGNED") responsibility.misaligned++;
        break;

      case "decisions":
        decisions.total++;
        if (isCritical) decisions.critical++;
        if (isWarning) decisions.warning++;
        if (issue.type === "DECISION_AUTHORITY_MISSING") decisions.missing++;
        if (issue.type === "DECISION_AUTHORITY_PRIMARY_UNAVAILABLE") decisions.unavailable++;
        break;

      case "impact":
        impact.total++;
        if (isCritical) impact.critical++;
        if (isWarning) impact.warning++;
        if (issue.type === "WORK_IMPACT_UNDEFINED") impact.undefined++;
        if (issue.type === "HIGH_IMPACT_SINGLE_OWNER") impact.highImpact++;
        break;

      default:
        // Structure issues or unknown - not included in primary summaries
        break;
    }
  }

  return { ownership, capacity, work, responsibility, decisions, impact };
}

// ============================================================================
// Main Aggregator Function
// ============================================================================

export async function getIntelligenceLanding(
  workspaceId: string,
  timeWindow?: { start: Date; end: Date },
  includeExplainability?: boolean
): Promise<IntelligenceLandingResult> {
  // 1. Issue window and thresholds are now provided by deriveAllIssues

  // 2. Derive issues using canonical function (includes issueWindow and thresholds)
  const { issues: derivedIssues, issueWindow: derivedWindow, thresholds } = await deriveAllIssues(
    workspaceId,
    { timeWindow }
  );

  // 3. Use derived window (canonical function handles serialization)
  const issueWindowSerialized = derivedWindow;

  // 4. Sort deterministically
  const allIssues = sortIssuesDeterministically(derivedIssues);
  
  // 5. Get top 10 for landing inbox (always include full explainability)
  const topIssues = allIssues.slice(0, 10);

  // 6. Payload optimization: strip explainability from allIssues unless requested
  // Landing returns full explainability only for topIssues (top 10)
  // For allIssues, omit explainability unless includeExplainability=true
  const allIssuesOptimized = includeExplainability
    ? allIssues // Include full explainability when requested
    : allIssues.map((issue) => {
        // Omit explainability, keep fixUrl, fixAction, explanation for backward compatibility
        const { explainability, ...rest } = issue;
        return rest;
      });

  // 7. Compute summaries
  const summaries = computeSummaries(allIssues);

  // 8. Phase P: Derive work risk summary (high-impact work at risk)
  let workRiskSummary: WorkRiskSummary | undefined = undefined;
  let impactSummariesByWorkRequestId: Record<string, import("@/lib/org/impact/types").WorkImpactSummary> | undefined = undefined;
  
  try {
    // Fetch OPEN work requests
    const openWorkRequests = await prisma.workRequest.findMany({
      where: { workspaceId, status: "OPEN" },
    });

    if (openWorkRequests.length > 0) {
      // Batch resolve impact summaries (not full resolutions)
      const impactSummaryResults = await Promise.all(
        openWorkRequests.map((wr) =>
          resolveWorkImpactSummary(workspaceId, wr, { includeInferred: true })
        )
      );

      // Compute workRiskSummary from summaries
      let highImpactOpenCount = 0;
      let blockedImpactCount = 0;
      const atRiskWorkRequestIds = new Set<string>();

      for (const result of impactSummaryResults) {
        const { summary, hasBlockedImpacts } = result;
        let isAtRisk = false;

        // Check for HIGH severity impacts
        if (summary.highestSeverity === "HIGH") {
          highImpactOpenCount++;
          isAtRisk = true;
        }

        // Check for BLOCKED impacts
        if (hasBlockedImpacts) {
          blockedImpactCount++;
          isAtRisk = true;
        }

        if (isAtRisk) {
          atRiskWorkRequestIds.add(result.workRequestId);
        }
      }

      workRiskSummary = {
        highImpactOpenCount,
        blockedImpactCount,
        totalAtRisk: atRiskWorkRequestIds.size,
      };

      // Phase P: Build impactSummariesByWorkRequestId map for Impact column in drilldowns
      impactSummariesByWorkRequestId = {};
      for (const result of impactSummaryResults) {
        impactSummariesByWorkRequestId[result.workRequestId] = result.summary;
      }
    }
  } catch (err) {
    // Non-blocking: log error but continue without workRiskSummary
    console.warn("[getIntelligenceLanding] Failed to compute workRiskSummary:", err);
  }

  // 9. Return structured payload
  return {
    issueWindow: issueWindowSerialized,
    thresholds,
    topIssues, // Always includes explainability
    allIssues: allIssuesOptimized as OrgIssueMetadata[], // May omit explainability
    summaries,
    workRiskSummary,
    impactSummariesByWorkRequestId,
    responseMeta: getIntelligenceResponseMeta(),
  };
}

// Issue derivation is now handled by canonical deriveAllIssues function
