// src/lib/context/contextItemStore.ts

import { prisma } from "@/lib/db";
import type { OrgLoopbrainContextObject } from "@/lib/loopbrain/org/types";
import { ContextObject } from "@/lib/context/contextTypes";
import { validateContextObject } from "@/lib/context/contextValidation";

/**
 * Upsert a ContextItem from a ContextObject.
 * 
 * This converts the ContextObject format into the ContextItem table format.
 * The contextId is the canonical ID from the ContextObject (e.g. role:{workspaceId}:position:{id}).
 * Validates the ContextObject before persisting.
 */
export async function upsertContextItemFromContextObject(
  workspaceId: string,
  context: ContextObject | OrgLoopbrainContextObject
) {
  // Validate the ContextObject before persisting
  const validated = validateContextObject(context);

  // context.id is the canonical logical ID (e.g. role:{workspaceId}:position:{id})
  const contextId = validated.id;

  // Use the deterministic ID format: workspaceId:type:contextId
  const id = `${workspaceId}:${validated.type}:${contextId}`;

  return prisma.contextItem.upsert({
    where: { id },
    create: {
      id,
      workspaceId,
      contextId,
      type: validated.type,
      title: validated.title,
      summary: validated.summary ?? null,
      data: validated, // full validated ContextObject stored as JSON
    },
    update: {
      title: validated.title,
      summary: validated.summary ?? null,
      data: validated,
      updatedAt: new Date(validated.updatedAt),
    },
  });
}

/**
 * Bulk upsert role ContextObjects into the Context Store.
 * 
 * Filters for type === "role" and upserts each one.
 * Returns array of saved ContextItem records.
 */
export async function upsertRoleContextItems(
  workspaceId: string,
  roleContextObjects: OrgLoopbrainContextObject[]
) {
  const roleObjects = roleContextObjects.filter(
    (ctx) => ctx.type === "role"
  );

  const results = [];

  for (const roleCtx of roleObjects) {
    // Defensive: ensure we always write an id + type
    if (!roleCtx.id) continue;
    if (roleCtx.type !== "role") continue;

    try {
      const saved = await upsertContextItemFromContextObject(
        workspaceId,
        roleCtx
      );
      results.push(saved);
    } catch (error) {
      // Log but continue with other roles
      console.error(
        `[ContextStore] Failed to upsert role ${roleCtx.id}:`,
        error
      );
    }
  }

  return results;
}

/**
 * Archive a role ContextItem by setting its status to ARCHIVED.
 * Used when an OrgPosition or RoleCard is deleted.
 */
export async function archiveRoleContextItem(
  workspaceId: string,
  roleContextId: string
) {
  const existing = await prisma.contextItem.findFirst({
    where: {
      workspaceId,
      contextId: roleContextId,
      type: "role",
    },
  });

  if (!existing) return;

  // Update the stored ContextObject's status to ARCHIVED
  const data = existing.data as any;
  if (data && typeof data === "object") {
    data.status = "ARCHIVED";
  }

  await prisma.contextItem.update({
    where: { id: existing.id },
    data: {
      summary: existing.summary ?? "",
      data,
    },
  });
}

