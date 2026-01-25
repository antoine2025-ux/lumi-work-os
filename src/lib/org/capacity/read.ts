/**
 * Capacity Contract Read Functions
 * 
 * Phase G: Query and resolve capacity contracts with conflict detection.
 * 
 * Invariant: Only ONE active contract per person per date
 * If multiple contracts overlap → CAPACITY_CONTRACT_CONFLICT (do NOT silently pick one)
 */

import { prisma } from "@/lib/db";

// ============================================================================
// Types
// ============================================================================

export type CapacityContract = {
  id: string;
  personId: string;
  weeklyCapacityHours: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdById: string | null;
  createdAt: Date;
};

export type ContractResolution = {
  contract: CapacityContract | null;
  hasConflict: boolean;
  conflictingContracts: CapacityContract[];
  isDefault: boolean;
  explanation: string;
};

// Default capacity when no contract exists
export const DEFAULT_WEEKLY_CAPACITY_HOURS = 40;

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all capacity contracts for a person
 */
export async function getCapacityContracts(
  workspaceId: string,
  personId: string
): Promise<CapacityContract[]> {
  const contracts = await prisma.capacityContract.findMany({
    where: {
      workspaceId,
      personId,
    },
    orderBy: { effectiveFrom: "desc" },
    select: {
      id: true,
      personId: true,
      weeklyCapacityHours: true,
      effectiveFrom: true,
      effectiveTo: true,
      createdById: true,
      createdAt: true,
    },
  });

  return contracts;
}

/**
 * Get capacity contracts for multiple people (batch query)
 */
export async function getCapacityContractsBatch(
  workspaceId: string,
  personIds: string[]
): Promise<Map<string, CapacityContract[]>> {
  if (personIds.length === 0) return new Map();

  const contracts = await prisma.capacityContract.findMany({
    where: {
      workspaceId,
      personId: { in: personIds },
    },
    orderBy: { effectiveFrom: "desc" },
    select: {
      id: true,
      personId: true,
      weeklyCapacityHours: true,
      effectiveFrom: true,
      effectiveTo: true,
      createdById: true,
      createdAt: true,
    },
  });

  // Group by personId
  const result = new Map<string, CapacityContract[]>();
  for (const personId of personIds) {
    result.set(personId, []);
  }
  for (const contract of contracts) {
    const list = result.get(contract.personId);
    if (list) {
      list.push(contract);
    }
  }

  return result;
}

// ============================================================================
// Resolution Functions
// ============================================================================

/**
 * Resolve the active capacity contract for a person at a specific date
 * 
 * CRITICAL: Does NOT silently pick a contract if multiple are active.
 * Returns hasConflict: true instead, allowing issue derivation.
 * 
 * @param contracts - All contracts for the person
 * @param atDate - Date to check (defaults to now)
 */
export function resolveActiveContract(
  contracts: CapacityContract[],
  atDate: Date = new Date()
): ContractResolution {
  // Filter to contracts active at the given date
  const activeContracts = contracts.filter((c) => {
    const startOk = c.effectiveFrom <= atDate;
    const endOk = c.effectiveTo === null || c.effectiveTo >= atDate;
    return startOk && endOk;
  });

  // No active contracts → use default
  if (activeContracts.length === 0) {
    return {
      contract: null,
      hasConflict: false,
      conflictingContracts: [],
      isDefault: true,
      explanation: `No capacity contract defined. Using default ${DEFAULT_WEEKLY_CAPACITY_HOURS}h/week.`,
    };
  }

  // Exactly one active contract → success
  if (activeContracts.length === 1) {
    const contract = activeContracts[0];
    return {
      contract,
      hasConflict: false,
      conflictingContracts: [],
      isDefault: false,
      explanation: `Capacity contract: ${contract.weeklyCapacityHours}h/week (effective from ${formatDate(contract.effectiveFrom)})`,
    };
  }

  // Multiple active contracts → CONFLICT (do NOT silently pick one)
  return {
    contract: null, // No resolution when conflicting
    hasConflict: true,
    conflictingContracts: activeContracts,
    isDefault: false,
    explanation: `Capacity contract conflict: ${activeContracts.length} overlapping contracts found. Manual resolution required.`,
  };
}

/**
 * Resolve active contract for a time window
 * 
 * For Phase G, we use the contract active at the START of the window.
 * Future phases may support weighted averages for windows spanning contract changes.
 */
export function resolveContractForWindow(
  contracts: CapacityContract[],
  timeWindow: { start: Date; end: Date }
): ContractResolution {
  // Use contract active at window start
  return resolveActiveContract(contracts, timeWindow.start);
}

/**
 * Get contracted hours for a time window
 * 
 * Formula: weeklyCapacityHours × (windowLengthDays / 7)
 */
export function getContractedHoursForWindow(
  resolution: ContractResolution,
  timeWindow: { start: Date; end: Date }
): { hours: number; isDefault: boolean; explanation: string } {
  const windowLengthMs = timeWindow.end.getTime() - timeWindow.start.getTime();
  const windowLengthDays = windowLengthMs / (1000 * 60 * 60 * 24);
  const windowLengthWeeks = windowLengthDays / 7;

  const weeklyHours = resolution.contract?.weeklyCapacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS;
  const hours = weeklyHours * windowLengthWeeks;

  return {
    hours,
    isDefault: resolution.isDefault,
    explanation: resolution.hasConflict
      ? `Capacity unknown due to contract conflict`
      : `${weeklyHours}h/week × ${windowLengthDays.toFixed(1)} days = ${hours.toFixed(1)} hours`,
  };
}

/**
 * Batch resolve contracts for multiple people
 */
export function resolveActiveContractBatch(
  contractsByPerson: Map<string, CapacityContract[]>,
  atDate: Date = new Date()
): Map<string, ContractResolution> {
  const result = new Map<string, ContractResolution>();

  for (const [personId, contracts] of contractsByPerson) {
    result.set(personId, resolveActiveContract(contracts, atDate));
  }

  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Check if contracts have any overlaps (for validation)
 */
export function detectContractOverlaps(
  contracts: CapacityContract[]
): { hasOverlaps: boolean; overlappingPairs: [CapacityContract, CapacityContract][] } {
  const overlappingPairs: [CapacityContract, CapacityContract][] = [];

  for (let i = 0; i < contracts.length; i++) {
    for (let j = i + 1; j < contracts.length; j++) {
      const a = contracts[i];
      const b = contracts[j];

      const aEnd = a.effectiveTo ?? new Date(8640000000000000);
      const bEnd = b.effectiveTo ?? new Date(8640000000000000);

      // Contracts overlap if neither ends before the other starts
      const overlaps = a.effectiveFrom <= bEnd && aEnd >= b.effectiveFrom;
      if (overlaps) {
        overlappingPairs.push([a, b]);
      }
    }
  }

  return {
    hasOverlaps: overlappingPairs.length > 0,
    overlappingPairs,
  };
}
