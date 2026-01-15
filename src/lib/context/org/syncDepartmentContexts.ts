// src/lib/context/org/syncDepartmentContexts.ts

import { loadDepartmentContexts } from "./loadDepartmentContexts";
import { upsertContextItems } from "../store";

/**
 * Sync DEPARTMENT-LEVEL ContextItems for a given workspaceId (type = "department").
 *
 * Steps:
 *  1) Load all DepartmentContextObject instances via loadDepartmentContexts(workspaceId)
 *  2) Upsert them into context_items via upsertContextItems
 *  3) Return the saved ContextItems array
 */
export async function syncDepartmentContexts(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("syncDepartmentContexts: workspaceId is required");
  }

  // 1) Load department-level ContextObjects in memory
  const departmentContexts = await loadDepartmentContexts(workspaceId);

  if (departmentContexts.length === 0) {
    // Nothing to sync; return empty list for callers to handle gracefully.
    return [];
  }

  // 2) Persist via ContextItem upserts (one row per department)
  const savedItems = await upsertContextItems(departmentContexts);

  return savedItems;
}

