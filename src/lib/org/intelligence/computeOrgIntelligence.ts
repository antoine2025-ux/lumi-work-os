/**
 * Org Intelligence Computation
 * 
 * Phase 5: Computes intelligence signals from org data for LoopBrain reasoning.
 * All signals are computed, not manually entered.
 * 
 * This is the central module for generating actionable org insights.
 */

import { prisma } from "@/lib/db";
import {
  LoopBrainEvent,
  LoopBrainSignal,
  createSignalEvent,
  SignalMetadata,
  sortEventsBySeverity,
} from "@/lib/loopbrain/signals";
import { deriveTeamAvailability, TeamAvailabilitySummary } from "../rollups/deriveTeamAvailability";
import { deriveTeamSkillSummary, TeamSkillSummary } from "../rollups/deriveTeamSkills";
import { deriveAllPositionIssues } from "../deriveIssues";

// Intelligence computation result
export type OrgIntelligenceResult = {
  signals: LoopBrainEvent[];
  summary: OrgIntelligenceSummary;
  computedAt: Date;
};

// Summary statistics
export type OrgIntelligenceSummary = {
  totalSignals: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  
  // By category
  byType: Record<string, number>;
  
  // Top issues
  topIssues: {
    type: LoopBrainSignal;
    count: number;
    description: string;
  }[];
};

// Thresholds (could come from OrgIntelligenceSettings)
export type IntelligenceThresholds = {
  managementOverloadThreshold: number; // Default: 8
  managementUnderloadThreshold: number; // Default: 2
  availabilityCrunchThreshold: number; // Default: 0.5 (50%)
  staleDataDays: number; // Default: 14
};

const DEFAULT_THRESHOLDS: IntelligenceThresholds = {
  managementOverloadThreshold: 8,
  managementUnderloadThreshold: 2,
  availabilityCrunchThreshold: 0.5,
  staleDataDays: 14,
};

/**
 * Compute all org intelligence signals for a workspace
 */
export async function computeOrgIntelligence(
  workspaceId: string,
  options?: {
    thresholds?: Partial<IntelligenceThresholds>;
    includeIntentional?: boolean;
  }
): Promise<OrgIntelligenceResult> {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...options?.thresholds };
  const signals: LoopBrainEvent[] = [];
  const now = new Date();

  // Load settings if available
  const settings = await prisma.orgIntelligenceSettings.findUnique({
    where: { workspaceId },
  });

  if (settings) {
    thresholds.managementOverloadThreshold = settings.mgmtHighDirectReports;
    thresholds.staleDataDays = settings.availabilityStaleDays;
  }

  // 1. Compute management load signals
  const managementSignals = await computeManagementLoadSignals(workspaceId, thresholds);
  signals.push(...managementSignals);

  // 2. Compute ownership gap signals
  const ownershipSignals = await computeOwnershipGapSignals(workspaceId);
  signals.push(...ownershipSignals);

  // 3. Compute availability crunch signals
  const availabilitySignals = await computeAvailabilityCrunchSignals(
    workspaceId,
    thresholds.availabilityCrunchThreshold
  );
  signals.push(...availabilitySignals);

  // 4. Compute skill gap and single-point failure signals
  const skillSignals = await computeSkillGapSignals(workspaceId);
  signals.push(...skillSignals);

  // 5. Compute structural issues (cycles, orphans)
  const structuralSignals = await computeStructuralSignals(workspaceId);
  signals.push(...structuralSignals);

  // 6. Compute stale data signals
  const staleDataSignals = await computeStaleDataSignals(workspaceId, thresholds.staleDataDays);
  signals.push(...staleDataSignals);

  // Sort by severity
  const sortedSignals = sortEventsBySeverity(signals);

  // Build summary
  const summary = buildIntelligenceSummary(sortedSignals);

  return {
    signals: sortedSignals,
    summary,
    computedAt: now,
  };
}

/**
 * Compute management load signals (overload/underload)
 */
async function computeManagementLoadSignals(
  workspaceId: string,
  thresholds: IntelligenceThresholds
): Promise<LoopBrainEvent[]> {
  const signals: LoopBrainEvent[] = [];

  // Get all positions with their direct reports count
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      userId: { not: null }, // Only filled positions
    },
    include: {
      user: { select: { id: true, name: true } },
      children: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  for (const position of positions) {
    const directReportCount = position.children.length;

    if (directReportCount >= thresholds.managementOverloadThreshold) {
      signals.push(
        createSignalEvent("MANAGEMENT_OVERLOAD", position.id, {
          entityType: "person",
          context: {
            personId: position.userId,
            personName: position.user?.name,
            positionTitle: position.title,
          },
          metadata: {
            directReportCount,
            threshold: thresholds.managementOverloadThreshold,
            suggestedAction: `Consider redistributing reports. ${position.user?.name || "This manager"} has ${directReportCount} direct reports.`,
          },
        })
      );
    } else if (
      directReportCount > 0 &&
      directReportCount < thresholds.managementUnderloadThreshold
    ) {
      signals.push(
        createSignalEvent("MANAGEMENT_UNDERLOAD", position.id, {
          entityType: "person",
          context: {
            personId: position.userId,
            personName: position.user?.name,
            positionTitle: position.title,
          },
          metadata: {
            directReportCount,
            threshold: thresholds.managementUnderloadThreshold,
            suggestedAction: `Consider consolidating management. ${position.user?.name || "This manager"} has only ${directReportCount} direct report(s).`,
          },
        })
      );
    }
  }

  return signals;
}

/**
 * Compute ownership gap signals
 */
async function computeOwnershipGapSignals(
  workspaceId: string
): Promise<LoopBrainEvent[]> {
  const signals: LoopBrainEvent[] = [];

  // Check teams without owners
  const teams = await prisma.orgTeam.findMany({
    where: {
      workspaceId,
      isActive: true,
      ownerPersonId: null,
    },
    select: { id: true, name: true },
  });

  for (const team of teams) {
    signals.push(
      createSignalEvent("OWNERSHIP_GAP", team.id, {
        entityType: "team",
        context: {
          entityLabel: team.name,
          entityType: "team",
        },
        metadata: {
          suggestedAction: `Assign an owner to team "${team.name}"`,
        },
      })
    );
  }

  // Check departments without owners
  const departments = await prisma.orgDepartment.findMany({
    where: {
      workspaceId,
      isActive: true,
      ownerPersonId: null,
    },
    select: { id: true, name: true },
  });

  for (const dept of departments) {
    signals.push(
      createSignalEvent("OWNERSHIP_GAP", dept.id, {
        entityType: "department",
        context: {
          entityLabel: dept.name,
          entityType: "department",
        },
        metadata: {
          suggestedAction: `Assign an owner to department "${dept.name}"`,
        },
      })
    );
  }

  // Check active projects without owners
  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      isArchived: false,
      status: "ACTIVE",
      ownerId: null,
    },
    select: { id: true, name: true },
  });

  for (const project of projects) {
    signals.push(
      createSignalEvent("OWNERSHIP_GAP", project.id, {
        entityType: "project",
        context: {
          entityLabel: project.name,
          entityType: "project",
        },
        metadata: {
          suggestedAction: `Assign an owner to project "${project.name}"`,
        },
      })
    );
  }

  return signals;
}

/**
 * Compute availability crunch signals
 */
async function computeAvailabilityCrunchSignals(
  workspaceId: string,
  crunchThreshold: number
): Promise<LoopBrainEvent[]> {
  const signals: LoopBrainEvent[] = [];

  // Get teams with members
  const teams = await prisma.orgTeam.findMany({
    where: { workspaceId, isActive: true },
    include: {
      positions: {
        where: { isActive: true, userId: { not: null } },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  for (const team of teams) {
    if (team.positions.length === 0) continue;

    // Get availability for team members
    const personIds = team.positions.map((p) => p.userId!);
    const availabilities = await prisma.personAvailabilityHealth.findMany({
      where: {
        workspaceId,
        personId: { in: personIds },
      },
    });

    const unavailableCount = availabilities.filter(
      (a) => a.status === "UNAVAILABLE"
    ).length;

    const unavailablePercent = unavailableCount / team.positions.length;

    if (unavailablePercent >= crunchThreshold) {
      signals.push(
        createSignalEvent("AVAILABILITY_CRUNCH", team.id, {
          entityType: "team",
          context: {
            teamName: team.name,
          },
          metadata: {
            unavailableCount,
            totalCount: team.positions.length,
            unavailablePercent: Math.round(unavailablePercent * 100),
            teamId: team.id,
            teamName: team.name,
            suggestedAction: `${Math.round(unavailablePercent * 100)}% of team "${team.name}" is unavailable. Consider workload redistribution.`,
          },
        })
      );
    }
  }

  return signals;
}

/**
 * Compute skill gap and single-point failure signals
 */
async function computeSkillGapSignals(
  workspaceId: string
): Promise<LoopBrainEvent[]> {
  const signals: LoopBrainEvent[] = [];

  // Get teams
  const teams = await prisma.orgTeam.findMany({
    where: { workspaceId, isActive: true },
    select: { id: true, name: true },
  });

  for (const team of teams) {
    try {
      const skillSummary = await deriveTeamSkillSummary(workspaceId, team.id, {
        teamName: team.name,
      });

      // Check for single-point failures
      for (const singlePoint of skillSummary.singlePointSkills) {
        signals.push(
          createSignalEvent("SINGLE_POINT_FAILURE", team.id, {
            entityType: "team",
            context: {
              teamName: team.name,
              skillName: singlePoint.skillName,
            },
            metadata: {
              skillName: singlePoint.skillName,
              personCount: 1,
              teamId: team.id,
              teamName: team.name,
              suggestedAction: `Only 1 person on team "${team.name}" has skill "${singlePoint.skillName}". Consider cross-training.`,
            },
          })
        );
      }

      // Check for skill gaps against role requirements
      if (skillSummary.skillGaps) {
        const uncoveredGaps = skillSummary.skillGaps.filter((g) => !g.isCovered);
        if (uncoveredGaps.length > 0) {
          signals.push(
            createSignalEvent("SKILL_GAP", team.id, {
              entityType: "team",
              context: {
                teamName: team.name,
                gapCount: uncoveredGaps.length,
              },
              metadata: {
                missingSkills: uncoveredGaps.map((g) => g.skillName),
                teamId: team.id,
                teamName: team.name,
                suggestedAction: `Team "${team.name}" is missing required skills: ${uncoveredGaps.map((g) => g.skillName).join(", ")}`,
              },
            })
          );
        }
      }
    } catch (error) {
      // Skip teams that fail skill analysis
      console.warn(`Failed to analyze skills for team ${team.id}:`, error);
    }
  }

  return signals;
}

/**
 * Compute structural signals (cycles, orphans)
 */
async function computeStructuralSignals(
  workspaceId: string
): Promise<LoopBrainEvent[]> {
  const signals: LoopBrainEvent[] = [];

  // Get positions for structural analysis
  const positions = await prisma.orgPosition.findMany({
    where: { workspaceId, isActive: true },
    select: {
      id: true,
      title: true,
      parentId: true,
      userId: true,
      teamId: true,
      managerIntentionallyUnassigned: true,
      teamIntentionallyUnassigned: true,
    },
  });

  // Run position issue detection
  const { positionIssues, cycles } = deriveAllPositionIssues(positions);

  // Add cycle signals
  for (const cycle of cycles.cycleChains) {
    signals.push(
      createSignalEvent("CYCLE_DETECTED", cycle[0], {
        entityType: "position",
        context: {
          cycleLength: cycle.length,
        },
        metadata: {
          cycleChain: cycle,
          suggestedAction: `Circular reporting chain detected involving ${cycle.length} positions. Review and fix reporting structure.`,
        },
      })
    );
  }

  // Add orphan position signals
  for (const issue of positionIssues) {
    if (issue.issues.includes("ORPHAN_POSITION")) {
      const pos = positions.find((p) => p.id === issue.positionId);
      signals.push(
        createSignalEvent("ORPHAN_POSITION", issue.positionId, {
          entityType: "position",
          context: {
            positionTitle: pos?.title,
          },
          metadata: {
            suggestedAction: `Position "${pos?.title || issue.positionId}" has no person assigned. Consider filling or archiving.`,
          },
        })
      );
    }
  }

  return signals;
}

/**
 * Compute stale data signals
 */
async function computeStaleDataSignals(
  workspaceId: string,
  staleDays: number
): Promise<LoopBrainEvent[]> {
  const signals: LoopBrainEvent[] = [];
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - staleDays);

  // Check for stale availability data
  const staleAvailability = await prisma.personAvailabilityHealth.findMany({
    where: {
      workspaceId,
      updatedAt: { lt: staleThreshold },
    },
    select: {
      personId: true,
      updatedAt: true,
    },
  });

  for (const stale of staleAvailability) {
    const daysSinceUpdate = Math.floor(
      (Date.now() - stale.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    signals.push(
      createSignalEvent("STALE_DATA", stale.personId, {
        entityType: "person",
        context: {
          dataType: "availability",
        },
        metadata: {
          lastUpdated: stale.updatedAt,
          staleDays: daysSinceUpdate,
          suggestedAction: `Availability data for this person hasn't been updated in ${daysSinceUpdate} days.`,
        },
      })
    );
  }

  return signals;
}

/**
 * Build summary statistics from signals
 */
function buildIntelligenceSummary(signals: LoopBrainEvent[]): OrgIntelligenceSummary {
  const byType: Record<string, number> = {};
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const signal of signals) {
    byType[signal.type] = (byType[signal.type] || 0) + 1;

    switch (signal.severity) {
      case "critical":
        criticalCount++;
        break;
      case "high":
        highCount++;
        break;
      case "medium":
        mediumCount++;
        break;
      case "low":
        lowCount++;
        break;
    }
  }

  // Top issues
  const topIssues = Object.entries(byType)
    .map(([type, count]) => ({
      type: type as LoopBrainSignal,
      count,
      description: getSignalDescription(type as LoopBrainSignal),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalSignals: signals.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    byType,
    topIssues,
  };
}

/**
 * Get description for signal type
 */
function getSignalDescription(type: LoopBrainSignal): string {
  const descriptions: Record<LoopBrainSignal, string> = {
    MISSING_MANAGER: "Missing manager assignment",
    MISSING_TEAM: "Missing team assignment",
    MISSING_ROLE: "Missing role/title",
    ORPHAN_MANAGER: "Manager without reports",
    DUPLICATE_PERSON: "Possible duplicate record",
    STRUCTURE_CHANGED: "Structure modified",
    NEW_NODE_CREATED: "New addition",
    MANAGER_INTENTIONALLY_ABSENT: "Intentionally no manager",
    TEAM_INTENTIONALLY_ABSENT: "Intentionally no team",
    ORPHAN_POSITION: "Vacant position",
    CYCLE_DETECTED: "Circular reporting",
    MANAGEMENT_OVERLOAD: "Too many direct reports",
    MANAGEMENT_UNDERLOAD: "Too few direct reports",
    SINGLE_POINT_FAILURE: "Single person with skill",
    OWNERSHIP_GAP: "Missing owner",
    COVERAGE_GAP: "No backup coverage",
    AVAILABILITY_CRUNCH: "Team capacity low",
    SKILL_GAP: "Missing required skill",
    STALE_DATA: "Outdated information",
  };
  return descriptions[type] || type;
}

/**
 * Save intelligence snapshot to database
 */
export async function saveIntelligenceSnapshot(
  workspaceId: string,
  result: OrgIntelligenceResult,
  source: string = "on_demand"
): Promise<string> {
  const snapshot = await prisma.orgIntelligenceSnapshot.create({
    data: {
      workspaceId,
      source,
      findingCount: result.signals.length,
      findingsJson: result.signals as unknown as object[],
      rollupsJson: result.summary as unknown as object,
    },
  });

  return snapshot.id;
}

/**
 * Get latest intelligence snapshot
 */
export async function getLatestIntelligenceSnapshot(
  workspaceId: string
): Promise<OrgIntelligenceResult | null> {
  const snapshot = await prisma.orgIntelligenceSnapshot.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });

  if (!snapshot) return null;

  return {
    signals: snapshot.findingsJson as unknown as LoopBrainEvent[],
    summary: snapshot.rollupsJson as unknown as OrgIntelligenceSummary,
    computedAt: snapshot.createdAt,
  };
}

