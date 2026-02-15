/**
 * GET /api/org/integrity
 * 
 * Returns data integrity issues that need to be fixed.
 * Used by the Issues Inbox, "Fix required" banner, and Org Chart markers.
 * 
 * Implements derive + overlay pattern:
 * 1. Compute current issues (derived facts)
 * 2. Fetch persisted resolutions by matching key
 * 3. Overlay resolution state onto derived issues
 * 4. Return combined result
 * 
 * ⸻
 * 
 * Integrity Checks — Explicit Whitelist Only
 * 
 * RULES:
 * 1. An Issue must meet ALL three criteria:
 *    - Prevents correct structural reasoning
 *    - Has a deterministic fix
 *    - Fix surface exists outside the Issues page
 * 
 * 2. Integrity checks must NEVER infer problems from:
 *    - departmentId: null (unassigned teams are a valid state)
 *    - Empty but valid relations
 *    - Optional or "not yet assigned" conditions
 * 
 * 3. All Issue types must be explicitly whitelisted here.
 *    Pattern-based or inferred issues are forbidden.
 * 
 * 4. Every Issue must have exactly one fixUrl pointing to a fix surface.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { deriveAllIssues } from "@/lib/org/issues/deriveAllIssues";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { handleApiError } from "@/lib/api-errors"

export type IntegrityIssue = {
  issueKey: string; // PRIMARY IDENTIFIER: `${issueType}:${entityType}:${entityId}`
  type: string;
  entityType: "person" | "team" | "department" | "position";
  entityId: string;
  entityName: string;
  severity: "error" | "warning";
  message: string;
  fixUrl?: string;
  resolution: "PENDING" | "ACKNOWLEDGED" | "FALSE_POSITIVE" | "RESOLVED";
  resolutionNote: string | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  firstSeenAt: string | null;
};

export type IntegrityResponse = {
  ok: boolean;
  totalIssues: number;
  issues: IntegrityIssue[];
  summary: {
    person_missing_team: number;
    person_missing_department: number;
    person_missing_manager: number;
    team_missing_owner: number;
    department_missing_owner: number;
    manager_cycle: number;
  };
};

// Verify every issue has exactly one fixUrl
function validateIssueFixSurface(issue: IntegrityIssue): void {
  if (!issue.fixUrl) {
    throw new Error(`Issue ${issue.issueKey} is missing fixUrl`);
  }

  if (!issue.fixUrl.startsWith('/org/')) {
    throw new Error(
      `Issue ${issue.issueKey} has invalid fixUrl: ${issue.fixUrl}`
    );
  }
}

// Helper functions for issue metadata
function getIssueExplanation(issueType: string): string {
  const explanations: Record<string, string> = {
    MISSING_MANAGER: "Person is missing a manager assignment",
    MISSING_TEAM: "Person is missing a team assignment",
    MISSING_ROLE: "Person is missing a role/title",
    UNOWNED_TEAM: "Team has no assigned owner",
    UNOWNED_DEPARTMENT: "Department has no assigned owner",
    UNASSIGNED_TEAM: "Team is not assigned to a department",
    EMPTY_DEPARTMENT: "Department has no teams",
    OWNERSHIP_CONFLICT: "Conflicting ownership sources detected",
    ORPHAN_ENTITY: "Entity is not properly connected",
    CYCLE_DETECTED: "Circular reporting chain detected",
  };
  return explanations[issueType] || `${issueType} issue detected`;
}

function getFocusForIssue(issueType: string): string {
  const focusMap: Record<string, string> = {
    MISSING_MANAGER: "manager",
    MISSING_TEAM: "team",
    MISSING_ROLE: "role",
  };
  return focusMap[issueType] || "";
}

function getFixAction(issueType: string): string {
  const actions: Record<string, string> = {
    MISSING_MANAGER: "Assign manager",
    MISSING_TEAM: "Assign team",
    MISSING_ROLE: "Assign role",
    UNOWNED_TEAM: "Assign team owner",
    UNOWNED_DEPARTMENT: "Assign department owner",
    UNASSIGNED_TEAM: "Assign to department",
    EMPTY_DEPARTMENT: "Add team to department",
    OWNERSHIP_CONFLICT: "Resolve ownership conflict",
    ORPHAN_ENTITY: "Fix entity connection",
    CYCLE_DETECTED: "Fix reporting cycle",
  };
  return actions[issueType] || "Fix issue";
}

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
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
    const { searchParams } = new URL(request.url);
    const resolutionFilter = searchParams.get("resolution"); // PENDING, ACKNOWLEDGED, etc.
    const includeResolved = searchParams.get("includeResolved") === "true";

    // Step 5: Derive all issues using canonical function (default window for integrity)
    const { issues: allDerivedIssues } = await deriveAllIssues(workspaceId);

    // Step 9: Fetch persisted resolutions by issueKey (hybrid storage: derive on-demand, store resolved by issueKey)
    const issueKeys = allDerivedIssues.map(i => i.issueKey);
    
    // Handle case where table doesn't exist yet (database migration not run)
    let resolvedIssues = [];
    try {
      resolvedIssues = await prisma.orgIssueResolution.findMany({
        where: {
          workspaceId,
          issueKey: { in: issueKeys },
        },
        include: {
          workspace: {
            select: {
              ownerId: true, // For resolver name lookup
            },
          },
        },
      });
    } catch (error: any) {
      // If table doesn't exist, continue with empty array (no resolved issues yet)
      // This is a graceful degradation - issues will all show as PENDING until migration is run
      const errorMessage = error?.message || '';
      const isTableMissing = errorMessage.includes('does not exist') || 
                             errorMessage.includes('org_issue_resolutions') ||
                             error?.code === 'P2021' || // Table does not exist in the current database
                             error?.code === '42P01';   // PostgreSQL error: relation does not exist
      
      if (isTableMissing) {
        console.warn('[GET /api/org/integrity] org_issue_resolutions table does not exist. Please run: npx prisma migrate deploy or npx prisma db push');
        resolvedIssues = [];
      } else {
        // Re-throw other errors (connection issues, permissions, etc.)
        throw error;
      }
    }

    // Fetch resolver names
    const resolverIds = resolvedIssues.map(r => r.resolvedBy).filter(Boolean);
    const resolvers = resolverIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: resolverIds } },
          select: { id: true, name: true },
        })
      : [];
    const resolverMap = new Map(resolvers.map(r => [r.id, r.name]));

    // Build resolved keys map
    const resolvedByKey = new Map<string, typeof resolvedIssues[0]>();
    for (const resolved of resolvedIssues) {
      resolvedByKey.set(resolved.issueKey, resolved);
    }

    // Step 10: Overlay resolution state onto derived issues (by issueKey)
    const issuesWithResolution: IntegrityIssue[] = allDerivedIssues.map((issue) => {
      const resolved = resolvedByKey.get(issue.issueKey);
      const resolution = resolved ? "RESOLVED" : "PENDING"; // For now, only RESOLVED or PENDING
      
      // Map entityType from uppercase to lowercase for compatibility
      const entityTypeMap: Record<string, "person" | "team" | "department" | "position"> = {
        'PERSON': 'person',
        'TEAM': 'team',
        'DEPARTMENT': 'department',
        'POSITION': 'position',
      };
      const entityType = entityTypeMap[issue.entityType] || 'person';

      const issueWithResolution: IntegrityIssue = {
        issueKey: issue.issueKey, // PRIMARY IDENTIFIER
        type: issue.type,
        entityType,
        entityId: issue.entityId,
        entityName: issue.entityName,
        severity: issue.severity,
        message: issue.explanation,
        fixUrl: issue.fixUrl,
        resolution: resolution as "PENDING" | "RESOLVED" | "ACKNOWLEDGED" | "FALSE_POSITIVE",
        resolutionNote: resolved?.resolutionNote || null,
        resolvedById: resolved?.resolvedBy || null,
        resolvedByName: resolved?.resolvedBy ? (resolverMap.get(resolved.resolvedBy) || null) : null,
        resolvedAt: resolved?.resolvedAt?.toISOString() || null,
        firstSeenAt: null, // Can be enhanced later with first-seen tracking
      };

      // Validate fix surface uniqueness
      validateIssueFixSurface(issueWithResolution);

      return issueWithResolution;
    });

    // Step 11: Apply resolution filter
    let filteredIssues = issuesWithResolution;

    if (resolutionFilter) {
      filteredIssues = issuesWithResolution.filter(
        (issue) => issue.resolution === resolutionFilter
      );
    } else if (!includeResolved) {
      // Default: only PENDING issues
      filteredIssues = issuesWithResolution.filter(
        (issue) => issue.resolution === "PENDING"
      );
    }

    // Step 12: Build summary (from all derived issues, not filtered)
    const summary = {
      person_missing_team: allDerivedIssues.filter((i) => i.type === "MISSING_TEAM" && i.entityType === "PERSON").length,
      person_missing_department: 0, // Deprecated - handled via team assignment
      person_missing_manager: allDerivedIssues.filter((i) => i.type === "MISSING_MANAGER").length,
      team_missing_owner: allDerivedIssues.filter((i) => i.type === "UNOWNED_TEAM").length,
      department_missing_owner: allDerivedIssues.filter((i) => i.type === "UNOWNED_DEPARTMENT").length,
      manager_cycle: allDerivedIssues.filter((i) => i.type === "CYCLE_DETECTED").length,
    };

    return NextResponse.json({
      ok: true,
      totalIssues: filteredIssues.length,
      issues: filteredIssues,
      summary,
    } as IntegrityResponse);
  } catch (error) {
    return handleApiError(error, request)
  }
}
