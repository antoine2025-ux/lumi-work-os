/**
 * Snapshot Freshness Computation.
 * 
 * Determines the freshness status of intelligence snapshots based on
 * workspace-configurable policies.
 */

export type SnapshotFreshness = {
  hasSnapshot: boolean;
  snapshotId: string | null;
  snapshotCreatedAt: string | null;
  ageMinutes: number | null;
  status: "MISSING" | "FRESH" | "STALE" | "OUTDATED";
  policy: {
    freshMinutes: number;
    warnMinutes: number;
  };
};

/**
 * Computes snapshot freshness status based on creation time and policy thresholds.
 * 
 * @param input - Snapshot creation date and policy thresholds
 * @returns Freshness metadata with status and age
 */
export function computeSnapshotFreshness(input: {
  createdAt: Date | null;
  freshMinutes: number;
  warnMinutes: number;
}): SnapshotFreshness {
  if (!input.createdAt) {
    return {
      hasSnapshot: false,
      snapshotId: null,
      snapshotCreatedAt: null,
      ageMinutes: null,
      status: "MISSING",
      policy: { freshMinutes: input.freshMinutes, warnMinutes: input.warnMinutes },
    };
  }

  const ageMs = Date.now() - input.createdAt.getTime();
  const ageMinutes = Math.max(0, Math.floor(ageMs / 60000));

  const status =
    ageMinutes <= input.freshMinutes
      ? "FRESH"
      : ageMinutes <= input.warnMinutes
        ? "STALE"
        : "OUTDATED";

  return {
    hasSnapshot: true,
    snapshotId: null, // Set by caller where needed
    snapshotCreatedAt: input.createdAt.toISOString(),
    ageMinutes,
    status,
    policy: { freshMinutes: input.freshMinutes, warnMinutes: input.warnMinutes },
  };
}

