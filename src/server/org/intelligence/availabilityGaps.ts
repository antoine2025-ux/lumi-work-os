/**
 * Availability gaps intelligence computation.
 * 
 * Identifies people with UNKNOWN or STALE availability as structural gaps.
 * Uses PersonAvailabilityHealth model for availability status tracking.
 */

import { prisma } from "@/lib/db";
import type { OrgIntelligenceFinding } from "./types";
import { getOrCreateIntelligenceSettings } from "@/server/org/intelligence/settings";
import { isAvailabilityStale } from "@/server/org/availability/stale";
import { getWorkspaceContext } from "@/lib/prisma/scopingMiddleware";

/**
 * Compute availability gap findings.
 * 
 * Returns findings for people with:
 * - UNAVAILABLE status (structural gap - person can't take work)
 * - Stale availability data (outdated beyond threshold)
 * 
 * Uses PersonAvailabilityHealth model which tracks per-person availability status.
 */
export async function computeAvailabilityGaps(): Promise<OrgIntelligenceFinding[]> {
  const workspaceId = getWorkspaceContext();
  
  // If no workspace context, return empty (caller should set context first)
  if (!workspaceId) {
    return [];
  }

  const settings = await getOrCreateIntelligenceSettings();
  const findings: OrgIntelligenceFinding[] = [];

  // Query availability health records with user info
  const availabilityRecords = await prisma.personAvailabilityHealth.findMany({
    where: {
      workspaceId,
    },
    select: {
      id: true,
      personId: true,
      status: true,
      reason: true,
      updatedAt: true,
      expectedReturnDate: true,
    },
  });

  // Get user names for better explanations
  const personIds = availabilityRecords.map((r) => r.personId);
  const users = await prisma.user.findMany({
    where: {
      id: { in: personIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  for (const record of availabilityRecords) {
    const user = userMap.get(record.personId);
    const personName = user?.name ?? user?.email ?? `Person ${record.personId.slice(0, 8)}`;
    const stale = isAvailabilityStale(record.updatedAt, settings.availabilityStaleDays);

    // UNAVAILABLE status indicates a structural gap
    if (record.status === "UNAVAILABLE") {
      findings.push({
        signal: "STRUCTURAL_GAP",
        severity: "MEDIUM",
        entityType: "PERSON",
        entityId: record.personId,
        title: "Person unavailable",
        explanation: `${personName} is marked as unavailable${record.reason ? ` (${record.reason})` : ""}.`,
        evidence: {
          availabilityStatus: record.status,
          reason: record.reason,
          expectedReturnDate: record.expectedReturnDate?.toISOString() ?? null,
          updatedAt: record.updatedAt.toISOString(),
        },
      });
    }
    // Stale availability data needs attention
    else if (stale) {
      findings.push({
        signal: "STRUCTURAL_GAP",
        severity: "LOW",
        entityType: "PERSON",
        entityId: record.personId,
        title: "Availability stale",
        explanation: `${personName}'s availability hasn't been updated in ${settings.availabilityStaleDays}+ days.`,
        evidence: {
          availabilityStatus: record.status,
          lastUpdated: record.updatedAt.toISOString(),
          staleDays: settings.availabilityStaleDays,
        },
      });
    }
  }

  return findings;
}
