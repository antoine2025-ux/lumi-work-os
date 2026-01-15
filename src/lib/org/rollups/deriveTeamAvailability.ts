/**
 * Team-Level Availability Rollups
 * 
 * Aggregates individual availability into team-level summaries
 * for LoopBrain capacity reasoning.
 * 
 * Phase 2: Core team availability aggregation
 */

import {
  deriveCurrentAvailability,
  derivePersonAvailability,
  formatReason,
  type AvailabilityWindow,
  type AvailabilityReason,
  type EmploymentStatus,
  type PersonAvailabilityResult,
} from "../deriveAvailability";

// Team member input type
export type TeamMemberInput = {
  personId: string;
  personName?: string;
  employmentStatus?: EmploymentStatus;
  windows: AvailabilityWindow[];
};

// Team availability summary
export type TeamAvailabilitySummary = {
  teamId: string;
  teamName?: string;
  
  // Headcounts
  totalMembers: number;
  availableCount: number;
  partialCount: number;
  unavailableCount: number;
  
  // Percentages
  availablePercent: number;
  unavailablePercent: number;
  
  // Effective capacity (0-1 scale, accounting for partial)
  totalEffectiveCapacity: number;
  avgEffectiveCapacity: number;
  
  // Phase 5: Risk indicators
  isAtRisk: boolean; // >50% unavailable
  isCritical: boolean; // >75% unavailable
  
  // Absence breakdown by reason
  absencesByReason: Record<AvailabilityReason, number>;
  
  // Upcoming returns
  upcomingReturns: UpcomingReturn[];
  
  // Member details
  memberDetails: PersonAvailabilityResult[];
};

// Upcoming return info
export type UpcomingReturn = {
  personId: string;
  personName?: string;
  expectedReturnDate: Date;
  reason?: AvailabilityReason;
};

/**
 * Derive team availability summary
 * 
 * @param teamId - Team identifier
 * @param members - Team members with availability data
 * @param options - Optional configuration
 * @returns Team availability summary
 */
export function deriveTeamAvailability(
  teamId: string,
  members: TeamMemberInput[],
  options?: {
    teamName?: string;
    at?: Date;
    riskThreshold?: number; // Default 0.5 (50%)
    criticalThreshold?: number; // Default 0.75 (75%)
  }
): TeamAvailabilitySummary {
  const at = options?.at ?? new Date();
  const riskThreshold = options?.riskThreshold ?? 0.5;
  const criticalThreshold = options?.criticalThreshold ?? 0.75;

  const memberDetails: PersonAvailabilityResult[] = [];
  const absencesByReason: Record<AvailabilityReason, number> = {
    VACATION: 0,
    SICK_LEAVE: 0,
    PARENTAL_LEAVE: 0,
    SABBATICAL: 0,
    JURY_DUTY: 0,
    BEREAVEMENT: 0,
    TRAINING: 0,
    OTHER: 0,
  };
  const upcomingReturns: UpcomingReturn[] = [];

  let availableCount = 0;
  let partialCount = 0;
  let unavailableCount = 0;
  let totalEffectiveCapacity = 0;

  for (const member of members) {
    const result = derivePersonAvailability(
      {
        personId: member.personId,
        employmentStatus: member.employmentStatus,
        windows: member.windows,
      },
      at
    );

    memberDetails.push(result);

    // Count by status
    switch (result.availability.status) {
      case "available":
        availableCount++;
        break;
      case "partial":
        partialCount++;
        break;
      case "unavailable":
        unavailableCount++;
        break;
    }

    // Accumulate effective capacity
    totalEffectiveCapacity += result.effectiveCapacity;

    // Track absence reasons
    if (result.availability.reason) {
      absencesByReason[result.availability.reason]++;
    }

    // Track upcoming returns
    if (
      result.availability.status !== "available" &&
      result.availability.expectedReturnDate
    ) {
      upcomingReturns.push({
        personId: member.personId,
        personName: member.personName,
        expectedReturnDate: result.availability.expectedReturnDate,
        reason: result.availability.reason,
      });
    }
  }

  const totalMembers = members.length;
  const availablePercent = totalMembers > 0 ? (availableCount / totalMembers) * 100 : 0;
  const unavailablePercent = totalMembers > 0 ? (unavailableCount / totalMembers) * 100 : 0;
  const avgEffectiveCapacity = totalMembers > 0 ? totalEffectiveCapacity / totalMembers : 0;

  // Risk assessment
  const isAtRisk = unavailablePercent / 100 >= riskThreshold;
  const isCritical = unavailablePercent / 100 >= criticalThreshold;

  // Sort upcoming returns by date
  upcomingReturns.sort((a, b) => a.expectedReturnDate.getTime() - b.expectedReturnDate.getTime());

  return {
    teamId,
    teamName: options?.teamName,
    totalMembers,
    availableCount,
    partialCount,
    unavailableCount,
    availablePercent: Math.round(availablePercent),
    unavailablePercent: Math.round(unavailablePercent),
    totalEffectiveCapacity,
    avgEffectiveCapacity,
    isAtRisk,
    isCritical,
    absencesByReason,
    upcomingReturns,
    memberDetails,
  };
}

// Department-level rollup
export type DepartmentAvailabilitySummary = {
  departmentId: string;
  departmentName?: string;
  
  // Aggregated counts
  totalMembers: number;
  availableCount: number;
  unavailableCount: number;
  availablePercent: number;
  
  // Team breakdown
  teamSummaries: TeamAvailabilitySummary[];
  teamsAtRisk: number;
  teamsCritical: number;
  
  // Overall capacity
  totalEffectiveCapacity: number;
  avgEffectiveCapacity: number;
};

/**
 * Derive department availability by aggregating team summaries
 */
export function deriveDepartmentAvailability(
  departmentId: string,
  teamSummaries: TeamAvailabilitySummary[],
  options?: { departmentName?: string }
): DepartmentAvailabilitySummary {
  let totalMembers = 0;
  let availableCount = 0;
  let unavailableCount = 0;
  let totalEffectiveCapacity = 0;
  let teamsAtRisk = 0;
  let teamsCritical = 0;

  for (const team of teamSummaries) {
    totalMembers += team.totalMembers;
    availableCount += team.availableCount;
    unavailableCount += team.unavailableCount;
    totalEffectiveCapacity += team.totalEffectiveCapacity;

    if (team.isCritical) {
      teamsCritical++;
    } else if (team.isAtRisk) {
      teamsAtRisk++;
    }
  }

  const availablePercent = totalMembers > 0 ? (availableCount / totalMembers) * 100 : 0;
  const avgEffectiveCapacity = totalMembers > 0 ? totalEffectiveCapacity / totalMembers : 0;

  return {
    departmentId,
    departmentName: options?.departmentName,
    totalMembers,
    availableCount,
    unavailableCount,
    availablePercent: Math.round(availablePercent),
    teamSummaries,
    teamsAtRisk,
    teamsCritical,
    totalEffectiveCapacity,
    avgEffectiveCapacity,
  };
}

/**
 * Format team availability for display
 */
export function formatTeamAvailability(summary: TeamAvailabilitySummary): string {
  if (summary.isCritical) {
    return `Critical: ${summary.unavailablePercent}% unavailable`;
  }
  if (summary.isAtRisk) {
    return `At Risk: ${summary.unavailablePercent}% unavailable`;
  }
  return `${summary.availablePercent}% available`;
}

/**
 * Get absence breakdown as readable summary
 */
export function formatAbsenceBreakdown(
  absences: Record<AvailabilityReason, number>
): string[] {
  const lines: string[] = [];
  for (const [reason, count] of Object.entries(absences)) {
    if (count > 0) {
      lines.push(`${formatReason(reason as AvailabilityReason)}: ${count}`);
    }
  }
  return lines;
}

/**
 * Check if any team in a list is at risk
 */
export function hasTeamsAtRisk(summaries: TeamAvailabilitySummary[]): boolean {
  return summaries.some((s) => s.isAtRisk || s.isCritical);
}

/**
 * Get teams sorted by risk level
 */
export function sortTeamsByRisk(
  summaries: TeamAvailabilitySummary[]
): TeamAvailabilitySummary[] {
  return [...summaries].sort((a, b) => {
    // Critical first, then at-risk, then by unavailable percent
    if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
    if (a.isAtRisk !== b.isAtRisk) return a.isAtRisk ? -1 : 1;
    return b.unavailablePercent - a.unavailablePercent;
  });
}

