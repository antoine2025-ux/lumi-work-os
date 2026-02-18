/**
 * Work Allocation Read Functions
 * 
 * Phase G: Query and compute work allocations.
 * 
 * Key Invariant: allocationPercent is relative to CONTRACTED capacity, not raw hours.
 * Formula: allocatedHours = weeklyCapacityHours × allocationPercent
 * 
 * Stacking rule: Allocations are additive.
 * Over-allocation (sum > 1.0) is allowed but flagged as OVERALLOCATED_PERSON.
 */

import { prisma } from "@/lib/db";
import type { AllocationContextType, AllocationSource } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

export type WorkAllocation = {
  id: string;
  personId: string;
  allocationPercent: number; // 0-1 (relative to contracted capacity)
  contextType: AllocationContextType;
  contextId: string | null;
  contextLabel: string | null;
  startDate: Date;
  endDate: Date | null;
  source: AllocationSource;
  createdById: string | null;
  createdAt: Date;
};

export type AllocationSummary = {
  totalAllocationPercent: number; // Sum of all active allocations (can exceed 1.0)
  isOverallocated: boolean;
  activeAllocations: WorkAllocation[];
  explanation: string;
};

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all work allocations for a person
 */
export async function getWorkAllocations(
  workspaceId: string,
  personId: string,
  timeWindow?: { start: Date; end: Date }
): Promise<WorkAllocation[]> {
  const where: any = {
    workspaceId,
    personId,
  };

  // Filter by time window if provided
  if (timeWindow) {
    where.OR = [
      // Allocations that start within the window
      {
        startDate: {
          gte: timeWindow.start,
          lte: timeWindow.end,
        },
      },
      // Allocations that end within the window
      {
        endDate: {
          gte: timeWindow.start,
          lte: timeWindow.end,
        },
      },
      // Allocations that span the entire window
      {
        startDate: { lte: timeWindow.start },
        OR: [
          { endDate: { gte: timeWindow.end } },
          { endDate: null },
        ],
      },
    ];
  }

  const allocations = await prisma.workAllocation.findMany({
    where,
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      personId: true,
      allocationPercent: true,
      contextType: true,
      contextId: true,
      contextLabel: true,
      startDate: true,
      endDate: true,
      source: true,
      createdById: true,
      createdAt: true,
    },
  });

  return allocations;
}

/**
 * Get work allocations for multiple people (batch query)
 */
export async function getWorkAllocationsBatch(
  workspaceId: string,
  personIds: string[],
  timeWindow?: { start: Date; end: Date }
): Promise<Map<string, WorkAllocation[]>> {
  if (personIds.length === 0) return new Map();

  const where: any = {
    workspaceId,
    personId: { in: personIds },
  };

  if (timeWindow) {
    where.OR = [
      { startDate: { gte: timeWindow.start, lte: timeWindow.end } },
      { endDate: { gte: timeWindow.start, lte: timeWindow.end } },
      {
        startDate: { lte: timeWindow.start },
        OR: [
          { endDate: { gte: timeWindow.end } },
          { endDate: null },
        ],
      },
    ];
  }

  const allocations = await prisma.workAllocation.findMany({
    where,
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      personId: true,
      allocationPercent: true,
      contextType: true,
      contextId: true,
      contextLabel: true,
      startDate: true,
      endDate: true,
      source: true,
      createdById: true,
      createdAt: true,
    },
  });

  // Group by personId
  const result = new Map<string, WorkAllocation[]>();
  for (const personId of personIds) {
    result.set(personId, []);
  }
  for (const allocation of allocations) {
    const list = result.get(allocation.personId);
    if (list) {
      list.push(allocation);
    }
  }

  return result;
}

// ============================================================================
// Computation Functions
// ============================================================================

/**
 * Compute allocation summary at a specific point in time
 * 
 * @param allocations - All allocations for a person
 * @param atTime - Point in time to compute (defaults to now)
 */
export function computeAllocationSummary(
  allocations: WorkAllocation[],
  atTime: Date = new Date()
): AllocationSummary {
  // Filter to active allocations at the given time
  const activeAllocations = allocations.filter((a) => {
    const startOk = a.startDate <= atTime;
    const endOk = a.endDate === null || a.endDate >= atTime;
    return startOk && endOk;
  });

  // Sum all allocation percentages (can exceed 1.0)
  const totalAllocationPercent = activeAllocations.reduce(
    (sum, a) => sum + a.allocationPercent,
    0
  );

  const isOverallocated = totalAllocationPercent > 1.0;

  // Build explanation
  let explanation: string;
  if (activeAllocations.length === 0) {
    explanation = "No active work allocations";
  } else if (isOverallocated) {
    explanation = `Overallocated: ${Math.round(totalAllocationPercent * 100)}% of capacity committed across ${activeAllocations.length} allocations`;
  } else {
    explanation = `${Math.round(totalAllocationPercent * 100)}% of capacity committed across ${activeAllocations.length} allocations`;
  }

  return {
    totalAllocationPercent,
    isOverallocated,
    activeAllocations,
    explanation,
  };
}

/**
 * Compute allocation summary for a time window
 * 
 * Phase G: Uses allocations active at any point during the window.
 * Hours are clipped to the window boundaries.
 */
export function computeAllocationSummaryForWindow(
  allocations: WorkAllocation[],
  timeWindow: { start: Date; end: Date }
): AllocationSummary {
  // Filter to allocations that overlap with the window
  const overlappingAllocations = allocations.filter((a) => {
    const allocEnd = a.endDate ?? new Date(8640000000000000);
    return a.startDate <= timeWindow.end && allocEnd >= timeWindow.start;
  });

  // Sum all allocation percentages
  const totalAllocationPercent = overlappingAllocations.reduce(
    (sum, a) => sum + a.allocationPercent,
    0
  );

  const isOverallocated = totalAllocationPercent > 1.0;

  let explanation: string;
  if (overlappingAllocations.length === 0) {
    explanation = "No work allocations in window";
  } else if (isOverallocated) {
    explanation = `Overallocated: ${Math.round(totalAllocationPercent * 100)}% of capacity committed`;
  } else {
    explanation = `${Math.round(totalAllocationPercent * 100)}% of capacity committed`;
  }

  return {
    totalAllocationPercent,
    isOverallocated,
    activeAllocations: overlappingAllocations,
    explanation,
  };
}

/**
 * Convert allocation percent to hours for a time window
 * 
 * Formula: allocatedHours = weeklyCapacityHours × allocationPercent × (windowDays / 7)
 * 
 * Note: This clips allocation to the window boundaries.
 */
export function computeAllocatedHoursForWindow(
  allocation: WorkAllocation,
  weeklyCapacityHours: number,
  timeWindow: { start: Date; end: Date }
): { hours: number; overlapDays: number } {
  const allocStart = allocation.startDate;
  const allocEnd = allocation.endDate ?? new Date(8640000000000000);

  // Calculate overlap with window
  const overlapStart = new Date(Math.max(allocStart.getTime(), timeWindow.start.getTime()));
  const overlapEnd = new Date(Math.min(allocEnd.getTime(), timeWindow.end.getTime()));

  if (overlapStart >= overlapEnd) {
    return { hours: 0, overlapDays: 0 };
  }

  const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
  const overlapDays = overlapMs / (1000 * 60 * 60 * 24);
  const overlapWeeks = overlapDays / 7;

  // Hours = weekly hours × allocation % × weeks in overlap
  const hours = weeklyCapacityHours * allocation.allocationPercent * overlapWeeks;

  return { hours, overlapDays };
}

/**
 * Compute total allocated hours for a time window
 */
export function computeTotalAllocatedHoursForWindow(
  allocations: WorkAllocation[],
  weeklyCapacityHours: number,
  timeWindow: { start: Date; end: Date }
): { totalHours: number; allocationBreakdown: { allocation: WorkAllocation; hours: number }[] } {
  const breakdown = allocations.map((allocation) => {
    const { hours } = computeAllocatedHoursForWindow(allocation, weeklyCapacityHours, timeWindow);
    return { allocation, hours };
  }).filter((b) => b.hours > 0);

  const totalHours = breakdown.reduce((sum, b) => sum + b.hours, 0);

  return { totalHours, allocationBreakdown: breakdown };
}

/**
 * Batch compute allocation summaries for multiple people
 */
export function computeAllocationSummaryBatch(
  allocationsByPerson: Map<string, WorkAllocation[]>,
  atTime: Date = new Date()
): Map<string, AllocationSummary> {
  const result = new Map<string, AllocationSummary>();

  for (const [personId, allocations] of allocationsByPerson) {
    result.set(personId, computeAllocationSummary(allocations, atTime));
  }

  return result;
}
