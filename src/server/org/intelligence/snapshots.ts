/**
 * Org Intelligence snapshot persistence service.
 * 
 * Creates, lists, and retrieves intelligence snapshots.
 * Snapshots are computed findings stored as JSON for durability and Loopbrain indexing.
 */

import { prisma } from "@/lib/db";
import { computeOrgIntelligence } from "@/server/org/intelligence";
import type { OrgIntelligenceFinding } from "@/server/org/intelligence/types";
import { computeRollups } from "./rollups";
import type { OrgIntelligenceRollups } from "./rollups";

/**
 * Create a new intelligence snapshot.
 * Computes current intelligence findings and persists them.
 */
export async function createIntelligenceSnapshot(input: {
  source: string;
  workspaceId: string;
}): Promise<{
  id: string;
  createdAt: Date;
  findingCount: number;
  findings: OrgIntelligenceFinding[];
  rollups: OrgIntelligenceRollups;
}> {
  const findings = await computeOrgIntelligence();
  const rollups = computeRollups(findings);

  const snapshot = await prisma.orgIntelligenceSnapshot.create({
    data: {
      source: input.source,
      findingCount: findings.length,
      findingsJson: findings as any,
      rollupsJson: rollups as any,
      workspace: { connect: { id: input.workspaceId } },
    },
    select: { id: true, createdAt: true, findingCount: true },
  });

  return {
    id: snapshot.id,
    createdAt: snapshot.createdAt,
    findingCount: snapshot.findingCount,
    findings,
    rollups,
  };
}

/**
 * List intelligence snapshots (most recent first).
 */
export async function listIntelligenceSnapshots(limit: number = 20) {
  return prisma.orgIntelligenceSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      source: true,
      findingCount: true,
      rollupsJson: true,
    },
  });
}

/**
 * Get a specific intelligence snapshot by ID.
 */
export async function getIntelligenceSnapshot(snapshotId: string) {
  return prisma.orgIntelligenceSnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      id: true,
      createdAt: true,
      source: true,
      findingCount: true,
      findingsJson: true,
      rollupsJson: true,
    },
  });
}

