/**
 * Loopbrain Org Context DTO (v2).
 *
 * Scaffold for future v2 improvements. Currently mirrors v1 structure,
 * but this file enables safe breaking changes in the future.
 */

import type { LoopbrainOrgContext } from "./types";

export type LoopbrainOrgContextV2 = {
  generatedAt: string;
  version: "v2";

  // v2 may evolve structure — for now, keep identical to v1
  // This scaffold exists to allow future breaking improvements safely.
  readiness: LoopbrainOrgContext["readiness"];
  orgCounts: LoopbrainOrgContext["orgCounts"];
  intelligence: LoopbrainOrgContext["intelligence"];
  recommendations: LoopbrainOrgContext["recommendations"];
  freshness: LoopbrainOrgContext["freshness"];
};
