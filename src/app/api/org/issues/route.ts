/**
 * GET /api/org/issues
 * Get all issues via derivation, filtered by issueKey lookup in OrgIssueResolution.
 * Uses new hybrid issues storage: derive on-demand, store resolved by issueKey.
 */

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { deriveOwnershipIssues, type OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { resolveTeamOwners, resolveDepartmentOwners } from "@/lib/org/ownership-resolver";
import { batchIsPersonManagerExempt } from "@/lib/org/manager-exemption";

export async function GET(req: NextRequest) {
  let workspaceId: string | undefined;
  
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(req);
    const userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

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

    // Step 4: Fetch all teams and departments
    const [teams, departments] = await Promise.all([
      prisma.orgTeam.findMany({
        where: { workspaceId, isActive: true },
        select: { id: true, name: true, departmentId: true },
      }),
      prisma.orgDepartment.findMany({
        where: { workspaceId, isActive: true },
        select: { id: true, name: true },
      }),
    ]);

    // Step 5: Get team IDs and department IDs for batch resolution
    const teamIds = teams.map(t => t.id);
    const deptIds = departments.map(d => d.id);

    // Get department team counts for EMPTY_DEPARTMENT derivation
    const deptTeamCounts = await prisma.orgTeam.groupBy({
      by: ['departmentId'],
      where: {
        workspaceId,
        isActive: true,
        departmentId: { not: null },
      },
      _count: { id: true },
    });

    const deptTeamMap = new Map(deptTeamCounts.map(d => [d.departmentId || '', d._count.id]));

    // Step 6: Use batch resolvers for ownership
    const [teamResolutions, deptResolutions] = await Promise.all([
      resolveTeamOwners(workspaceId, teamIds),
      resolveDepartmentOwners(workspaceId, deptIds),
    ]);

    // Step 7: Derive ownership issues
    const teamInputs = teams.map(t => ({
      id: t.id,
      name: t.name,
      departmentId: t.departmentId,
      departmentName: departments.find(d => d.id === t.departmentId)?.name || null,
    }));

    const deptInputs = departments.map(d => ({
      id: d.id,
      name: d.name,
      teamIds: teams.filter(t => t.departmentId === d.id).map(t => t.id),
    }));

    const ownershipIssues = deriveOwnershipIssues(
      teamInputs,
      deptInputs,
      teamResolutions,
      deptResolutions
    );

    // Step 8: Derive person issues (MISSING_MANAGER, etc.)
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
      },
      include: {
        user: { select: { id: true, name: true } },
        parent: { select: { userId: true } },
        team: { select: { id: true, name: true } },
      },
    });

    const userIds = positions.map(p => p.userId!).filter(Boolean);
    const exemptions = await batchIsPersonManagerExempt(userIds, workspaceId);

    const personInputs = positions.map(p => ({
      id: p.userId!,
      managerId: p.parent?.userId || null,
      teamId: p.team?.id || null,
      team: p.team?.name || null,
      title: p.title || null,
      role: p.title || null,
      isRootOrExec: exemptions.get(p.userId!) || false,
    }));

    const { deriveIssues } = await import("@/lib/org/deriveIssues");
    const personIssuesResults = deriveIssues(personInputs);

    // Convert person issues to OrgIssueMetadata format
    const personIssues: OrgIssueMetadata[] = personIssuesResults.flatMap(pi => 
      pi.issues.map(issueType => ({
        issueKey: `${issueType}:PERSON:${pi.personId}`,
        issueId: `${issueType}:PERSON:${pi.personId}`,
        type: issueType,
        severity: (issueType === 'CYCLE_DETECTED' || issueType === 'OWNERSHIP_CONFLICT') ? 'error' as const : 'warning' as const,
        entityType: 'PERSON' as const,
        entityId: pi.personId,
        entityName: positions.find(p => p.userId === pi.personId)?.user?.name || 'Unknown',
        explanation: getIssueExplanation(issueType, 'PERSON'),
        fixUrl: `/org/people/${pi.personId}`,
        fixAction: getFixAction(issueType),
      }))
    );

    // Combine all issues
    const allIssues = [...ownershipIssues, ...personIssues];

    // Step 9: Filter out resolved issues by issueKey lookup
    const issueKeys = allIssues.map(i => i.issueKey);
    const resolvedIssueKeys = await prisma.orgIssueResolution.findMany({
      where: {
        workspaceId,
        issueKey: { in: issueKeys },
      },
      select: { issueKey: true },
    });

    const resolvedKeysSet = new Set(resolvedIssueKeys.map(r => r.issueKey));
    const unresolvedIssues = allIssues.filter(issue => !resolvedKeysSet.has(issue.issueKey));

    // Step 10: Parse filters from query params
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type");
    const severityFilter = searchParams.get("severity");
    const entityTypeFilter = searchParams.get("entityType");
    const includeResolved = searchParams.get("includeResolved") === "true";

    let filteredIssues = includeResolved ? allIssues : unresolvedIssues;

    if (typeFilter) {
      filteredIssues = filteredIssues.filter(i => i.type === typeFilter);
    }
    if (severityFilter) {
      filteredIssues = filteredIssues.filter(i => i.severity === severityFilter);
    }
    if (entityTypeFilter) {
      filteredIssues = filteredIssues.filter(i => i.entityType === entityTypeFilter.toUpperCase());
    }

    // Format response (key by issueKey)
    const rows = filteredIssues.map(issue => ({
      issueKey: issue.issueKey, // PRIMARY IDENTIFIER
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

    return NextResponse.json({ ok: true, rows, total: filteredIssues.length });
  } catch (error: any) {
    console.error("[GET /api/org/issues] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to load issues" },
      { status: 500 }
    );
  }
}

// Helper functions for issue metadata
function getIssueExplanation(issueType: string, entityType: string): string {
  const explanations: Record<string, string> = {
    MISSING_MANAGER: "Person is missing a manager assignment",
    UNOWNED_TEAM: "Team has no assigned owner",
    UNOWNED_DEPARTMENT: "Department has no assigned owner",
    UNASSIGNED_TEAM: "Team is not assigned to a department",
    EMPTY_DEPARTMENT: "Department has no teams",
    OWNERSHIP_CONFLICT: "Conflicting ownership sources detected",
    ORPHAN_ENTITY: "Entity is not properly connected",
  };
  return explanations[issueType] || `${issueType} issue detected`;
}

function getFixAction(issueType: string): string {
  const actions: Record<string, string> = {
    MISSING_MANAGER: "Assign manager",
    UNOWNED_TEAM: "Assign team owner",
    UNOWNED_DEPARTMENT: "Assign department owner",
    UNASSIGNED_TEAM: "Assign to department",
    EMPTY_DEPARTMENT: "Add team to department",
    OWNERSHIP_CONFLICT: "Resolve ownership conflict",
    ORPHAN_ENTITY: "Fix entity connection",
  };
  return actions[issueType] || "Fix issue";
}

