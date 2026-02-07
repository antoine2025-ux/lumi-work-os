/**
 * W1.5 – Recommendation Closure: Append-only logging helper
 *
 * Records the recommendation action produced by resolveWorkFeasibility
 * into WorkRecommendationLog.
 *
 * Rules:
 * - Append-only. Never update or delete existing rows.
 * - Dedup guard: if the same (workRequestId, action) was logged within the
 *   last DEDUP_WINDOW_MS, skip creation and return the existing row.
 * - snapshotJson is diagnostic only (≤ 5 KB, flat primitives).
 *   No business logic may branch on its contents.
 */

import { prisma } from "@/lib/db";
import type { WorkRecommendationAction } from "@prisma/client";

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SNAPSHOT_BYTES = 5 * 1024; // 5 KB

export type WorkRecommendationSnapshot = {
  viableCount: number;
  capacityGapHours: number;
  requiredRoleType: string | null;
  decisionDomainKey: string | null;
  topCandidateCount: number;
  evaluatedAt: string; // ISO string
};

export async function logWorkRecommendation(params: {
  workspaceId: string;
  workRequestId: string;
  action: WorkRecommendationAction;
  reason?: string | null;
  snapshot?: WorkRecommendationSnapshot | null;
}) {
  const { workspaceId, workRequestId, action, reason, snapshot } = params;

  // ── Dedup guard ──────────────────────────────────────────────────────
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);

  const existing = await prisma.workRecommendationLog.findFirst({
    where: {
      workRequestId,
      recommendationAction: action,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return existing;
  }

  // ── Snapshot size guard ──────────────────────────────────────────────
  let safeSnapshot: typeof snapshot | null = snapshot ?? null;
  if (safeSnapshot) {
    const serialized = JSON.stringify(safeSnapshot);
    if (serialized.length > MAX_SNAPSHOT_BYTES) {
      console.warn(
        `[logWorkRecommendation] Snapshot exceeds ${MAX_SNAPSHOT_BYTES}B (${serialized.length}B), storing null`
      );
      safeSnapshot = null;
    }
  }

  // ── Create log entry ─────────────────────────────────────────────────
  const log = await prisma.workRecommendationLog.create({
    data: {
      workspaceId,
      workRequestId,
      recommendationAction: action,
      recommendationReason: reason ?? null,
      snapshotJson: safeSnapshot ?? undefined,
    },
  });

  return log;
}
