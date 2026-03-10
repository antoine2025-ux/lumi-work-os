/**
 * GET /api/org/issues
 *
 * Returns issues from the canonical pipeline (deriveAllIssues),
 * filtered by resolution status and optional query params.
 *
 * Default: returns PENDING issues only (via listOrgIssues).
 * With ?includeResolved=true: returns all issues with resolution overlay.
 *
 * Response envelope preserved: { ok: true, rows: [...], total: number }
 */

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { listOrgIssues } from "@/lib/org/issues/listOrgIssues";
import { deriveAllIssues } from "@/lib/org/issues/deriveAllIssues";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";

export async function GET(req: NextRequest) {
  try {
    // Step 1: Auth
    const auth = await getUnifiedAuth(req);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse query params
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type");
    const severityFilter = searchParams.get("severity");
    const entityTypeFilter = searchParams.get("entityType");
    const includeResolved = searchParams.get("includeResolved") === "true";

    // Step 5: Get issues from canonical pipeline
    let issues: OrgIssueMetadata[];
    let resolvedKeysSet = new Set<string>();

    if (includeResolved) {
      // Return all issues (resolved + pending) with resolution overlay
      const { issues: allDerived } = await deriveAllIssues(workspaceId);
      issues = allDerived;

      // Fetch resolved keys for the resolution field
      try {
        const issueKeys = allDerived.map((i) => i.issueKey);
        const resolutions = await prisma.orgIssueResolution.findMany({
          where: { workspaceId, issueKey: { in: issueKeys } },
          select: { issueKey: true },
        });
        resolvedKeysSet = new Set(resolutions.map((r) => r.issueKey));
      } catch {
        // Graceful degradation if table doesn't exist
        resolvedKeysSet = new Set();
      }
    } else {
      // Default: PENDING only (listOrgIssues handles resolution filtering)
      issues = await listOrgIssues(workspaceId);
    }

    // Step 6: Apply query param filters
    let filtered = issues;

    if (typeFilter) {
      filtered = filtered.filter((i) => i.type === typeFilter);
    }
    if (severityFilter) {
      filtered = filtered.filter((i) => i.severity === severityFilter);
    }
    if (entityTypeFilter) {
      filtered = filtered.filter(
        (i) => i.entityType === entityTypeFilter.toUpperCase()
      );
    }

    // Step 7: Format response (preserve existing envelope shape)
    const rows = filtered.map((issue) => ({
      issueKey: issue.issueKey,
      type: issue.type,
      entityType: issue.entityType,
      entityId: issue.entityId,
      entityName: issue.entityName,
      severity: issue.severity,
      explanation: issue.explanation,
      fixUrl: issue.fixUrl,
      fixAction: issue.fixAction,
      resolution: resolvedKeysSet.has(issue.issueKey) ? "RESOLVED" : "PENDING",
    }));

    return NextResponse.json({ ok: true, rows, total: filtered.length });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}
