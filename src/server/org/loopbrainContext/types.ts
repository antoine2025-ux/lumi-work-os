/**
 * Loopbrain Org Context DTO.
 * 
 * Stable, versioned contract for Loopbrain to ingest Org intelligence,
 * recommendations, and readiness state as structured context.
 */

export type LoopbrainOrgContext = {
  generatedAt: string;
  version: "v1";

  readiness: {
    ready: boolean;
    // deterministic checklist summary, not UI text
    items: Array<{ key: string; complete: boolean; meta?: Record<string, any> }>;
  };

  orgCounts: {
    people: number;
    teams: number;
    departments: number;
    unownedEntities: number;
    missingManagers: number;
    availabilityUnknown: number;
    availabilityStale: number;
  };

  intelligence: {
    snapshot: null | { id: string; createdAt: string; source: string; findingCount: number };
    rollups: any | null; // JSON-compatible rollups structure
    topFindings: any[]; // JSON-compatible findings array
  };

  recommendations: {
    snapshot: null | { id: string; createdAt: string };
    topActions: any[]; // JSON-compatible recommendations array
  };

  freshness: {
    intelligenceSnapshot: {
      hasSnapshot: boolean;
      snapshotId: string | null;
      snapshotCreatedAt: string | null;
      ageMinutes: number | null;
      status: "MISSING" | "FRESH" | "STALE" | "OUTDATED";
      policy: { freshMinutes: number; warnMinutes: number };
    };
  };
};

