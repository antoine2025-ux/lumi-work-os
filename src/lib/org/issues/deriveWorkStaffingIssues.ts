/**
 * deriveWorkStaffingIssues -- Phase H Work Staffing Issue Deriver
 *
 * Scans open WorkRequest records and detects:
 *   WORK_NO_DECISION_DOMAIN        -- missing or inactive decision domain
 *   WORK_NOT_STAFFABLE             -- no viable candidates
 *   WORK_ROLE_MISMATCH             -- role filter applied but 0 matches
 *   WORK_CAPACITY_GAP              -- insufficient capacity for effort
 *
 * entityType: "WORK_REQUEST" for all issues.
 *
 * Cost cap: At most 50 open requests per invocation, ordered by
 * priority ASC (P0 first), createdAt ASC (oldest first).
 *
 * Non-goal: v0 does not emit person-level issues from candidate ranking.
 * Staffing issues are emitted only at the WorkRequest level.
 */

import { prisma } from "@/lib/db";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { getIssueExplanation } from "@/lib/org/issues/issueCopy";
import { deepLinkForWorkRequest } from "@/lib/org/issues/deepLinks";
import { resolveWorkFeasibility } from "@/lib/org/work/resolveWorkFeasibility";

const MAX_REQUESTS_PER_RUN = 50;

export async function deriveWorkStaffingIssues(
  workspaceId: string
): Promise<OrgIssueMetadata[]> {
  // Fetch workspace slug for deep links
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { slug: true },
  });
  const workspaceSlug = workspace?.slug || "";

  // 1. Fetch open work requests, deterministically ordered, capped
  const openRequests = await prisma.workRequest.findMany({
    where: { workspaceId, status: "OPEN" },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: MAX_REQUESTS_PER_RUN,
  });

  // Log if we hit the cap
  if (openRequests.length === MAX_REQUESTS_PER_RUN) {
    const totalCount = await prisma.workRequest.count({
      where: { workspaceId, status: "OPEN" },
    });
    if (totalCount > MAX_REQUESTS_PER_RUN) {
      console.warn(
        `[deriveWorkStaffingIssues] Processing ${MAX_REQUESTS_PER_RUN} of ${totalCount} open requests (cap reached)`
      );
    }
  }

  if (openRequests.length === 0) return [];

  // 2. Pre-fetch active decision domains for domain guard
  const activeDomains = await prisma.decisionDomain.findMany({
    where: { workspaceId, isArchived: false },
    select: { key: true },
  });
  const activeDomainKeys = new Set(activeDomains.map((d) => d.key));

  const issues: OrgIssueMetadata[] = [];

  // 3. Process each request
  for (const wr of openRequests) {
    const entityBase = {
      entityType: "WORK_REQUEST" as const,
      entityId: wr.id,
      entityName: wr.title,
    };
    const fixUrl = deepLinkForWorkRequest(workspaceSlug, wr.id);

    // ─── Step 0 (O1): Skip issue derivation for provisional work ────
    // Provisional work requests suppress all staffing issues except
    // WORK_NO_DECISION_DOMAIN, which serves as intentional onboarding guidance.
    if (wr.isProvisional) {
      if (!wr.decisionDomainKey || !activeDomainKeys.has(wr.decisionDomainKey)) {
        const issueKey = `WORK_NO_DECISION_DOMAIN:WORK_REQUEST:${wr.id}`;
        issues.push({
          issueKey,
          issueId: issueKey,
          type: "WORK_NO_DECISION_DOMAIN",
          severity: "error",
          ...entityBase,
          explanation: getIssueExplanation("WORK_NO_DECISION_DOMAIN"),
          fixUrl,
          fixAction: "Assign domain",
        });
      }
      continue; // Skip remaining issue derivation for provisional work
    }

    // ─── Step 1: Decision domain guard ──────────────────────────────
    if (!wr.decisionDomainKey || !activeDomainKeys.has(wr.decisionDomainKey)) {
      const issueKey = `WORK_NO_DECISION_DOMAIN:WORK_REQUEST:${wr.id}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: "WORK_NO_DECISION_DOMAIN",
        severity: "error",
        ...entityBase,
        explanation: getIssueExplanation("WORK_NO_DECISION_DOMAIN"),
        fixUrl,
        fixAction: "Assign domain",
      });
      continue; // Skip feasibility -- cannot evaluate without a domain
    }

    // ─── Step 2: Feasibility resolution ─────────────────────────────
    let result;
    try {
      result = await resolveWorkFeasibility(workspaceId, wr);
    } catch (err: unknown) {
      console.warn(
        `[deriveWorkStaffingIssues] Feasibility failed for ${wr.id}:`,
        err
      );
      continue; // Non-fatal, skip this request
    }

    // Emit at most one issue per request (most severe first)
    const { recommendation, feasibility, evidence } = result;

    // WORK_NOT_STAFFABLE: no viable candidates at all
    if (
      recommendation.action === "REQUEST_SUPPORT" &&
      evidence.viableCount === 0
    ) {
      const issueKey = `WORK_NOT_STAFFABLE:WORK_REQUEST:${wr.id}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: "WORK_NOT_STAFFABLE",
        severity: "error",
        ...entityBase,
        explanation: getIssueExplanation("WORK_NOT_STAFFABLE"),
        fixUrl,
        fixAction: "Review request",
      });
      continue;
    }

    // WORK_ROLE_MISMATCH: role filter applied but 0 matches
    if (
      evidence.poolMetrics.roleFilterApplied &&
      evidence.poolMetrics.matchingRoleCount === 0
    ) {
      const issueKey = `WORK_ROLE_MISMATCH:WORK_REQUEST:${wr.id}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: "WORK_ROLE_MISMATCH",
        severity: "warning",
        ...entityBase,
        explanation: getIssueExplanation("WORK_ROLE_MISMATCH"),
        fixUrl,
        fixAction: "Adjust role",
      });
      continue;
    }

    // WORK_CAPACITY_GAP: delayed or capacity gap
    if (
      recommendation.action === "DELAY" ||
      feasibility.capacityGapHours > 0
    ) {
      const issueKey = `WORK_CAPACITY_GAP:WORK_REQUEST:${wr.id}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: "WORK_CAPACITY_GAP",
        severity: "warning",
        ...entityBase,
        explanation: getIssueExplanation("WORK_CAPACITY_GAP"),
        fixUrl,
        fixAction: "Review capacity",
      });
      continue;
    }

    // PROCEED / REASSIGN with no gap → no issue emitted
  }

  return issues;
}
