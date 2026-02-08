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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fetchOpenLoops.ts:entry',message:'fetchOpenLoops entry',data:{workspaceId:workspaceId?.slice(0,8)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  if (!workspaceId || !userId) return [];

  const rows = await prisma.loopbrainOpenLoop.findMany({
    where: { workspaceId, userId, status: "OPEN" },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fetchOpenLoops.ts:exit',message:'fetchOpenLoops exit',data:{count:rows.length},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  return rows;
}
