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

    /**
     * Step 2:
     *  - Sync ORG-level ContextItem for the same workspace (type="org").
     */
    const orgItem = await syncOrgContext(workspaceId);

    /**
     * Step 3:
     *  - Sync DEPARTMENT-level ContextItems for this workspace (type="department")
     *  - One ContextItem per department.
     */
    const departmentItems = await syncDepartmentContexts(workspaceId);

    /**
     * Step 4:
     *  - Sync TEAM-level ContextItems for this workspace (type="team")
     *  - One ContextItem per team.
     */
    const teamItems = await syncTeamContexts(workspaceId);

    /**
     * Step 5:
     *  - Sync PERSON-level ContextItems for this workspace (type="person")
     *  - One ContextItem per person.
     */
    const personItems = await syncPersonContexts(workspaceId);

    /**
     * Step 6:
     *  - Sync ROLE-level ContextItems for this workspace (type="role")
     *  - One ContextItem per role/position.
     */
    const roleItems = await syncRoleContexts(workspaceId);

    return NextResponse.json(
      {
        ok: true,
        workspaceItem: {
          id: workspaceItem.id,
          workspaceId: workspaceItem.workspaceId,
          type: workspaceItem.type,
          contextId: workspaceItem.contextId,
          title: workspaceItem.title,
          summary: workspaceItem.summary,
          updatedAt: workspaceItem.updatedAt,
        },
        orgItem: {
          id: orgItem.id,
          workspaceId: orgItem.workspaceId,
          type: orgItem.type,
          contextId: orgItem.contextId,
          title: orgItem.title,
          summary: orgItem.summary,
          updatedAt: orgItem.updatedAt,
        },
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
  } catch (error: any) {
    console.error("POST /api/loopbrain/org/context/sync error:", error);

    const message = error?.message ?? "Unknown error";

    // Handle authentication errors
    if (
      message.includes("Unauthorized") ||
      message.includes("No workspace found") ||
      message.includes("no current workspace found")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthenticated",
          detail: message,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Failed to sync Org Context (workspace + org + departments + teams + people + roles)",
        detail: message,
      },
      { status: 500 }
    );
  }
}

