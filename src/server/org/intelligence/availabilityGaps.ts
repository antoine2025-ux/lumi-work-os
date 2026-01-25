/**
 * Availability gaps intelligence computation.
 * 
 * Identifies people with UNKNOWN or STALE availability as structural gaps.
 */

import { prisma } from "@/lib/db";
import type { OrgIntelligenceFinding } from "./types";
import { getOrCreateIntelligenceSettings } from "@/server/org/intelligence/settings";
import { isAvailabilityStale } from "@/server/org/availability/stale";

/**
 * Compute availability gap findings.
 * Returns findings for people with UNKNOWN or STALE availability.
 */
export async function computeAvailabilityGaps(): Promise<OrgIntelligenceFinding[]> {
  const settings = await getOrCreateIntelligenceSettings();

  const people = await prisma.orgPerson.findMany({
    select: {
      id: true,
      fullName: true,
      availabilityStatus: true,
      availabilityUpdatedAt: true,
    },
  });

  const findings: OrgIntelligenceFinding[] = [];

  for (const p of people) {
    const updatedAt = p.availabilityUpdatedAt ?? null;
    const stale = isAvailabilityStale(updatedAt, settings.availabilityStaleDays);

    if (p.availabilityStatus === "UNKNOWN") {
      findings.push({
        signal: "STRUCTURAL_GAP",
        severity: "LOW",
        entityType: "PERSON",
        entityId: p.id,
        title: "Availability unknown",
        explanation: `${p.fullName} has no availability set.`,
        evidence: {
          availabilityStatus: p.availabilityStatus,
          availabilityUpdatedAt: updatedAt ? updatedAt.toISOString() : null,
          staleDays: settings.availabilityStaleDays,
        },
      });
    } else if (stale) {
      findings.push({
        signal: "STRUCTURAL_GAP",
        severity: "MEDIUM",
        entityType: "PERSON",
        entityId: p.id,
        title: "Availability stale",
        explanation: `${p.fullName}'s availability is outdated.`,
        evidence: {
          availabilityStatus: p.availabilityStatus,
          availabilityUpdatedAt: updatedAt ? updatedAt.toISOString() : null,
          staleDays: settings.availabilityStaleDays,
        },
      });
    }
  }

  return findings;
}

