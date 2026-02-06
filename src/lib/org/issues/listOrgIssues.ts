/**
 * listOrgIssues – Canonical adapter for "all current issues"
 *
 * Returns PENDING issues only after applying OrgIssueResolution.
 * Resolved / snoozed issues are excluded from the result set.
 *
 * This is the single source of truth for "how many issues exist"
 * across Overview, Intelligence, and the Issues inbox.
 *
 * Internally calls deriveAllIssues() and overlays persisted resolutions,
 * reusing the same pattern established in /api/org/integrity.
 */

import { prisma } from "@/lib/db";
import { deriveAllIssues } from "@/lib/org/issues/deriveAllIssues";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";

export async function listOrgIssues(workspaceId: string): Promise<OrgIssueMetadata[]> {
  // 1. Derive all issues from current org state
  const { issues: allDerived } = await deriveAllIssues(workspaceId);

  if (allDerived.length === 0) return [];

  // 2. Fetch persisted resolutions by issueKey
  const issueKeys = allDerived.map((i) => i.issueKey);

  let resolvedKeys = new Set<string>();

  try {
    const resolutions = await prisma.orgIssueResolution.findMany({
      where: {
        workspaceId,
        issueKey: { in: issueKeys },
      },
      select: { issueKey: true },
    });
    resolvedKeys = new Set(resolutions.map((r) => r.issueKey));
  } catch (error: unknown) {
    // Graceful degradation: if the table doesn't exist yet, treat all issues as PENDING
    const msg = error instanceof Error ? error.message : "";
    const code = (error as { code?: string })?.code;
    const isTableMissing =
      msg.includes("does not exist") ||
      msg.includes("org_issue_resolutions") ||
      code === "P2021" ||
      code === "42P01";

    if (isTableMissing) {
      console.warn(
        "[listOrgIssues] org_issue_resolutions table does not exist – returning all issues as PENDING"
      );
      resolvedKeys = new Set();
    } else {
      throw error;
    }
  }

  // 3. Filter to PENDING only (exclude resolved / snoozed)
  return allDerived.filter((issue) => !resolvedKeys.has(issue.issueKey));
}
