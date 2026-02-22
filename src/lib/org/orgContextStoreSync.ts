/**
 * Org Context Store Sync
 * 
 * Handles writing OrgContextBundle to the Context Store and pruning stale items.
 * Ensures the Context Store accurately mirrors the Org state for a workspace.
 */

import { prisma } from "@/lib/db";
import { ContextObject } from "@/lib/context/contextTypes";
import { OrgContextBundle } from "./orgContextBundle";
import { upsertContextItemFromContextObject } from "@/lib/context/contextItemStore";

const ORG_CONTEXT_TYPES = ["org", "person", "team", "department", "role"] as const;

type OrgContextType = (typeof ORG_CONTEXT_TYPES)[number];

function isOrgContextType(type: string): type is OrgContextType {
  return (ORG_CONTEXT_TYPES as readonly string[]).includes(type);
}

/**
 * Write an OrgContextBundle to the Context Store.
 * 
 * Upserts all ContextObjects (org, people, teams, departments, roles) into ContextItem,
 * then prunes any stale ContextItems that no longer exist in the bundle.
 */
export async function writeOrgContextBundleToStore(
  workspaceId: string,
  bundle: OrgContextBundle
): Promise<void> {
  // 1) Gather all context objects in the bundle
  const all: ContextObject[] = [
    bundle.org,
    ...bundle.people,
    ...bundle.teams,
    ...bundle.departments,
    ...bundle.roles,
  ];

  // 2) Upsert them into ContextItem
  for (const ctx of all) {
    // Skip non-org context types just in case (defensive)
    if (!isOrgContextType(ctx.type)) {
      console.warn(
        `[OrgContextStoreSync] Skipping non-org context type: ${ctx.type}`
      );
      continue;
    }

    try {
      await upsertContextItemFromContextObject(workspaceId, ctx);
    } catch (error) {
      // Log but continue with other items
      console.error(
        `[OrgContextStoreSync] Failed to upsert ${ctx.type} ${ctx.id}:`,
        error
      );
    }
  }

  // 3) Prune stale ContextItems for this workspace + org scope
  await pruneStaleOrgContextItems(workspaceId, bundle);
}

/**
 * Prune stale ContextItems that no longer exist in the latest bundle.
 * 
 * This ensures that if a person, team, department, or role is removed from the Org,
 * their old ContextItem is also removed from the Context Store.
 */
async function pruneStaleOrgContextItems(
  workspaceId: string,
  bundle: OrgContextBundle
): Promise<void> {
  const activeIds = new Set<string>(Object.keys(bundle.byId));

  // Fetch all existing org-related ContextItems for this workspace
  const existingOrgItems = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type: { in: [...ORG_CONTEXT_TYPES] },
    },
    select: {
      id: true,
      contextId: true,
      type: true,
    },
  });

  const toDeleteIds: string[] = [];

  for (const item of existingOrgItems) {
    if (!activeIds.has(item.contextId)) {
      toDeleteIds.push(item.id);
    }
  }

  if (toDeleteIds.length === 0) {
    return;
  }

  await prisma.contextItem.deleteMany({
    where: {
      id: { in: toDeleteIds },
    },
  });

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[OrgContextStoreSync] Pruned ${toDeleteIds.length} stale ContextItems for workspace ${workspaceId}`
    );
  }
}

/**
 * Rebuild Org context for a workspace.
 * 
 * Convenience function that:
 * 1. Builds the OrgContextBundle from Prisma entities
 * 2. Writes it to the Context Store
 * 
 * Useful for:
 * - Admin-triggered manual rebuilds
 * - Nightly cron jobs
 * - Debugging
 */
export async function rebuildOrgContextForWorkspace(
  workspaceId: string
): Promise<void> {
  const { buildOrgContextBundle } = await import("./orgContextBundle");
  const bundle = await buildOrgContextBundle(workspaceId);
  await writeOrgContextBundleToStore(workspaceId, bundle);
}

