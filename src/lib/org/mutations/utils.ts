/**
 * Mutation Utilities
 *
 * Helper functions for computing issue resolution from before/after states.
 */

import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import type { ResolvedIssueDelta } from "./types";

/**
 * Compute issue resolution by diffing before/after states.
 *
 * @param issuesBefore - Issues before mutation (scoped set)
 * @param issuesAfter - Issues after mutation (same scoped set)
 * @param mutationId - Mutation ID for resolution metadata
 * @returns Object with active (current) and resolved (removed) issues
 *
 * Invariant: active must be the same scoped set used for before/after, never global.
 */
export function computeIssueResolution(
  issuesBefore: OrgIssueMetadata[],
  issuesAfter: OrgIssueMetadata[],
  mutationId: string
): { active: OrgIssueMetadata[]; resolved: ResolvedIssueDelta[] } {
  const afterKeys = new Set(issuesAfter.map((i) => i.issueKey));

  // Use stable timestamp for all resolved issues in this mutation
  const resolvedAt = new Date().toISOString();

  const resolved: ResolvedIssueDelta[] = issuesBefore
    .filter((issue) => !afterKeys.has(issue.issueKey))
    .map((issue) => ({
      issueKey: issue.issueKey,
      type: issue.type,
      entityType: issue.entityType,
      entityId: issue.entityId,
      fixUrl: issue.fixUrl,
      explainability: issue.explainability, // Preserve explainability for audit/debugging
      resolvedBy: {
        mutationId,
        at: resolvedAt, // Stable timestamp
      },
    }));

  // active must be the same scoped set the handler used for before/after, never global
  const active: OrgIssueMetadata[] = issuesAfter;

  return { active, resolved };
}
