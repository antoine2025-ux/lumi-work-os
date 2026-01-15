// src/lib/context/org/syncRoleContexts.ts

import { loadRoleContexts } from "./loadRoleContexts";
import { upsertContextItems } from "../store";

/**
 * Sync ROLE-LEVEL ContextItems for a given workspaceId (type = "role").
 *
 * Steps:
 *  1) Load all RoleContextObject instances via loadRoleContexts(workspaceId)
 *  2) Upsert them into context_items via upsertContextItems
 *  3) Return the saved ContextItems array
 */
export async function syncRoleContexts(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("syncRoleContexts: workspaceId is required");
  }

  // 1) Load role-level ContextObjects in memory
  const roleContexts = await loadRoleContexts(workspaceId);

  if (roleContexts.length === 0) {
    // Nothing to sync; return empty list for callers to handle gracefully.
    return [];
  }

  // 2) Persist via ContextItem upserts (one row per role/position)
  const savedItems = await upsertContextItems(roleContexts);

  return savedItems;
}

