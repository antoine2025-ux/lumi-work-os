// src/lib/context/contextItemQueries.ts

import { prisma } from "@/lib/db";
import type { OrgLoopbrainContextObject } from "@/lib/loopbrain/org/types";

/**
 * Fetch all role ContextItems for a workspace from the Context Store.
 * Returns an array of OrgLoopbrainContextObject instances.
 */
export async function getRoleContextItemsForWorkspace(
  workspaceId: string
): Promise<OrgLoopbrainContextObject[]> {
  const items = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type: "role",
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const result: OrgLoopbrainContextObject[] = [];

  for (const item of items) {
    // item.data is stored as Json; we assume it's a serialized OrgLoopbrainContextObject.
    const data = item.data as Record<string, unknown>;
    if (!data || typeof data !== "object") continue;
    if (data.type !== "role") continue;
    if (!data.id) continue;

    // Ensure the data matches OrgLoopbrainContextObject shape
    result.push(data as unknown as OrgLoopbrainContextObject);
  }

  return result;
}

