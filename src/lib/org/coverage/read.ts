/**
 * Role Coverage Read Functions
 * 
 * Phase G6: Query and resolve role coverage for backup personnel.
 * 
 * Enables "who can cover if X is unavailable?" queries.
 * Minimal model - not a full skills engine.
 */

import { prisma } from "@/lib/db";
import type { EffectiveCapacity } from "@/lib/org/capacity/resolveEffectiveCapacity";

// ============================================================================
// Types
// ============================================================================

export type RoleCoverage = {
  id: string;
  workspaceId: string;
  roleType: string;
  roleLabel: string | null;
  primaryPersonId: string;
  secondaryPersonIds: string[];
  createdAt: Date;
};

export type CoverageResolution = {
  roleType: string;
  roleLabel: string | null;
  primaryPersonId: string;
  primaryAvailable: boolean;
  availableCover: string | null; // First available secondary
  allSecondaries: {
    personId: string;
    isAvailable: boolean;
    hasCapacity: boolean;
  }[];
  explanation: string;
};

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all role coverages for a workspace
 */
export async function getRoleCoverages(
  workspaceId: string
): Promise<RoleCoverage[]> {
  const coverages = await prisma.roleCoverage.findMany({
    where: { workspaceId },
    orderBy: { roleType: "asc" },
    select: {
      id: true,
      workspaceId: true,
      roleType: true,
      roleLabel: true,
      primaryPersonId: true,
      secondaryPersonIds: true,
      createdAt: true,
    },
  });

  return coverages;
}

/**
 * Get role coverage for a specific primary person
 */
export async function getRoleCoverageForPerson(
  workspaceId: string,
  personId: string
): Promise<RoleCoverage[]> {
  const coverages = await prisma.roleCoverage.findMany({
    where: {
      workspaceId,
      primaryPersonId: personId,
    },
    select: {
      id: true,
      workspaceId: true,
      roleType: true,
      roleLabel: true,
      primaryPersonId: true,
      secondaryPersonIds: true,
      createdAt: true,
    },
  });

  return coverages;
}

/**
 * Get all role coverages where a person is secondary
 */
export async function getRoleCoveragesAsSecondary(
  workspaceId: string,
  personId: string
): Promise<RoleCoverage[]> {
  const coverages = await prisma.roleCoverage.findMany({
    where: {
      workspaceId,
      secondaryPersonIds: { has: personId },
    },
    select: {
      id: true,
      workspaceId: true,
      roleType: true,
      roleLabel: true,
      primaryPersonId: true,
      secondaryPersonIds: true,
      createdAt: true,
    },
  });

  return coverages;
}

// ============================================================================
// Resolution Functions
// ============================================================================

/**
 * Resolve coverage for a role - who can cover if primary is unavailable?
 * 
 * @param coverage - The role coverage definition
 * @param capacities - Map of personId → EffectiveCapacity
 * @param minimumCapacityHours - Minimum hours to be considered "available"
 */
export function resolveCoverage(
  coverage: RoleCoverage,
  capacities: Map<string, EffectiveCapacity>,
  minimumCapacityHours: number = 8
): CoverageResolution {
  const primaryCapacity = capacities.get(coverage.primaryPersonId);
  const primaryAvailable = primaryCapacity
    ? primaryCapacity.availabilityFactor > 0 && primaryCapacity.effectiveAvailableHours >= minimumCapacityHours
    : true; // Assume available if no capacity data

  // Check each secondary in order
  const allSecondaries: CoverageResolution["allSecondaries"] = [];
  let availableCover: string | null = null;

  for (const secondaryId of coverage.secondaryPersonIds) {
    const capacity = capacities.get(secondaryId);
    const isAvailable = capacity ? capacity.availabilityFactor > 0 : true;
    const hasCapacity = capacity ? capacity.effectiveAvailableHours >= minimumCapacityHours : true;

    allSecondaries.push({
      personId: secondaryId,
      isAvailable,
      hasCapacity,
    });

    // First available secondary with capacity is the cover
    if (!availableCover && isAvailable && hasCapacity) {
      availableCover = secondaryId;
    }
  }

  // Build explanation
  let explanation: string;
  if (primaryAvailable) {
    explanation = "Primary is available.";
  } else if (availableCover) {
    explanation = `Primary unavailable. Coverage available from secondary.`;
  } else if (coverage.secondaryPersonIds.length === 0) {
    explanation = "Primary unavailable. No backup personnel defined.";
  } else {
    explanation = "Primary unavailable. No secondary personnel currently available.";
  }

  return {
    roleType: coverage.roleType,
    roleLabel: coverage.roleLabel,
    primaryPersonId: coverage.primaryPersonId,
    primaryAvailable,
    availableCover,
    allSecondaries,
    explanation,
  };
}

/**
 * Batch resolve coverage for all roles in a workspace
 */
export function resolveCoverageBatch(
  coverages: RoleCoverage[],
  capacities: Map<string, EffectiveCapacity>,
  minimumCapacityHours: number = 8
): Map<string, CoverageResolution> {
  const result = new Map<string, CoverageResolution>();

  for (const coverage of coverages) {
    const key = `${coverage.roleType}:${coverage.primaryPersonId}`;
    result.set(key, resolveCoverage(coverage, capacities, minimumCapacityHours));
  }

  return result;
}

/**
 * Find roles with no available cover (for issue derivation)
 */
export function findRolesWithNoCover(
  resolutions: Map<string, CoverageResolution>
): CoverageResolution[] {
  const noCover: CoverageResolution[] = [];

  for (const resolution of resolutions.values()) {
    if (!resolution.primaryAvailable && !resolution.availableCover) {
      noCover.push(resolution);
    }
  }

  return noCover;
}

// ============================================================================
// CRUD Functions
// ============================================================================

/**
 * Create a role coverage
 */
export async function createRoleCoverage(data: {
  workspaceId: string;
  roleType: string;
  roleLabel?: string;
  primaryPersonId: string;
  secondaryPersonIds?: string[];
  createdById?: string;
}): Promise<RoleCoverage> {
  const coverage = await prisma.roleCoverage.create({
    data: {
      workspaceId: data.workspaceId,
      roleType: data.roleType,
      roleLabel: data.roleLabel ?? null,
      primaryPersonId: data.primaryPersonId,
      secondaryPersonIds: data.secondaryPersonIds ?? [],
      createdById: data.createdById ?? null,
    },
    select: {
      id: true,
      workspaceId: true,
      roleType: true,
      roleLabel: true,
      primaryPersonId: true,
      secondaryPersonIds: true,
      createdAt: true,
    },
  });

  return coverage;
}

/**
 * Update a role coverage
 */
export async function updateRoleCoverage(
  id: string,
  data: {
    roleLabel?: string | null;
    secondaryPersonIds?: string[];
  }
): Promise<RoleCoverage> {
  const coverage = await prisma.roleCoverage.update({
    where: { id },
    data,
    select: {
      id: true,
      workspaceId: true,
      roleType: true,
      roleLabel: true,
      primaryPersonId: true,
      secondaryPersonIds: true,
      createdAt: true,
    },
  });

  return coverage;
}

/**
 * Delete a role coverage
 */
export async function deleteRoleCoverage(id: string): Promise<void> {
  await prisma.roleCoverage.delete({ where: { id } });
}
