/**
 * Loopbrain Org Context DTO (v2).
 * 
 * Scaffold for future v2 improvements. Currently mirrors v1 structure,
 * but this file enables safe breaking changes in the future.
 */

export type LoopbrainOrgContextV2 = {
  generatedAt: string;
  version: "v2";

  // v2 may evolve structure — for now, keep identical to v1
  // This scaffold exists to allow future breaking improvements safely.
  readiness: any;
  orgCounts: any;
  intelligence: any;
  recommendations: any;
  freshness: any; // Same freshness structure as v1
};

