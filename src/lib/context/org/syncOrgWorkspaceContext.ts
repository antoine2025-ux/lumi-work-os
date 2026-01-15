// src/lib/context/org/syncOrgWorkspaceContext.ts

import { loadOrgWorkspaceContext } from "./loadOrgWorkspaceContext";
import { upsertContextItem } from "../store";

/**
 * Sync the Org Workspace context for a given workspaceId:
 *  1) Load the in-memory OrgWorkspaceContextObject from Prisma
 *  2) Upsert it into context_items via upsertContextItem
 *  3) Return the saved ContextItem
 */
export async function syncOrgWorkspaceContext(workspaceId: string) {
  // Optional: basic validation to fail fast on empty input
  if (!workspaceId) {
    throw new Error("syncOrgWorkspaceContext: workspaceId is required");
  }

  // 1) Load in-memory context snapshot
  const contextObject = await loadOrgWorkspaceContext(workspaceId);

  // 2) Persist snapshot into context_items
  const saved = await upsertContextItem(contextObject);

  return saved;
}

