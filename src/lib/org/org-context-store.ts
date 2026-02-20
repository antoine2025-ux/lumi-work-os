import { prisma } from "@/lib/db";
import {
  buildOrgContextBundleForWorkspace,
  buildOrgContextBundleForCurrentWorkspace,
  OrgContextBundle,
} from "./org-context-service";
import type { ContextObject } from "@/lib/context/contextTypes";

/**
 * Persist a single ContextObject into ContextItem.
 * For now, we:
 * - Use type = "org" in ContextItem (Org is a domain within the global context).
 * - Use contextId = ContextObject.id (e.g., "department:xyz").
 * - Store the full ContextObject in data.
 */
async function createContextItemForOrgObject(
  workspaceId: string,
  obj: ContextObject
) {
  await prisma.contextItem.create({
    data: {
      contextId: obj.id,
      workspaceId,
      type: "org",
      title: obj.title,
      summary: obj.summary,
      data: obj,
    },
  });
}

/**
 * Persist a full OrgContextBundle for a workspace into ContextItem.
 *
 * Strategy:
 * - Delete all existing ContextItems for this workspace where type = "org"
 *   (treat Org as a snapshot).
 * - Insert the root + all items as new ContextItems.
 */
export async function syncOrgContextBundleToStoreForWorkspace(
  workspaceId: string
): Promise<{ workspaceId: string; totalItems: number }> {
  const bundle: OrgContextBundle = await buildOrgContextBundleForWorkspace(
    workspaceId
  );

  const allObjects: ContextObject[] = [bundle.root, ...bundle.items];

  // Clear existing Org context for this workspace
  await prisma.contextItem.deleteMany({
    where: {
      workspaceId,
      type: "org",
    },
  });

  // Insert fresh snapshot
  for (const obj of allObjects) {
    await createContextItemForOrgObject(workspaceId, obj);
  }

  return {
    workspaceId,
    totalItems: allObjects.length,
  };
}

/**
 * Convenience helper: sync Org context for the *current* workspace.
 */
export async function syncOrgContextBundleToStoreForCurrentWorkspace(): Promise<{
  workspaceId: string;
  totalItems: number;
}> {
  // Note: We rely on the existing helper inside the service to resolve workspace.
  const bundle = await buildOrgContextBundleForCurrentWorkspace();
  const workspaceId = bundle.root.tags.find((t) =>
    t.startsWith("workspace:")
  )?.split(":")[1];

  if (!workspaceId) {
    throw new Error(
      "syncOrgContextBundleToStoreForCurrentWorkspace: unable to infer workspaceId from root tags"
    );
  }

  // Reuse the explicit workspace sync to keep behavior consistent
  return syncOrgContextBundleToStoreForWorkspace(workspaceId);
}

