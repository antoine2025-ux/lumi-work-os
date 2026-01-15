/**
 * Loopbrain Org Context Reader
 * 
 * Reads Org-related ContextItems from ContextStore and provides
 * a normalized structure for Loopbrain prompt building.
 */

import { prisma } from "@/lib/db";
import { ContextObject } from "@/lib/context/contextTypes";

const ORG_CONTEXT_TYPES = ["org", "person", "team", "department", "role"] as const;

export type LoopbrainOrgContextBundle = {
  org: ContextObject | null;
  related: ContextObject[];
  byId: Record<string, ContextObject>;
};

/**
 * Get Org context for Loopbrain from ContextStore.
 * 
 * Reads all Org-related ContextItems (org, person, team, department, role)
 * and returns them in a normalized structure suitable for Loopbrain prompt building.
 */
export async function getOrgContextForLoopbrain(
  workspaceId: string
): Promise<LoopbrainOrgContextBundle> {
  const items = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type: { in: ORG_CONTEXT_TYPES as any },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const byId: Record<string, ContextObject> = {};
  const orgItems: ContextObject[] = [];
  const related: ContextObject[] = [];

  for (const item of items) {
    const ctx = item.data as ContextObject;

    // Skip if data is not a valid ContextObject
    if (!ctx || typeof ctx !== "object" || !ctx.id || !ctx.type) {
      continue;
    }

    // Ensure the ContextObject has all required fields
    const contextObj: ContextObject = {
      id: ctx.id,
      type: ctx.type,
      title: ctx.title ?? "",
      summary: ctx.summary ?? "",
      tags: ctx.tags ?? [],
      relations: ctx.relations ?? [],
      owner: ctx.owner ?? null,
      status: ctx.status ?? "ACTIVE",
      updatedAt: ctx.updatedAt ?? new Date(item.updatedAt).toISOString(),
    };

    byId[contextObj.id] = contextObj;

    if (contextObj.type === "org") {
      orgItems.push(contextObj);
    } else {
      related.push(contextObj);
    }
  }

  // Prefer the most recently updated org root if there are multiple
  // (items are already ordered by updatedAt desc)
  const org = orgItems.length > 0 ? orgItems[0] : null;

  return { org, related, byId };
}

/**
 * Convenience helper: Get Org context + people only.
 * 
 * Useful for lightweight queries that only need org structure and people.
 */
export type LoopbrainOrgPeopleContext = {
  org: ContextObject | null;
  people: ContextObject[];
  byId: Record<string, ContextObject>;
};

export async function getOrgAndPeopleContextForLoopbrain(
  workspaceId: string
): Promise<LoopbrainOrgPeopleContext> {
  const { org, related, byId } = await getOrgContextForLoopbrain(workspaceId);

  const people = related.filter((ctx) => ctx.type === "person");

  return {
    org,
    people,
    byId,
  };
}

