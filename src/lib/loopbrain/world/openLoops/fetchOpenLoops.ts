/**
 * Fetch open loops for a user.
 *
 * Returns OPEN loops ordered by most-recently updated, capped at 10.
 * Used by the orchestrator to inject context into prompts and
 * to populate the LoopbrainResponse.openLoops field for the UI.
 */

import { prisma } from "@/lib/db";
import type { LoopbrainOpenLoop } from "@prisma/client";

export async function fetchOpenLoops(
  workspaceId: string,
  userId: string,
): Promise<LoopbrainOpenLoop[]> {
  if (!workspaceId || !userId) return [];

  const rows = await prisma.loopbrainOpenLoop.findMany({
    where: { workspaceId, userId, status: "OPEN" },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  return rows;
}
