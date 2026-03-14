/**
 * Effective Capacity Resolver
 * 
 * Phase G: Core resolver that computes real capacity at any point in time.
 * 
 * Formula:
 * effectiveAvailableHours = contractedHours × availabilityFactor − allocatedHours
 * 
 * Time Window Semantics:
 * - contractedHours = weeklyCapacityHours × (windowLengthDays / 7)
 * - availabilityFactor = minimum factor during window (conservative)
 * - allocatedHours = sum of allocations clipped to window boundaries
 * 
 * Confidence is always explained (not just numbers).
 */

import { getAvailabilityEvents, computeMinAvailabilityInWindow, type AvailabilityEvent } from "@/lib/org/availability";
import { getCapacityContracts, resolveContractForWindow, getContractedHoursForWindow, DEFAULT_WEEKLY_CAPACITY_HOURS, type CapacityContract } from "@/lib/org/capacity";
import { getWorkAllocations, computeTotalAllocatedHoursForWindow, computeAllocationSummaryForWindow, type WorkAllocation } from "@/lib/org/allocations";

// ============================================================================
// Types
// ============================================================================

export type EffectiveCapacity = {
  personId: string;
  timeWindow: { start: Date; end: Date };
  /** Weekly capacity from contract (or default 40h) */
  weeklyCapacityHours: number;
  /** contractedHours = weeklyCapacityHours × (windowDays / 7) */
  contractedHoursForWindow: number;
  /** @deprecated Use contractedHoursForWindow instead */
  contractedHours: number;
  availabilityFactor: number; // 0-1
  allocatedHours: number;
  effectiveAvailableHours: number;
  confidence: CapacityConfidence;
  explanation: string[]; // REQUIRED: human-readable breakdown
};

export type CapacityConfidence = {
  score: number; // 0-1
  factors: {
    completeness: number; // contract exists?
    consistency: number; // no overlapping conflicts?
    freshness: number; // data staleness
  };
  explanation: string[]; // REQUIRED: why confidence is low
};

export type EffectiveCapacityInput = {
  availabilityEvents: AvailabilityEvent[];
  capacityContracts: CapacityContract[];
  workAllocations: WorkAllocation[];
};

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve effective capacity for a person in a time window
 * 
 * This is the CORE resolver that combines:
 * - Capacity contracts (base hours)
 * - Availability events (reduction factor)
 * - Work allocations (committed hours)
 * 
 * @param workspaceId - Workspace ID
 * @param personId - User ID (person in org context)
 * @param timeWindow - Time window to compute capacity for
 */
export async function resolveEffectiveCapacity(
  workspaceId: string,
  personId: string,
  timeWindow: { start: Date; end: Date }
): Promise<EffectiveCapacity> {
  // Fetch all required data in parallel
  const [availabilityEvents, capacityContracts, workAllocations] = await Promise.all([
    getAvailabilityEvents(workspaceId, personId, timeWindow),
    getCapacityContracts(workspaceId, personId),
    getWorkAllocations(workspaceId, personId, timeWindow),
  ]);

  return computeEffectiveCapacity(
    personId,
    timeWindow,
    {
      availabilityEvents,
      capacityContracts,
      workAllocations,
    }
  );
}

/**
 * Compute effective capacity from pre-fetched data
 * 
 * Pure function - no database calls, deterministic.
 */
export function computeEffectiveCapacity(
  personId: string,
  timeWindow: { start: Date; end: Date },
  input: EffectiveCapacityInput
): EffectiveCapacity {
  const explanation: string[] = [];
  const confidenceExplanation: string[] = [];
  let completenessScore = 1.0;
  let consistencyScore = 1.0;
  const freshnessScore = 1.0; // TODO [P1]: Implement staleness check based on contract effectiveFrom/lastUpdated

  // Step 1: Resolve capacity contract
  const contractResolution = resolveContractForWindow(input.capacityContracts, timeWindow);
  const contractedHoursResult = getContractedHoursForWindow(contractResolution, timeWindow);
  const weeklyHours = contractResolution.contract?.weeklyCapacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS;

  if (contractResolution.hasConflict) {
    explanation.push(`Contract conflict: ${contractResolution.conflictingContracts.length} overlapping contracts`);
    confidenceExplanation.push("Confidence is low because multiple capacity contracts overlap.");
    consistencyScore = 0.3;
  } else if (contractResolution.isDefault) {
    explanation.push(`Using default capacity: ${DEFAULT_WEEKLY_CAPACITY_HOURS}h/week`);
    confidenceExplanation.push("No capacity contract defined. Using default 40h/week assumption.");
    completenessScore = 0.5;
  } else {
    explanation.push(contractedHoursResult.explanation);
  }

  // Step 2: Compute availability factor
  const availabilityResult = computeMinAvailabilityInWindow(
    input.availabilityEvents,
    timeWindow
  );
  const availabilityFactor = availabilityResult.factor;

  if (availabilityFactor < 1) {
    explanation.push(availabilityResult.explanation);
  }

  // Step 3: Compute allocated hours
  const allocationResult = computeTotalAllocatedHoursForWindow(
    input.workAllocations,
    weeklyHours,
    timeWindow
  );
  const allocatedHours = allocationResult.totalHours;

  const allocationSummary = computeAllocationSummaryForWindow(
    input.workAllocations,
    timeWindow
  );

  if (allocatedHours > 0) {
    explanation.push(
      `${allocatedHours.toFixed(1)}h allocated across ${allocationResult.allocationBreakdown.length} commitments`
    );
  }

  if (allocationSummary.isOverallocated) {
    explanation.push(`Warning: Overallocated (${Math.round(allocationSummary.totalAllocationPercent * 100)}%)`);
    confidenceExplanation.push("Person is overallocated (>100% capacity committed).");
  }

  // Step 4: Calculate effective capacity
  // Formula: effectiveAvailableHours = contractedHours × availabilityFactor − allocatedHours
  const contractedHours = contractedHoursResult.hours;
  const availableAfterReduction = contractedHours * availabilityFactor;
  const effectiveAvailableHours = Math.max(0, availableAfterReduction - allocatedHours);

  // Add summary
  explanation.push(
    `Effective: ${effectiveAvailableHours.toFixed(1)}h available (${contractedHours.toFixed(1)}h × ${Math.round(availabilityFactor * 100)}% − ${allocatedHours.toFixed(1)}h)`
  );

  // Step 5: Compute confidence score
  const confidenceScore = (completenessScore + consistencyScore + freshnessScore) / 3;

  if (confidenceExplanation.length === 0) {
    confidenceExplanation.push("All capacity data is complete and consistent.");
  }

  return {
    personId,
    timeWindow,
    weeklyCapacityHours: weeklyHours,
    contractedHoursForWindow: contractedHours,
    contractedHours, // Deprecated alias
    availabilityFactor,
    allocatedHours,
    effectiveAvailableHours,
    confidence: {
      score: confidenceScore,
      factors: {
        completeness: completenessScore,
        consistency: consistencyScore,
        freshness: freshnessScore,
      },
      explanation: confidenceExplanation,
    },
    explanation,
  };
}

// ============================================================================
// Batch Resolver
// ============================================================================

/**
 * Resolve effective capacity for multiple people
 * 
 * Optimized batch query to avoid N+1 queries.
 */
export async function resolveEffectiveCapacityBatch(
  workspaceId: string,
  personIds: string[],
  timeWindow: { start: Date; end: Date }
): Promise<Map<string, EffectiveCapacity>> {
  if (personIds.length === 0) return new Map();

  // Import batch query functions
  const { getAvailabilityEventsBatch } = await import("@/lib/org/availability");
  const { getCapacityContractsBatch } = await import("@/lib/org/capacity");
  const { getWorkAllocationsBatch } = await import("@/lib/org/allocations");

  // Fetch all data in parallel
  const [availabilityByPerson, contractsByPerson, allocationsByPerson] = await Promise.all([
    getAvailabilityEventsBatch(workspaceId, personIds, timeWindow),
    getCapacityContractsBatch(workspaceId, personIds),
    getWorkAllocationsBatch(workspaceId, personIds, timeWindow),
  ]);

  // Compute for each person
  const result = new Map<string, EffectiveCapacity>();

  for (const personId of personIds) {
    const capacity = computeEffectiveCapacity(
      personId,
      timeWindow,
      {
        availabilityEvents: availabilityByPerson.get(personId) ?? [],
        capacityContracts: contractsByPerson.get(personId) ?? [],
        workAllocations: allocationsByPerson.get(personId) ?? [],
      }
    );
    result.set(personId, capacity);
  }

  return result;
}

// ============================================================================
// V2: Task-Based Capacity Resolver
// ============================================================================

/**
 * Extended input for V2 capacity computation.
 * Adds task-based commitment and time-off hours to the existing allocation model.
 */
export type EffectiveCapacityV2Input = EffectiveCapacityInput & {
  /** Task-based committed hours (from getPersonTaskCommitmentHours) */
  taskCommittedHours: number | null;
  /** Whether any tasks had explicit estimates (hours or points, not just priority defaults) */
  hasExplicitTaskEstimates: boolean;
  /** Meeting hours from calendar (Phase 2 — default 0) */
  meetingHours: number;
  /** Time-off hours from PersonAvailability (already included in availabilityFactor, but tracked separately for snapshots) */
  timeOffHours: number;
};

/**
 * Extended result for V2 capacity computation.
 */
export type EffectiveCapacityV2 = EffectiveCapacity & {
  /** Source of commitment: "tasks" if task data was used, "allocations" if fallback to WorkAllocation */
  commitmentSource: "tasks" | "allocations";
  /** Task-based committed hours (null if using allocation model) */
  taskCommittedHours: number | null;
  /** Meeting hours consumed (Phase 2) */
  meetingHours: number;
  /** Time-off hours consumed */
  timeOffHours: number;
};

/**
 * Compute effective capacity using the V2 model.
 *
 * Pure function — no database calls, deterministic.
 *
 * Key difference from V1:
 * - Commitment source priority: if taskCommittedHours is available (not null),
 *   use task-based sum as the numerator. Otherwise fall back to WorkAllocation percentages.
 * - meetingHours reduces effective available hours (Phase 2 will wire calendar data)
 * - timeOffHours tracked separately for snapshot storage
 *
 * Formula:
 *   effectiveAvailableHours = contractedHours - meetingHours - timeOffHours
 *   (where timeOffHours is already captured via availabilityFactor in the base formula,
 *    but meetingHours is a new deduction)
 *   committedHours = taskCommittedHours ?? allocation-derived hours
 *   utilization = committedHours / effectiveAvailableHours
 */
export function computeEffectiveCapacityV2(
  personId: string,
  timeWindow: { start: Date; end: Date },
  input: EffectiveCapacityV2Input
): EffectiveCapacityV2 {
  // Start with V1 computation for base values
  const baseResult = computeEffectiveCapacity(personId, timeWindow, input);

  const meetingHours = input.meetingHours;
  const timeOffHours = input.timeOffHours;

  // Determine commitment source and hours
  const useTaskBased = input.taskCommittedHours != null && input.taskCommittedHours > 0;
  const commitmentSource = useTaskBased ? "tasks" as const : "allocations" as const;
  const committedHours = useTaskBased
    ? input.taskCommittedHours!
    : baseResult.allocatedHours;

  // Recompute effective available hours with meeting deduction
  // Base formula already applies availabilityFactor (which includes time off).
  // Meeting hours are an additional deduction on top.
  const contractedHours = baseResult.contractedHoursForWindow;
  const availableAfterReductions = Math.max(
    0,
    contractedHours * baseResult.availabilityFactor - meetingHours
  );

  // Effective available = available after reductions minus committed work
  const effectiveAvailableHours = Math.max(0, availableAfterReductions - committedHours);

  // Build extended explanation
  const explanation = [...baseResult.explanation];
  if (meetingHours > 0) {
    explanation.push(`${meetingHours.toFixed(1)}h in meetings`);
  }
  if (useTaskBased) {
    explanation.push(
      `${committedHours.toFixed(1)}h committed via tasks (${input.hasExplicitTaskEstimates ? "explicit estimates" : "priority defaults"})`
    );
  }
  // Replace the last summary line
  explanation.push(
    `V2 Effective: ${effectiveAvailableHours.toFixed(1)}h available ` +
    `(${contractedHours.toFixed(1)}h × ${Math.round(baseResult.availabilityFactor * 100)}% ` +
    `− ${meetingHours.toFixed(1)}h meetings − ${committedHours.toFixed(1)}h committed)`
  );

  return {
    ...baseResult,
    allocatedHours: committedHours, // Override with task-based if available
    effectiveAvailableHours,
    explanation,
    commitmentSource,
    taskCommittedHours: useTaskBased ? input.taskCommittedHours : null,
    meetingHours,
    timeOffHours,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a person has meaningful available capacity
 */
export function hasAvailableCapacity(
  capacity: EffectiveCapacity,
  minimumHours: number = 8
): boolean {
  return capacity.effectiveAvailableHours >= minimumHours;
}

/**
 * Get capacity status label
 */
export function getCapacityStatusLabel(capacity: EffectiveCapacity): string {
  if (capacity.availabilityFactor === 0) {
    return "Unavailable";
  }
  if (capacity.effectiveAvailableHours <= 0) {
    return "Fully committed";
  }
  if (capacity.effectiveAvailableHours < 8) {
    return "Limited capacity";
  }
  return "Available";
}
