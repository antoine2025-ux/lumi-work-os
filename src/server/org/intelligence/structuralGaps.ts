/**
 * Compute Structural Gap intelligence signals.
 * 
 * Structural gaps include:
 * - Person without team (position with no teamId)
 * - Person without manager (position with no parentId, only if org size > 1)
 * - Team without members (team with no active positions)
 */

import { prisma } from "@/lib/db";
import type { OrgIntelligenceFinding } from "./types";

/**
 * Compute structural gaps in the organization.
 */
export async function computeStructuralGaps(): Promise<OrgIntelligenceFinding[]> {
  const findings: OrgIntelligenceFinding[] = [];

  // Get all active positions to compute org size and check for gaps
  const positions = await prisma.orgPosition.findMany({
    where: {
      isActive: true,
      userId: { not: null },
    },
    select: {
      id: true,
      userId: true,
      teamId: true,
      parentId: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const orgSize = positions.length;

  // Check for people without team
  for (const position of positions) {
    if (!position.teamId) {
      const personName = position.user?.name || position.user?.email || "Unknown";
      findings.push({
        signal: "STRUCTURAL_GAP",
        severity: "LOW",
        entityType: "PERSON",
        entityId: position.id,
        title: "Person without team",
        explanation: `${personName} is not assigned to any team.`,
        evidence: {
          positionId: position.id,
          userId: position.userId,
        },
      });
    }

    // Check for people without manager (only if org size > 1)
    if (orgSize > 1 && !position.parentId) {
      const personName = position.user?.name || position.user?.email || "Unknown";
      findings.push({
        signal: "STRUCTURAL_GAP",
        severity: "MEDIUM",
        entityType: "PERSON",
        entityId: position.id,
        title: "Person without manager",
        explanation: `${personName} has no manager assigned.`,
        evidence: {
          positionId: position.id,
          userId: position.userId,
        },
      });
    }
  }

  // Check for teams without members
  const teams = await prisma.orgTeam.findMany({
    where: { isActive: true },
    include: {
      positions: {
        where: {
          userId: { not: null },
          isActive: true,
        },
        select: { id: true },
      },
    },
  });

  for (const team of teams) {
    if (team.positions.length === 0) {
      findings.push({
        signal: "STRUCTURAL_GAP",
        severity: "LOW",
        entityType: "TEAM",
        entityId: team.id,
        title: "Empty team",
        explanation: `Team "${team.name}" has no members.`,
        evidence: {
          teamId: team.id,
          teamName: team.name,
        },
      });
    }
  }

  return findings;
}

