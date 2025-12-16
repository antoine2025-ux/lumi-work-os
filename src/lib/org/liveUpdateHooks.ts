// src/lib/org/liveUpdateHooks.ts

import { prisma } from "@/lib/db";
import {
  buildRoleContext,
  type RoleContext,
} from "@/lib/org/context";
import { mapRoleContextToContextObject } from "@/lib/org/context";
import { upsertRoleContextItems } from "@/lib/context/contextItemStore";

/**
 * Load RoleContext for a given OrgPosition.
 * Fetches position, team, department, parent position, and linked RoleCard.
 */
async function loadRoleContextForPosition(
  workspaceId: string,
  positionId: string
): Promise<RoleContext | null> {
  const position = await prisma.orgPosition.findFirst({
    where: {
      id: positionId,
      workspaceId,
    },
  });
  if (!position) return null;

  const team = position.teamId
    ? await prisma.orgTeam.findFirst({
        where: { id: position.teamId, workspaceId },
      })
    : null;

  const department = team?.departmentId
    ? await prisma.orgDepartment.findFirst({
        where: { id: team.departmentId, workspaceId },
      })
    : null;

  const parentPosition = position.parentId
    ? await prisma.orgPosition.findFirst({
        where: { id: position.parentId, workspaceId },
      })
    : null;

  const roleCard = await prisma.roleCard.findFirst({
    where: {
      workspaceId,
      positionId: position.id,
    },
  });

  const rc = buildRoleContext({
    workspaceId,
    position,
    roleCard: roleCard ?? null,
    team,
    department,
    parentPosition,
  });

  return rc;
}

/**
 * Load RoleContext for a given RoleCard.
 * Fetches RoleCard, linked position (if any), team, department, and parent position.
 */
async function loadRoleContextForRoleCard(
  workspaceId: string,
  roleCardId: string
): Promise<RoleContext | null> {
  const roleCard = await prisma.roleCard.findFirst({
    where: { id: roleCardId, workspaceId },
  });
  if (!roleCard) return null;

  let position = null;
  let team = null;
  let department = null;
  let parentPosition = null;

  if (roleCard.positionId) {
    position = await prisma.orgPosition.findFirst({
      where: { id: roleCard.positionId, workspaceId },
    });

    if (position?.teamId) {
      team = await prisma.orgTeam.findFirst({
        where: { id: position.teamId, workspaceId },
      });
    }

    if (team?.departmentId) {
      department = await prisma.orgDepartment.findFirst({
        where: { id: team.departmentId, workspaceId },
      });
    }

    if (position?.parentId) {
      parentPosition = await prisma.orgPosition.findFirst({
        where: { id: position.parentId, workspaceId },
      });
    }
  }

  const rc = buildRoleContext({
    workspaceId,
    position,
    roleCard,
    team,
    department,
    parentPosition,
  });

  return rc;
}

/**
 * Live update hook – run whenever an OrgPosition is created/updated.
 * Rebuilds the RoleContext and upserts it into the Context Store.
 */
export async function onOrgPositionChanged(params: {
  workspaceId: string;
  positionId: string;
}) {
  const { workspaceId, positionId } = params;

  try {
    const roleContext = await loadRoleContextForPosition(
      workspaceId,
      positionId
    );
    if (!roleContext) {
      // No role to update – safe to exit
      return;
    }

    const ctxObj = mapRoleContextToContextObject(roleContext);
    await upsertRoleContextItems(workspaceId, [ctxObj]);

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[OrgLiveUpdate] Updated role ContextItem for position ${positionId}`
      );
    }
  } catch (error) {
    // Fail-safe: log but don't crash the mutation
    console.error(
      `[OrgLiveUpdate] Failed to update role ContextItem for position ${positionId}:`,
      error
    );
  }
}

/**
 * Live update hook – run whenever a RoleCard is created/updated.
 * Rebuilds the RoleContext and upserts it into the Context Store.
 */
export async function onRoleCardChanged(params: {
  workspaceId: string;
  roleCardId: string;
}) {
  const { workspaceId, roleCardId } = params;

  try {
    const roleContext = await loadRoleContextForRoleCard(
      workspaceId,
      roleCardId
    );
    if (!roleContext) {
      return;
    }

    const ctxObj = mapRoleContextToContextObject(roleContext);
    await upsertRoleContextItems(workspaceId, [ctxObj]);

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[OrgLiveUpdate] Updated role ContextItem for roleCard ${roleCardId}`
      );
    }
  } catch (error) {
    // Fail-safe: log but don't crash the mutation
    console.error(
      `[OrgLiveUpdate] Failed to update role ContextItem for roleCard ${roleCardId}:`,
      error
    );
  }
}

/**
 * Live update hook – run whenever an OrgPosition is deleted (soft delete).
 * Archives the role ContextItem by setting status to ARCHIVED.
 */
export async function onOrgPositionDeleted(params: {
  workspaceId: string;
  positionId: string;
}) {
  const { workspaceId, positionId } = params;

  try {
    const { archiveRoleContextItem } = await import(
      "@/lib/context/contextItemStore"
    );

    const roleContextId = `role:${workspaceId}:position:${positionId}`;
    await archiveRoleContextItem(workspaceId, roleContextId);

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[OrgLiveUpdate] Archived role ContextItem for position ${positionId}`
      );
    }
  } catch (error) {
    // Fail-safe: log but don't crash the mutation
    console.error(
      `[OrgLiveUpdate] Failed to archive role ContextItem for position ${positionId}:`,
      error
    );
  }
}

/**
 * Live update hook – run whenever a RoleCard is deleted.
 * Archives the role ContextItem by setting status to ARCHIVED.
 */
export async function onRoleCardDeleted(params: {
  workspaceId: string;
  roleCardId: string;
}) {
  const { workspaceId, roleCardId } = params;

  try {
    const { archiveRoleContextItem } = await import(
      "@/lib/context/contextItemStore"
    );

    const roleContextId = `role:${workspaceId}:role-card:${roleCardId}`;
    await archiveRoleContextItem(workspaceId, roleContextId);

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[OrgLiveUpdate] Archived role ContextItem for roleCard ${roleCardId}`
      );
    }
  } catch (error) {
    // Fail-safe: log but don't crash the mutation
    console.error(
      `[OrgLiveUpdate] Failed to archive role ContextItem for roleCard ${roleCardId}:`,
      error
    );
  }
}

