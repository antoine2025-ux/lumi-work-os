/**
 * Compute Ownership Risk intelligence signals.
 * 
 * Ownership risk = Teams without an owner.
 * - TEAM without owner → MEDIUM severity
 * - Departments do not support owners in schema, so skipped for now.
 */

import { prisma } from "@/lib/db";
import type { OrgIntelligenceFinding } from "./types";

/**
 * Compute ownership risk for teams without owners.
 */
export async function computeOwnershipRisk(): Promise<OrgIntelligenceFinding[]> {
  const findings: OrgIntelligenceFinding[] = [];

  // Find all teams without an owner
  const unownedTeams = await prisma.orgTeam.findMany({
    where: {
      isActive: true,
      ownerPersonId: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  for (const team of unownedTeams) {
    findings.push({
      signal: "OWNERSHIP_RISK",
      severity: "MEDIUM",
      entityType: "TEAM",
      entityId: team.id,
      title: "Unowned team",
      explanation: `Team "${team.name}" has no accountable owner.`,
      evidence: {
        teamId: team.id,
        teamName: team.name,
      },
    });
  }

  // Note: Departments do not have ownerPersonId in schema, so we skip them for now.
  // This aligns with the instruction: "Do NOT fabricate ownership data."

  return findings;
}

