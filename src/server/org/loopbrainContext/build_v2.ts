/**
 * Loopbrain Org Context Builder (v2).
 * 
 * Currently mirrors v1 output structure, but this scaffold enables
 * safe breaking improvements in the future.
 */

import { buildLoopbrainOrgContext } from "./build";
import type { LoopbrainOrgContextV2 } from "./types_v2";
import { validateLoopbrainOrgContextV2 } from "./validate_v2";

/**
 * Build the complete Loopbrain Org context payload (v2).
 * 
 * IMPORTANT:
 * - This does not change v1 behavior.
 * - It simply enables v2 response selection.
 * - Currently mirrors v1 structure; will diverge when v2 improvements are made.
 */
export async function buildLoopbrainOrgContextV2(): Promise<LoopbrainOrgContextV2> {
  const v1 = await buildLoopbrainOrgContext();

  const v2: LoopbrainOrgContextV2 = {
    generatedAt: v1.generatedAt,
    version: "v2",
    readiness: v1.readiness,
    orgCounts: v1.orgCounts,
    intelligence: v1.intelligence,
    recommendations: v1.recommendations,
    freshness: v1.freshness,
  };

  validateLoopbrainOrgContextV2(v2);
  return v2;
}

