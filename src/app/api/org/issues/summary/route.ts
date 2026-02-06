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
import { listOrgIssues } from "@/lib/org/issues/listOrgIssues";
import { computeSummaries } from "@/lib/org/intelligence/computeSummaries";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";

// ============================================================================
// Deterministic Sort Helpers
// ============================================================================

function severityRank(sev: string): number {
  if (sev === "error") return 0;
  if (sev === "warning") return 1;
  if (sev === "info") return 2;
  return 3;
}

function scopeRank(entityType: string): number {
  if (entityType === "TEAM") return 0;
  if (entityType === "DEPARTMENT") return 1;
  if (entityType === "PERSON") return 2;
  if (entityType === "WORKSPACE") return 3;
  return 4; // unknown / missing → lowest priority
}

function sortIssues(issues: OrgIssueMetadata[]): OrgIssueMetadata[] {
  return [...issues].sort((a, b) => {
    // 1. Severity desc (error > warning > info)
    const s = severityRank(a.severity) - severityRank(b.severity);
    if (s !== 0) return s;
    // 2. Scope desc (TEAM > DEPARTMENT > PERSON > WORKSPACE)
    const e = scopeRank(a.entityType) - scopeRank(b.entityType);
    if (e !== 0) return e;
    // 3. Type alphabetically
    return a.type.localeCompare(b.type);
  });
}

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
    const topIssues = sortIssues(issues).slice(0, 6);

    return NextResponse.json({
      ok: true,
      total: issues.length,
      countsBySeverity,
      summaries,
      topIssues,
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/issues/summary] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load issues summary",
      },
      { status: 500 }
    );
  }
}
