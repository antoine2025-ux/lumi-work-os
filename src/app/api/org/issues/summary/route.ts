/**
 * GET /api/org/issues/summary
 *
 * Lightweight endpoint returning issue counts + top issues for
 * Overview and Intelligence consumption.
 *
 * Sources from the canonical pipeline:
 *   listOrgIssues → deriveAllIssues → OrgIssueResolution overlay (PENDING only)
 *
 * No issue derivation logic lives here — only aggregation and sorting.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { listOrgIssues } from "@/lib/org/issues/listOrgIssues";
import { sortIssuesForSnapshot } from "@/lib/org/issues/sortIssues";
import { computeSummaries } from "@/lib/org/intelligence/computeSummaries";

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Auth: reuse existing getUnifiedAuth + assertAccess pattern
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(workspaceId);

    // Fetch PENDING issues from canonical pipeline
    const issues = await listOrgIssues(workspaceId);

    // Counts by severity (matches OrgIssueMetadata.severity: error | warning | info)
    const countsBySeverity = { error: 0, warning: 0, info: 0 };
    for (const issue of issues) {
      if (issue.severity === "error") countsBySeverity.error++;
      else if (issue.severity === "warning") countsBySeverity.warning++;
      else countsBySeverity.info++;
    }

    // Per-category summaries (reuse existing computeSummaries)
    const summaries = computeSummaries(issues);

    // Top 6 issues, sorted deterministically
    const topIssues = sortIssuesForSnapshot(issues).slice(0, 6);

    return NextResponse.json({
      ok: true,
      total: issues.length,
      countsBySeverity,
      summaries,
      topIssues,
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
