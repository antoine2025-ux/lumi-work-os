/**
 * Canonical Ownership Resolver
 * 
 * Pure, read-only resolver for ownership resolution.
 * NO side effects, NO emitIssue calls, NO writes.
 * 
 * Rules:
 * 1. Check ownerAssignment table first (preferred source)
 * 2. Fall back to ownerPersonId field if no assignment exists
 * 3. Return hasConflict flag if both sources exist and differ
 * 4. Issues are derived separately from resolver flags (not here)
 */

import { prisma } from "@/lib/db";
import type { OwnedEntityType } from "@prisma/client";

export type OwnerResolution = {
  ownerPersonId: string | null;
  source: 'ownerAssignment' | 'ownerPersonId' | null;
  hasConflict: boolean; // True if both sources exist and differ
  legacyOwnerId?: string | null; // Only present if hasConflict
  assignmentOwnerId?: string | null; // Only present if hasConflict
};

/**
 * Resolve ownership for a single entity (for detail pages)
 * Pure function: read-only, no side effects, no writes
 * 
 * @param workspaceId - Workspace ID (required for OwnerAssignment queries)
 * @param entityType - Entity type (TEAM or DEPARTMENT)
 * @param entityId - Entity ID
 */
export async function resolveOwner(
  workspaceId: string,
  entityType: 'TEAM' | 'DEPARTMENT',
  entityId: string
): Promise<OwnerResolution> {
  // Check ownerAssignment table first (preferred source)
  const assignment = await prisma.ownerAssignment.findFirst({
    where: {
      workspaceId,
      entityType: entityType as OwnedEntityType,
      entityId,
    },
    select: { ownerPersonId: true },
  });

  // Get legacy ownerPersonId field
  const legacyOwner = entityType === 'TEAM'
    ? await prisma.orgTeam.findUnique({
        where: { id: entityId },
        select: { ownerPersonId: true },
      })
    : await prisma.orgDepartment.findUnique({
        where: { id: entityId },
        select: { ownerPersonId: true },
      });

  const assignmentOwnerId = assignment?.ownerPersonId || null;
  const legacyOwnerId = legacyOwner?.ownerPersonId || null;

  // MANDATORY: Conflict detection (factual flag, no side effects)
  const hasConflict = !!(assignmentOwnerId && legacyOwnerId && assignmentOwnerId !== legacyOwnerId);

  if (hasConflict) {
    // Prefer ownerAssignment, but return both for issue derivation
    return {
      ownerPersonId: assignmentOwnerId, // Prefer ownerAssignment
      source: 'ownerAssignment',
      hasConflict: true,
      legacyOwnerId,
      assignmentOwnerId,
    };
  }

  // No conflict: prefer ownerAssignment, fall back to ownerPersonId
  const finalOwner = assignmentOwnerId || legacyOwnerId;
  return {
    ownerPersonId: finalOwner,
    source: assignmentOwnerId ? 'ownerAssignment' : (legacyOwnerId ? 'ownerPersonId' : null),
    hasConflict: false,
  };
}

/**
 * Batch resolver for teams (avoids N+1 queries for list views)
 * Pure function: read-only, no side effects, no writes
 * 
 * @param workspaceId - Workspace ID (required for OwnerAssignment queries)
 * @param teamIds - Array of team IDs
 */
export async function resolveTeamOwners(workspaceId: string, teamIds: string[]): Promise<Map<string, OwnerResolution>> {
  if (teamIds.length === 0) return new Map();

  // Query all OwnerAssignment rows in one call
  const assignments = await prisma.ownerAssignment.findMany({
    where: {
      workspaceId,
      entityType: 'TEAM' as OwnedEntityType,
      entityId: { in: teamIds },
    },
    select: { entityId: true, ownerPersonId: true },
  });

  // Query all teams ownerPersonId in one call
  const teams = await prisma.orgTeam.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, ownerPersonId: true },
  });

  // Build assignment map
  const assignmentMap = new Map(assignments.map((a) => [a.entityId, a.ownerPersonId]));
  const teamMap = new Map(teams.map((t) => [t.id, t.ownerPersonId]));

  // Merge in memory
  const results = new Map<string, OwnerResolution>();
  for (const teamId of teamIds) {
    const assignmentOwnerId = assignmentMap.get(teamId) || null;
    const legacyOwnerId = teamMap.get(teamId) || null;
    const hasConflict = !!(assignmentOwnerId && legacyOwnerId && assignmentOwnerId !== legacyOwnerId);

    results.set(teamId, {
      ownerPersonId: hasConflict ? assignmentOwnerId : (assignmentOwnerId || legacyOwnerId),
      source: assignmentOwnerId ? 'ownerAssignment' : (legacyOwnerId ? 'ownerPersonId' : null),
      hasConflict,
      ...(hasConflict ? { legacyOwnerId, assignmentOwnerId } : {}),
    });
  }

  return results;
}

/**
 * Batch resolver for departments (avoids N+1 queries for list views)
 * Pure function: read-only, no side effects, no writes
 * 
 * @param workspaceId - Workspace ID (required for OwnerAssignment queries)
 * @param deptIds - Array of department IDs
 */
export async function resolveDepartmentOwners(workspaceId: string, deptIds: string[]): Promise<Map<string, OwnerResolution>> {
  if (deptIds.length === 0) return new Map();

  // Query all OwnerAssignment rows in one call
  const assignments = await prisma.ownerAssignment.findMany({
    where: {
      workspaceId,
      entityType: 'DEPARTMENT' as OwnedEntityType,
      entityId: { in: deptIds },
    },
    select: { entityId: true, ownerPersonId: true },
  });

  // Query all departments ownerPersonId in one call
  const departments = await prisma.orgDepartment.findMany({
    where: { id: { in: deptIds } },
    select: { id: true, ownerPersonId: true },
  });

  // Build assignment map
  const assignmentMap = new Map(assignments.map((a) => [a.entityId, a.ownerPersonId]));
  const deptMap = new Map(departments.map((d) => [d.id, d.ownerPersonId]));

  // Merge in memory
  const results = new Map<string, OwnerResolution>();
  for (const deptId of deptIds) {
    const assignmentOwnerId = assignmentMap.get(deptId) || null;
    const legacyOwnerId = deptMap.get(deptId) || null;
    const hasConflict = !!(assignmentOwnerId && legacyOwnerId && assignmentOwnerId !== legacyOwnerId);

    results.set(deptId, {
      ownerPersonId: hasConflict ? assignmentOwnerId : (assignmentOwnerId || legacyOwnerId),
      source: assignmentOwnerId ? 'ownerAssignment' : (legacyOwnerId ? 'ownerPersonId' : null),
      hasConflict,
      ...(hasConflict ? { legacyOwnerId, assignmentOwnerId } : {}),
    });
  }

  return results;
}
