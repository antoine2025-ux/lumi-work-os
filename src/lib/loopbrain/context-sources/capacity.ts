/**
 * Capacity Context Source
 *
 * Integrates calendar availability with capacity contracts to provide
 * a unified view of a person's effective capacity. Combines:
 * - CapacityContract (contracted hours)
 * - WorkAllocation (project allocations)
 * - PersonAvailability (leave, absences)
 * - Calendar events (meetings, focus time)
 *
 * @see src/lib/loopbrain/contract/calendarAvailability.v0.ts
 * @see src/lib/loopbrain/contract/workloadAnalysis.v0.ts
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { UtilizationStatusV0 } from "../contract/workloadAnalysis.v0";

// =============================================================================
// Types
// =============================================================================

/**
 * Unified capacity snapshot combining all capacity sources.
 */
export interface UnifiedCapacitySnapshotV0 {
  /** Schema version */
  schemaVersion: "v0";
  /** When snapshot was generated */
  generatedAt: string;
  /** Workspace ID */
  workspaceId: string;
  /** Person ID */
  personId: string;
  /** Person name */
  personName: string;

  /** Contract details */
  contract: {
    /** Weekly contracted hours */
    weeklyHours: number;
    /** Contract start date */
    effectiveFrom: string;
    /** Contract end date (null = ongoing) */
    effectiveTo: string | null;
    /** FTE percentage (1.0 = full time) */
    ftePct: number;
  };

  /** Allocation details */
  allocations: {
    /** Total allocation percentage across all projects */
    totalAllocationPct: number;
    /** Number of projects allocated to */
    projectCount: number;
    /** Is over-allocated (> 100%) */
    isOverAllocated: boolean;
    /** Breakdown by project */
    byProject: Array<{
      projectId: string;
      projectName: string;
      allocationPct: number;
    }>;
  };

  /** Availability details */
  availability: {
    /** Is currently on leave */
    isOnLeave: boolean;
    /** Current leave reason (if on leave) */
    leaveReason: string | null;
    /** Expected return date (if on leave) */
    expectedReturn: string | null;
    /** Upcoming absences in next 30 days */
    upcomingAbsences: Array<{
      startDate: string;
      endDate: string;
      reason: string;
      capacityFraction: number;
    }>;
  };

  /** Calendar impact (if calendar data available) */
  calendarImpact: {
    /** Meeting hours this week */
    meetingHoursThisWeek: number;
    /** Focus hours available this week */
    focusHoursThisWeek: number;
    /** Meeting density (0-1) */
    meetingDensity: number;
    /** Has calendar data */
    hasCalendarData: boolean;
  };

  /** Effective capacity calculation */
  effectiveCapacity: {
    /** Base weekly hours (from contract) */
    baseHours: number;
    /** Hours lost to meetings */
    meetingDeduction: number;
    /** Hours lost to absences */
    absenceDeduction: number;
    /** Net available hours this week */
    netAvailableHours: number;
    /** Effective capacity percentage */
    effectivePct: number;
    /** Utilization status */
    utilizationStatus: UtilizationStatusV0;
    /** Has capacity for new work */
    hasCapacity: boolean;
  };

  /** Summary */
  summary: {
    /** Overall capacity assessment */
    assessment: "FULL_CAPACITY" | "REDUCED_CAPACITY" | "LIMITED_CAPACITY" | "NO_CAPACITY";
    /** Primary constraint (what's limiting capacity) */
    primaryConstraint: string | null;
    /** Recommended action */
    recommendation: string | null;
  };
}

/**
 * Team capacity summary.
 */
export interface TeamCapacitySummaryV0 {
  /** Schema version */
  schemaVersion: "v0";
  /** When snapshot was generated */
  generatedAt: string;
  /** Workspace ID */
  workspaceId: string;
  /** Team ID */
  teamId: string;
  /** Team name */
  teamName: string;

  /** Team members capacity */
  members: Array<{
    personId: string;
    personName: string;
    effectivePct: number;
    isOnLeave: boolean;
    hasCapacity: boolean;
  }>;

  /** Team aggregates */
  teamMetrics: {
    /** Total team members */
    totalMembers: number;
    /** Members with capacity */
    membersWithCapacity: number;
    /** Members on leave */
    membersOnLeave: number;
    /** Average effective capacity */
    avgEffectiveCapacity: number;
    /** Total available hours this week */
    totalAvailableHours: number;
    /** Team capacity status */
    status: "HEALTHY" | "CONSTRAINED" | "CRITICAL";
  };
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_WEEKLY_HOURS = 40;
const OVERLOAD_THRESHOLD = 1.0;
const SEVERE_OVERLOAD_THRESHOLD = 1.2;
const UNDERUTILIZED_THRESHOLD = 0.5;

// =============================================================================
// Main Builder Function
// =============================================================================

/**
 * Build a unified capacity snapshot for a person.
 */
export async function buildUnifiedCapacity(
  workspaceId: string,
  personId: string
): Promise<UnifiedCapacitySnapshotV0> {
  const startTime = Date.now();

  try {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Load all data in parallel
    const [person, capacityContractRaw, allocationsRaw, availabilityRecordsRaw, calendarEvents] =
      await Promise.all([
        // Person info
        prisma.workspaceMember.findFirst({
          where: { workspaceId, userId: personId },
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
          },
        }),
        // Capacity contract (uses weeklyCapacityHours)
        prisma.capacityContract.findFirst({
          where: {
            workspaceId,
            personId,
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
            effectiveFrom: { lte: now },
          },
          select: {
            weeklyCapacityHours: true,
            effectiveFrom: true,
            effectiveTo: true,
          },
        }),
        // Work allocations (uses contextType/contextId, not projectId)
        prisma.workAllocation.findMany({
          where: {
            workspaceId,
            personId,
            OR: [{ endDate: null }, { endDate: { gte: now } }],
            startDate: { lte: now },
          },
          select: {
            id: true,
            contextType: true,
            contextId: true,
            contextLabel: true,
            allocationPercent: true,
          },
        }),
        // Availability records (uses fraction, not capacityFraction)
        prisma.personAvailability.findMany({
          where: {
            workspaceId,
            personId,
            OR: [{ endDate: null }, { endDate: { gte: now } }],
            startDate: { lte: thirtyDaysFromNow },
          },
          select: {
            startDate: true,
            endDate: true,
            reason: true,
            fraction: true,
          },
        }),
        // Calendar events (placeholder - model doesn't exist yet)
        loadCalendarEvents(workspaceId, personId, weekStart, weekEnd),
      ]);

    // Transform capacity contract
    const capacityContract = capacityContractRaw
      ? {
          weeklyHours: capacityContractRaw.weeklyCapacityHours,
          effectiveFrom: capacityContractRaw.effectiveFrom,
          effectiveTo: capacityContractRaw.effectiveTo,
        }
      : null;

    // Transform allocations (filter to PROJECT type and map to expected format)
    const allocations = allocationsRaw
      .filter((a) => a.contextType === "PROJECT" && a.contextId)
      .map((a) => ({
        projectId: a.contextId!,
        project: { name: a.contextLabel || "Unknown Project" },
        allocationPercent: a.allocationPercent,
      }));

    // Transform availability records
    const availabilityRecords = availabilityRecordsRaw.map((r) => ({
      startDate: r.startDate,
      endDate: r.endDate,
      reason: r.reason ?? "OTHER",
      capacityFraction: r.fraction,
    }));

    if (!person) {
      throw new Error(`Person ${personId} not found in workspace ${workspaceId}`);
    }

    const personName = person.user.name || person.user.email || "Unknown";
    const weeklyHours = capacityContract?.weeklyHours ?? DEFAULT_WEEKLY_HOURS;

    // Build contract section
    const contract = {
      weeklyHours,
      effectiveFrom: capacityContract?.effectiveFrom?.toISOString() ?? now.toISOString(),
      effectiveTo: capacityContract?.effectiveTo?.toISOString() ?? null,
      ftePct: weeklyHours / DEFAULT_WEEKLY_HOURS,
    };

    // Build allocations section
    const totalAllocationPct = allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
    const allocationsByProject = allocations.map((a) => ({
      projectId: a.projectId!,
      projectName: a.project.name,
      allocationPct: a.allocationPercent,
    }));

    const allocationsSection = {
      totalAllocationPct,
      projectCount: allocations.length,
      isOverAllocated: totalAllocationPct > 1.0,
      byProject: allocationsByProject,
    };

    // Build availability section
    const currentLeave = availabilityRecords.find(
      (r) => r.startDate <= now && (r.endDate === null || r.endDate >= now)
    );
    const upcomingAbsences = availabilityRecords
      .filter((r) => r.startDate > now)
      .map((r) => ({
        startDate: r.startDate.toISOString().split("T")[0],
        endDate: r.endDate?.toISOString().split("T")[0] ?? "ongoing",
        reason: String(r.reason ?? "OTHER"),
        capacityFraction: r.capacityFraction ?? 0,
      }));

    const availabilitySection = {
      isOnLeave: currentLeave !== undefined,
      leaveReason: currentLeave ? String(currentLeave.reason ?? "OTHER") : null,
      expectedReturn: currentLeave?.endDate?.toISOString().split("T")[0] ?? null,
      upcomingAbsences,
    };

    // Build calendar impact section
    const meetingHoursThisWeek = calendarEvents.reduce((sum, e) => {
      const duration = (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60 * 60);
      return sum + duration;
    }, 0);
    const workingHoursThisWeek = 5 * 8; // 5 days × 8 hours
    const focusHoursThisWeek = Math.max(0, workingHoursThisWeek - meetingHoursThisWeek);
    const meetingDensity = meetingHoursThisWeek / workingHoursThisWeek;

    const calendarImpact = {
      meetingHoursThisWeek,
      focusHoursThisWeek,
      meetingDensity,
      hasCalendarData: calendarEvents.length > 0,
    };

    // Calculate effective capacity
    const baseHours = weeklyHours;
    const meetingDeduction = meetingHoursThisWeek;
    let absenceDeduction = 0;

    if (currentLeave) {
      const capacityLost = 1 - (currentLeave.capacityFraction ?? 0);
      absenceDeduction = weeklyHours * capacityLost;
    }

    const netAvailableHours = Math.max(0, baseHours - meetingDeduction - absenceDeduction);
    const effectivePct = netAvailableHours / baseHours;

    let utilizationStatus: UtilizationStatusV0;
    if (effectivePct >= SEVERE_OVERLOAD_THRESHOLD) {
      utilizationStatus = "SEVERELY_OVERLOADED";
    } else if (effectivePct >= OVERLOAD_THRESHOLD) {
      utilizationStatus = "OVERLOADED";
    } else if (effectivePct >= 0.8) {
      utilizationStatus = "HIGH";
    } else if (effectivePct >= UNDERUTILIZED_THRESHOLD) {
      utilizationStatus = "HEALTHY";
    } else {
      utilizationStatus = "UNDERUTILIZED";
    }

    const effectiveCapacity = {
      baseHours,
      meetingDeduction,
      absenceDeduction,
      netAvailableHours,
      effectivePct,
      utilizationStatus,
      hasCapacity: netAvailableHours > 0,
    };

    // Build summary
    let assessment: UnifiedCapacitySnapshotV0["summary"]["assessment"];
    let primaryConstraint: string | null = null;
    let recommendation: string | null = null;

    if (currentLeave) {
      assessment = "NO_CAPACITY";
      const reasonStr = String(currentLeave.reason ?? "leave");
      primaryConstraint = `On ${reasonStr.toLowerCase().replace("_", " ")}`;
      recommendation = currentLeave.endDate
        ? `Available again on ${currentLeave.endDate.toISOString().split("T")[0]}`
        : "Return date not set";
    } else if (effectivePct < 0.3) {
      assessment = "LIMITED_CAPACITY";
      primaryConstraint = meetingHoursThisWeek > 20 ? "Heavy meeting load" : "Low availability";
      recommendation = "Consider rescheduling non-essential meetings";
    } else if (effectivePct < 0.7) {
      assessment = "REDUCED_CAPACITY";
      primaryConstraint = meetingHoursThisWeek > 15 ? "Meeting commitments" : null;
      recommendation = null;
    } else {
      assessment = "FULL_CAPACITY";
      primaryConstraint = null;
      recommendation = null;
    }

    const snapshot: UnifiedCapacitySnapshotV0 = {
      schemaVersion: "v0",
      generatedAt: new Date().toISOString(),
      workspaceId,
      personId,
      personName,
      contract,
      allocations: allocationsSection,
      availability: availabilitySection,
      calendarImpact,
      effectiveCapacity,
      summary: {
        assessment,
        primaryConstraint,
        recommendation,
      },
    };

    const duration = Date.now() - startTime;
    logger.info("[UnifiedCapacity] Snapshot built", {
      workspaceId,
      personId,
      assessment,
      effectivePct: Math.round(effectivePct * 100),
      durationMs: duration,
    });

    return snapshot;
  } catch (error) {
    logger.error("[UnifiedCapacity] Failed to build snapshot", {
      workspaceId,
      personId,
      error,
    });
    throw error;
  }
}

// =============================================================================
// Team Capacity Builder
// =============================================================================

/**
 * Build a team capacity summary.
 */
export async function buildTeamCapacitySummary(
  workspaceId: string,
  teamId: string
): Promise<TeamCapacitySummaryV0> {
  const startTime = Date.now();

  try {
    // Load team data
    const team = await prisma.orgTeam.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        positions: {
          where: { isActive: true, userId: { not: null } },
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    // Build individual capacity snapshots
    const members: TeamCapacitySummaryV0["members"] = [];
    let membersWithCapacity = 0;
    let membersOnLeave = 0;
    let totalEffectiveCapacity = 0;
    let totalAvailableHours = 0;

    for (const position of team.positions) {
      if (!position.userId) continue;

      try {
        const snapshot = await buildUnifiedCapacity(workspaceId, position.userId);

        members.push({
          personId: position.userId,
          personName: snapshot.personName,
          effectivePct: snapshot.effectiveCapacity.effectivePct,
          isOnLeave: snapshot.availability.isOnLeave,
          hasCapacity: snapshot.effectiveCapacity.hasCapacity,
        });

        totalEffectiveCapacity += snapshot.effectiveCapacity.effectivePct;
        totalAvailableHours += snapshot.effectiveCapacity.netAvailableHours;

        if (snapshot.availability.isOnLeave) {
          membersOnLeave++;
        } else if (snapshot.effectiveCapacity.hasCapacity) {
          membersWithCapacity++;
        }
      } catch (error) {
        logger.warn("[UnifiedCapacity] Failed to build member snapshot", {
          teamId,
          personId: position.userId,
          error,
        });
      }
    }

    const avgEffectiveCapacity =
      members.length > 0 ? totalEffectiveCapacity / members.length : 0;

    // Determine team status
    let status: TeamCapacitySummaryV0["teamMetrics"]["status"];
    if (avgEffectiveCapacity >= 0.7 && membersOnLeave <= members.length * 0.2) {
      status = "HEALTHY";
    } else if (avgEffectiveCapacity >= 0.4 || membersWithCapacity >= members.length * 0.5) {
      status = "CONSTRAINED";
    } else {
      status = "CRITICAL";
    }

    const summary: TeamCapacitySummaryV0 = {
      schemaVersion: "v0",
      generatedAt: new Date().toISOString(),
      workspaceId,
      teamId,
      teamName: team.name,
      members,
      teamMetrics: {
        totalMembers: members.length,
        membersWithCapacity,
        membersOnLeave,
        avgEffectiveCapacity,
        totalAvailableHours,
        status,
      },
    };

    const duration = Date.now() - startTime;
    logger.info("[UnifiedCapacity] Team summary built", {
      workspaceId,
      teamId,
      memberCount: members.length,
      status,
      durationMs: duration,
    });

    return summary;
  } catch (error) {
    logger.error("[UnifiedCapacity] Failed to build team summary", {
      workspaceId,
      teamId,
      error,
    });
    throw error;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Load calendar events for a person.
 * NOTE: CalendarEvent model does not exist in the current Prisma schema.
 * This function returns an empty array until calendar integration is implemented.
 */
async function loadCalendarEvents(
  _workspaceId: string,
  _personId: string,
  _startDate: Date,
  _endDate: Date
): Promise<Array<{ id: string; startTime: Date; endTime: Date }>> {
  // CalendarEvent model does not exist in current schema
  // Return empty array - calendar integration to be implemented later
  return [];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}
