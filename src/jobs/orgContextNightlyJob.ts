/**
 * Org Context Nightly Rebuild Job
 * 
 * Runs once per night to rebuild Org context for all workspaces.
 * This ensures the Org Context Store is self-healing if:
 * - Hooks were temporarily disabled
 * - Data was imported in bulk
 * - Earlier bugs left context stale
 */

import cron from "node-cron";
import { prisma } from "@/lib/db";
import { rebuildOrgContextForWorkspace } from "@/lib/org/orgContextStoreSync";

const ORG_CONTEXT_NIGHTLY_CRON =
  process.env.ORG_CONTEXT_NIGHTLY_CRON ?? "0 3 * * *";
// Default: every day at 03:00 server time

/**
 * Register the nightly Org context rebuild job.
 * 
 * This schedules a cron job that runs once per night to rebuild
 * Org context for all workspaces.
 */
export function registerOrgContextNightlyJob() {
  // Guard: only register if enabled
  if (!isOrgContextNightlyJobEnabled()) {
    console.log(
      "[OrgContext] Nightly job disabled (ORG_CONTEXT_NIGHTLY_ENABLED !== 'true')"
    );
    return;
  }

  // Guard: only register if cron pattern is provided
  if (!ORG_CONTEXT_NIGHTLY_CRON) {
    console.log("[OrgContext] Nightly job disabled (no cron pattern)");
    return;
  }

  cron.schedule(ORG_CONTEXT_NIGHTLY_CRON, async () => {
    console.log("[OrgContext] Nightly org context rebuild started");

    try {
      const workspaces = await prisma.workspace.findMany({
        select: { id: true, name: true },
      });

      console.log(
        `[OrgContext] Found ${workspaces.length} workspace(s) to rebuild`
      );

      let successCount = 0;
      let failureCount = 0;

      for (const ws of workspaces) {
        try {
          console.log(
            `[OrgContext] Rebuilding org context for workspace ${ws.id} (${ws.name})`
          );
          await rebuildOrgContextForWorkspace(ws.id);
          successCount++;
          console.log(
            `[OrgContext] Successfully rebuilt org context for workspace ${ws.id} (${ws.name})`
          );
        } catch (error: unknown) {
          failureCount++;
          console.error(
            "[OrgContext] Failed to rebuild org context for workspace",
            {
              workspaceId: ws.id,
              workspaceName: ws.name,
              error,
            }
          );
        }
      }

      console.log(
        `[OrgContext] Nightly org context rebuild completed: ${successCount} succeeded, ${failureCount} failed`
      );
    } catch (error: unknown) {
      console.error(
        "[OrgContext] Nightly org context rebuild failed at root level",
        {
          error,
        }
      );
    }
  });

  console.log(
    `[OrgContext] Nightly job registered with cron pattern: ${ORG_CONTEXT_NIGHTLY_CRON}`
  );
}

/**
 * Check if the nightly job is enabled.
 * 
 * Set ORG_CONTEXT_NIGHTLY_ENABLED=true in .env to enable.
 */
export function isOrgContextNightlyJobEnabled(): boolean {
  return process.env.ORG_CONTEXT_NIGHTLY_ENABLED === "true";
}

