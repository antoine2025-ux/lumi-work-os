// src/lib/context/org/syncOrgContext.ts

import { loadOrgContext } from "./loadOrgContext";
import { upsertContextItem } from "../store";

/**
 * Sync the ORG-LEVEL ContextItem for a given workspaceId (type = "org").
 *
 * Steps:
 *  1) Load OrgContextObject via loadOrgContext(workspaceId)
 *  2) Upsert it into context_items via upsertContextItem
 *  3) Return the saved ContextItem row
 */
export async function syncOrgContext(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("syncOrgContext: workspaceId is required");
  }

  // 1) Load ORG-level ContextObject in memory
  const orgContextObject = await loadOrgContext(workspaceId);

  // 2) Persist via ContextItem upsert
  const saved = await upsertContextItem(orgContextObject);

  return saved;
}

