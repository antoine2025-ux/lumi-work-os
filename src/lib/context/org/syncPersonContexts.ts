// src/lib/context/org/syncPersonContexts.ts

import { loadPersonContexts } from "./loadPersonContexts";
import { upsertContextItems } from "../store";

/**
 * Sync PERSON-LEVEL ContextItems for a given workspaceId (type = "person").
 *
 * Steps:
 *  1) Load all PersonContextObject instances via loadPersonContexts(workspaceId)
 *  2) Upsert them into context_items via upsertContextItems
 *  3) Return the saved ContextItems array
 */
export async function syncPersonContexts(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("syncPersonContexts: workspaceId is required");
  }

  // 1) Load person-level ContextObjects in memory
  const personContexts = await loadPersonContexts(workspaceId);

  if (personContexts.length === 0) {
    // Nothing to sync; return empty list for callers to handle gracefully.
    return [];
  }

  // 2) Persist via ContextItem upserts (one row per person)
  const savedItems = await upsertContextItems(personContexts);

  return savedItems;
}

