// src/app/api/loopbrain/org/context/sync/route.ts

import { NextRequest, NextResponse } from "next/server";
import { syncCurrentWorkspaceOrgContext } from "@/lib/context/org/syncCurrentWorkspaceOrgContext";
import { syncOrgContext } from "@/lib/context/org/syncOrgContext";
import { syncDepartmentContexts } from "@/lib/context/org/syncDepartmentContexts";
import { syncTeamContexts } from "@/lib/context/org/syncTeamContexts";
import { syncPersonContexts } from "@/lib/context/org/syncPersonContexts";
import { syncRoleContexts } from "@/lib/context/org/syncRoleContexts";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { handleApiError } from "@/lib/api-errors"

export const dynamic = "force-dynamic";

/**
 * POST /api/loopbrain/org/context/sync
 *
 * Syncs workspace-level, org-level, department-level, team-level, person-level, AND role-level ContextItems for the current workspace:
 * - Resolves the current workspace
 * - Syncs WORKSPACE-level ContextItem (type="workspace")
 * - Syncs ORG-level ContextItem (type="org")
 * - Syncs DEPARTMENT-level ContextItems (type="department", one per department)
 * - Syncs TEAM-level ContextItems (type="team", one per team)
 * - Syncs PERSON-level ContextItems (type="person", one per person)
 * - Syncs ROLE-level ContextItems (type="role", one per role/position)
 * - Returns all saved ContextItem rows as JSON
 *
 * Protected: getUnifiedAuth → assertAccess (workspace MEMBER) → sync.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    if (!auth.workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "No workspace found",
          detail: "User must have an active workspace",
        },
        { status: 401 }
      );
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    /**
     * Step 1:
     *  - syncCurrentWorkspaceOrgContext() resolves the current workspace
     *    and syncs the WORKSPACE-level ContextItem (type="workspace").
     *
     * NOTE:
     *  We also need the workspaceId it used so we can call syncOrgContext.
     *  To avoid re-resolving, you may later refactor this to share a
     *  "getCurrentWorkspace" helper in this route. For now we assume
     *  syncCurrentWorkspaceOrgContext is using the same current workspace
     *  as the "org" context.
     */
    const workspaceItem = await syncCurrentWorkspaceOrgContext(request);

    // Extract workspaceId from the saved item
    const workspaceId = workspaceItem.workspaceId;
    if (!workspaceId) {
      throw new Error(
        "POST /api/loopbrain/org/context/sync: workspaceItem.workspaceId is missing"
      );
    }

    // Track sync performance
    const syncStartTime = Date.now();

    /**
     * Steps 2-6: Run all context syncs in parallel
     * 
     * Using Promise.allSettled instead of Promise.all because:
     * - Individual sync failures shouldn't block other syncs
     * - Partial success is valuable (some contexts better than none)
     * - Better error visibility and debugging
     */
    const [
      orgResult,
      departmentResult,
      teamResult,
      personResult,
      roleResult
    ] = await Promise.allSettled([
      syncOrgContext(workspaceId),
      syncDepartmentContexts(workspaceId),
      syncTeamContexts(workspaceId),
      syncPersonContexts(workspaceId),
      syncRoleContexts(workspaceId)
    ]);

    // Extract successful results and handle failures gracefully
    const orgItem = orgResult.status === 'fulfilled' ? orgResult.value : null;
    const departmentItems = departmentResult.status === 'fulfilled' ? departmentResult.value : [];
    const teamItems = teamResult.status === 'fulfilled' ? teamResult.value : [];
    const personItems = personResult.status === 'fulfilled' ? personResult.value : [];
    const roleItems = roleResult.status === 'fulfilled' ? roleResult.value : [];

    const syncEndTime = Date.now();
    const syncDuration = syncEndTime - syncStartTime;
    const failures: string[] = [];
    if (orgResult.status === 'rejected') failures.push(`Org: ${orgResult.reason}`);
    if (departmentResult.status === 'rejected') failures.push(`Departments: ${departmentResult.reason}`);
    if (teamResult.status === 'rejected') failures.push(`Teams: ${teamResult.reason}`);
    if (personResult.status === 'rejected') failures.push(`Persons: ${personResult.reason}`);
    if (roleResult.status === 'rejected') failures.push(`Roles: ${roleResult.reason}`);

    // If org context failed, that's critical - throw error
    if (!orgItem) {
      throw new Error("Failed to sync org context (critical)");
    }

    return NextResponse.json(
      {
        ok: true,
        syncDurationMs: syncDuration,
        failures: failures.length > 0 ? failures : undefined,
        breakdown: {
          org: orgItem ? 1 : 0,
          departments: departmentItems.length,
          teams: teamItems.length,
          persons: personItems.length,
          roles: roleItems.length
        },
        workspaceItem: {
          id: workspaceItem.id,
          workspaceId: workspaceItem.workspaceId,
          type: workspaceItem.type,
          contextId: workspaceItem.contextId,
          title: workspaceItem.title,
          summary: workspaceItem.summary,
          updatedAt: workspaceItem.updatedAt,
        },
        orgItem: orgItem ? {
          id: orgItem.id,
          workspaceId: orgItem.workspaceId,
          type: orgItem.type,
          contextId: orgItem.contextId,
          title: orgItem.title,
          summary: orgItem.summary,
          updatedAt: orgItem.updatedAt,
        } : null,
        departmentItems: departmentItems.map((item) => ({
          id: item.id,
          workspaceId: item.workspaceId,
          type: item.type,
          contextId: item.contextId,
          title: item.title,
          summary: item.summary,
          updatedAt: item.updatedAt,
        })),
        teamItems: teamItems.map((item) => ({
          id: item.id,
          workspaceId: item.workspaceId,
          type: item.type,
          contextId: item.contextId,
          title: item.title,
          summary: item.summary,
          updatedAt: item.updatedAt,
        })),
        personItems: personItems.map((item) => ({
          id: item.id,
          workspaceId: item.workspaceId,
          type: item.type,
          contextId: item.contextId,
          title: item.title,
          summary: item.summary,
          updatedAt: item.updatedAt,
        })),
        roleItems: roleItems.map((item) => ({
          id: item.id,
          workspaceId: item.workspaceId,
          type: item.type,
          contextId: item.contextId,
          title: item.title,
          summary: item.summary,
          updatedAt: item.updatedAt,
        })),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

