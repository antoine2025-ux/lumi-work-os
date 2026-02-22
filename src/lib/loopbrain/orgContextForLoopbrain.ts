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
      type: { in: ORG_CONTEXT_TYPES as unknown as string[] },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const byId: Record<string, ContextObject> = {};
  const orgItems: ContextObject[] = [];
  const related: ContextObject[] = [];

  for (const item of items) {
    // Build ContextObject from ContextItem row fields, NOT from item.data
    // The data field contains domain-specific payloads (PersonContextData, etc.),
    // not ContextObject structure
    const data = item.data as Record<string, unknown> | null | undefined;
    const tags = (Array.isArray(data?.tags) ? data.tags : []) as string[];
    
    // Extract owner from tags (e.g., "holder:Antoine Morlet")
    const holderTag = tags.find((t: string) => t.startsWith("holder:") && t !== "holder:none");
    const owner = holderTag ? holderTag.replace("holder:", "") : null;
    
    const contextObj: ContextObject = {
      id: item.contextId,                              // ✅ Use row field
      type: item.type as ContextObject["type"],        // ✅ Use row field
      title: item.title,                               // ✅ Use row field
      summary: item.summary ?? "",                     // ✅ Use row field
      tags,                                             // Extract from payload if present
      relations: (Array.isArray(data?.relations) ? data.relations : []) as ContextObject['relations'],  // Extract from payload if present
      owner,                                           // ✅ Extract from tags
      status: "ACTIVE",                                // Default for active items
      updatedAt: new Date(item.updatedAt).toISOString(), // ✅ Use row field
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

