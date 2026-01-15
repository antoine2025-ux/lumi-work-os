/**
 * Read services for Org Structure (Departments and Teams).
 * 
 * IMPORTANT: Since scoping middleware is currently disabled, workspaceId must be
 * explicitly passed and used in queries to ensure proper workspace isolation.
 */

import { prisma } from "@/lib/db";
import type { OrgStructureDTO } from "@/server/org/dto";
import { getWorkspaceContext } from "@/lib/prisma/scopingMiddleware";

/**
 * Get the organizational structure (minimal payload).
 * Returns departments with teams, and teams with member counts only.
 * Use getTeamDetail for full team member details.
 * 
 * @param workspaceId - Optional workspaceId. If not provided, will try to get from context.
 */
export async function getOrgStructure(workspaceId?: string): Promise<OrgStructureDTO> {
  // Get workspaceId from context if not provided (for backward compatibility)
  const effectiveWorkspaceId = workspaceId || getWorkspaceContext();
  
  if (!effectiveWorkspaceId) {
    console.warn("[getOrgStructure] No workspaceId provided and no workspace context set. Returning empty structure.");
    return { departments: [], teams: [] };
  }
  const [departments, allTeams] = await Promise.all([
    prisma.orgDepartment.findMany({
      where: { 
        workspaceId: effectiveWorkspaceId,
        isActive: true,
        // Exclude "Unassigned" department (case-sensitive)
        name: { not: { equals: "Unassigned" } },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
          name: true,
          teams: {
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              ownerPersonId: true,
              _count: {
                select: {
                  positions: true,
                },
              },
            },
          },
        },
      }),
      prisma.orgTeam.findMany({
        where: { 
          workspaceId: effectiveWorkspaceId, // Explicitly filter by workspaceId
          isActive: true 
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          departmentId: true,
          ownerPersonId: true,
          _count: {
            select: {
              positions: true,
            },
          },
        },
    }),
  ]);

  // Get department owners from OwnerAssignment (defensive: handle if enum doesn't exist)
  let departmentOwners: Array<{ entityId: string; ownerPersonId: string }> = [];
  try {
    departmentOwners = await prisma.ownerAssignment.findMany({
      where: {
        workspaceId: effectiveWorkspaceId,
        entityType: "DEPARTMENT",
      },
      select: {
        entityId: true,
        ownerPersonId: true,
      },
    });
  } catch (error: any) {
    // If enum doesn't exist or table doesn't exist, use raw SQL as fallback
    if (error?.message?.includes("OwnedEntityType") || error?.message?.includes("does not exist")) {
        try {
          const rawResults = await prisma.$queryRawUnsafe<Array<{ entity_id: string; owner_person_id: string }>>(
            `SELECT entity_id, owner_person_id
             FROM owner_assignments
             WHERE workspace_id = $1::text
               AND entity_type = $2::text`,
            effectiveWorkspaceId,
            'DEPARTMENT'
          );
          departmentOwners = rawResults.map((r) => ({
            entityId: r.entity_id,
            ownerPersonId: r.owner_person_id,
          }));
        } catch (rawError: any) {
          // If raw SQL also fails (table doesn't exist), just continue without owners
          console.warn("[getOrgStructure] Could not load department owners:", rawError?.message);
          departmentOwners = [];
        }
    } else {
      // Re-throw if it's a different error
      throw error;
    }
  }

  // Build map of department ID -> ownerPersonId
  const departmentOwnerMap = new Map<string, string>();
  departmentOwners.forEach((oa) => {
    departmentOwnerMap.set(oa.entityId, oa.ownerPersonId);
  });

  // Build departments structure
  const departmentsDTO = departments.map((d) => ({
    id: d.id,
    name: d.name,
    ownerPersonId: departmentOwnerMap.get(d.id) ?? null,
    teams: d.teams.map((t) => ({
      id: t.id,
      name: t.name,
      ownerPersonId: t.ownerPersonId ?? null,
      memberCount: t._count.positions,
    })),
  }));

  // Build teams structure (no members, just counts)
  const teamsDTO = allTeams.map((t) => ({
    id: t.id,
    name: t.name,
    departmentId: t.departmentId ?? null,
    ownerPersonId: t.ownerPersonId ?? null,
    memberCount: t._count.positions,
  }));

  return {
    departments: departmentsDTO,
    teams: teamsDTO,
  };
}

