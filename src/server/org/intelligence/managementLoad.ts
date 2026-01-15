/**
 * Compute Management Load intelligence signals.
 * 
 * Management load = number of direct reports (via OrgPosition.children relation)
 * Thresholds:
 * - LOW: 0-4 direct reports
 * - MEDIUM: 5-8 direct reports
 * - HIGH: 9+ direct reports
 */

import { prisma } from "@/lib/db";
import type { OrgIntelligenceFinding } from "./types";
import { getOrCreateIntelligenceSettings } from "./settings";

/**
 * Compute management load for all positions that have direct reports.
 */
export async function computeManagementLoad(): Promise<OrgIntelligenceFinding[]> {
  // Find all positions that have children (direct reports)
  const managers = await prisma.orgPosition.findMany({
    where: {
      isActive: true,
      userId: { not: null },
      children: {
        some: {
          isActive: true,
        },
      },
    },
    include: {
      children: {
        where: { isActive: true },
        select: { id: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const settings = await getOrCreateIntelligenceSettings();

  return managers.map((m) => {
    const count = m.children.length;
    const severity =
      count >= settings.mgmtHighDirectReports
        ? "HIGH"
        : count >= settings.mgmtMediumDirectReports
          ? "MEDIUM"
          : "LOW";
    const personName = m.user?.name || m.user?.email || "Unknown";

    return {
      signal: "MANAGEMENT_LOAD",
      severity,
      entityType: "PERSON",
      entityId: m.id,
      title: "Management load",
      explanation: `${personName} manages ${count} direct report${count !== 1 ? "s" : ""}.`,
      evidence: {
        directReportCount: count,
        positionId: m.id,
        userId: m.userId,
      },
    };
  });
}

