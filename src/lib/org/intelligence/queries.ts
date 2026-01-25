/**
 * Intelligence Queries
 *
 * Centralized read-only Prisma queries for intelligence resolvers.
 * This module fetches the minimal dataset needed for Phase S signals.
 *
 * SECURITY: loadIntelligenceData() must only be called server-side
 * after auth validation. Never accept workspaceId from client.
 *
 * See docs/org/intelligence-rules.md for canonical rules.
 */

import { prisma } from "@/lib/db";

// ============================================================================
// Input Data Types
// ============================================================================

/**
 * Department data for resolvers
 */
export type DepartmentData = {
  id: string;
  name: string;
  ownerPersonId: string | null;
  isActive: boolean;
};

/**
 * Team data for resolvers
 */
export type TeamData = {
  id: string;
  name: string;
  departmentId: string | null;
  ownerPersonId: string | null;
  isActive: boolean;
};

/**
 * Person data for resolvers (derived from OrgPosition + User)
 */
export type PersonData = {
  id: string; // User.id
  name: string | null;
  positionId: string | null;
  teamId: string | null;
  managerId: string | null; // OrgPosition.parentId resolved to User.id
  level: number;
  isActive: boolean;
};

/**
 * Owner assignment data for resolvers
 */
export type OwnerAssignmentData = {
  entityType: string;
  entityId: string;
  ownerPersonId: string;
};

/**
 * Complete intelligence data for resolvers
 */
export type IntelligenceData = {
  departments: DepartmentData[];
  teams: TeamData[];
  people: PersonData[];
  ownerAssignments: OwnerAssignmentData[];
  workspaceOwnerId: string;
};

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Load all data needed for intelligence resolvers.
 *
 * SECURITY: Only call after auth validation. workspaceId must come from
 * authenticated session, never from client request.
 *
 * @param workspaceId - Authenticated workspace ID
 * @returns Intelligence data for resolvers
 */
export async function loadIntelligenceData(workspaceId: string): Promise<IntelligenceData> {
  // Parallel queries for performance
  const [
    workspace,
    departments,
    teams,
    positions,
    ownerAssignments,
  ] = await Promise.all([
    // Workspace owner
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    }),

    // All departments
    prisma.orgDepartment.findMany({
      where: { workspaceId, isActive: true },
      select: {
        id: true,
        name: true,
        ownerPersonId: true,
        isActive: true,
      },
    }),

    // All teams
    prisma.orgTeam.findMany({
      where: { workspaceId, isActive: true },
      select: {
        id: true,
        name: true,
        departmentId: true,
        ownerPersonId: true,
        isActive: true,
      },
    }),

    // All positions with users (for people data)
    prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
      },
      select: {
        id: true,
        userId: true,
        teamId: true,
        parentId: true,
        level: true,
        isActive: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          select: {
            userId: true,
          },
        },
      },
    }),

    // Owner assignments
    prisma.ownerAssignment.findMany({
      where: { workspaceId },
      select: {
        entityType: true,
        entityId: true,
        ownerPersonId: true,
      },
    }),
  ]);

  // Transform positions to people data
  const people: PersonData[] = positions.map((pos) => ({
    id: pos.userId!,
    name: pos.user?.name ?? null,
    positionId: pos.id,
    teamId: pos.teamId,
    // Resolve parentId to the parent's userId (manager's User.id)
    managerId: pos.parent?.userId ?? null,
    level: pos.level,
    isActive: pos.isActive,
  }));

  return {
    departments,
    teams,
    people,
    ownerAssignments: ownerAssignments.map((a) => ({
      entityType: a.entityType,
      entityId: a.entityId,
      ownerPersonId: a.ownerPersonId,
    })),
    workspaceOwnerId: workspace?.ownerId ?? "",
  };
}
