import { prisma } from "@/lib/db";

export type OrgHealthMetrics = {
  totalPeople: number;
  missingManager: number;
  missingTeam: number;
  missingRole: number;
  openDuplicates: number;
};

export function computeCompleteness(metrics: OrgHealthMetrics) {
  if (metrics.totalPeople <= 0) return { score: 0, breakdown: {} as Record<string, number> };

  const pct = (missing: number) => Math.max(0, Math.min(1, 1 - missing / metrics.totalPeople));

  const reportingLines = pct(metrics.missingManager);
  const teamsAssigned = pct(metrics.missingTeam);
  const rolesAssigned = pct(metrics.missingRole);

  // duplicates are pair-based; normalize vs totalPeople (light penalty)
  const duplicatesHealth = Math.max(0, Math.min(1, 1 - metrics.openDuplicates / Math.max(1, Math.floor(metrics.totalPeople / 4))));

  // weights (v1): reporting lines matters most
  const score =
    0.45 * reportingLines +
    0.25 * teamsAssigned +
    0.20 * rolesAssigned +
    0.10 * duplicatesHealth;

  return {
    score: Math.round(score * 1000) / 1000,
    breakdown: {
      reportingLines: Math.round(reportingLines * 1000) / 1000,
      teamsAssigned: Math.round(teamsAssigned * 1000) / 1000,
      rolesAssigned: Math.round(rolesAssigned * 1000) / 1000,
      duplicatesHealth: Math.round(duplicatesHealth * 1000) / 1000,
    },
  };
}

export async function measureOrgHealth(orgId: string) {
  // Count active positions (people) in the org
  const totalPeople = await prisma.orgPosition.count({
    where: {
      workspaceId: orgId,
      archivedAt: null,
      isActive: true,
      userId: { not: null },
    },
  });

  const missingManager = await prisma.orgPersonIssue.count({
    where: { orgId, type: "MISSING_MANAGER", resolvedAt: null },
  });

  const missingTeam = await prisma.orgPersonIssue.count({
    where: { orgId, type: "MISSING_TEAM", resolvedAt: null },
  });

  const missingRole = await prisma.orgPersonIssue.count({
    where: { orgId, type: "MISSING_ROLE", resolvedAt: null },
  });

  const openDuplicates = await prisma.orgDuplicateCandidate.count({
    where: { orgId, status: "OPEN" },
  });

  const metrics: OrgHealthMetrics = {
    totalPeople,
    missingManager,
    missingTeam,
    missingRole,
    openDuplicates,
  };

  const { score, breakdown } = computeCompleteness(metrics);

  const snapshot = await prisma.orgHealthSnapshot.create({
    data: {
      orgId,
      capturedAt: new Date(),
      capacityScore: score * 100, // Convert 0-1 score to 0-100 scale
    },
  });

  return { snapshot, metrics, breakdown, score };
}

