// src/lib/context/org/syncTeamContexts.ts

import { loadTeamContexts } from "./loadTeamContexts";
import { upsertContextItems } from "../store";

/**
 * Sync TEAM-LEVEL ContextItems for a given workspaceId (type = "team").
 *
 * Steps:
 *  1) Load all TeamContextObject instances via loadTeamContexts(workspaceId)
 *  2) Upsert them into context_items via upsertContextItems
 *  3) Return the saved ContextItems array
 */
export async function syncTeamContexts(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("syncTeamContexts: workspaceId is required");
  }

  // 1) Load team-level ContextObjects in memory
  const teamContexts = await loadTeamContexts(workspaceId);

  if (teamContexts.length === 0) {
    // Nothing to sync; return empty list for callers to handle gracefully.
    return [];
  }

  // 2) Persist via ContextItem upserts (one row per team)
  const savedItems = await upsertContextItems(teamContexts);

  return savedItems;
}

