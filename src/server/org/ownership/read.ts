/**
 * Read services for Org Ownership.
 * 
 * IMPORTANT: These services assume Prisma is already workspace-scoped
 * via setWorkspaceContext(workspaceId) in the calling route handler.
 * Do NOT accept workspaceId as an argument.
 */

import { prisma } from "@/lib/db";
import type { OrgOwnershipDTO } from "@/server/org/dto";

/**
 * Get ownership coverage and assignments.
 * Returns coverage stats, unowned entities, and all assignments.
 */
export async function getOrgOwnership(): Promise<OrgOwnershipDTO> {
  // Schema truth: If ownerPersonId column doesn't exist, Prisma will throw.
  // This enforces that migrations must be applied.
  // Note: We try to select ownerPersonId, but if the column doesn't exist,
  // Prisma will throw a clear error about the missing column.
  const teams = await prisma.orgTeam.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      ownerPersonId: true, // Include for suggested owner - will throw if column missing
      department: { select: { name: true } },
    },
  });

  const [departments, assignments] = await Promise.all([
    prisma.orgDepartment.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
    // Note: OwnedEntityType enum only includes TEAM, DOMAIN, PROJECT, SYSTEM (not DEPARTMENT)
    // So we only query for TEAM assignments
    prisma.ownerAssignment.findMany({
      where: {
        entityType: "TEAM",
      },
      include: {
        // Note: ownerPersonId points to User.id, so we need to get the user
        // Since there's no direct relation, we'll fetch users separately
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Get owner user details
  const ownerPersonIds = [...new Set(assignments.map(a => a.ownerPersonId))];
  const owners = await prisma.user.findMany({
    where: { id: { in: ownerPersonIds } },
    select: { id: true, name: true, email: true },
  });
  
  const ownerMap = new Map(owners.map(u => [u.id, u]));

  // Build assignment index
  const assignmentIndex = new Map<string, { id: string; owner: { id: string; fullName: string } }>();
  for (const a of assignments) {
    const owner = ownerMap.get(a.ownerPersonId);
    if (owner) {
      assignmentIndex.set(`${a.entityType}:${a.entityId}`, {
        id: a.id,
        owner: {
          id: owner.id,
          fullName: owner.name || owner.email || "Unknown",
        },
      });
    }
  }

  // Find unowned teams
  const unownedTeams = teams
    .filter((t) => !assignmentIndex.has(`TEAM:${t.id}`))
    .map((t) => ({
      entityType: "TEAM" as const,
      entityId: t.id,
      name: t.name,
      departmentName: t.department?.name ?? null,
      suggestedOwnerPersonId: t.ownerPersonId ?? null, // Suggest team owner from Structure
    }));

  // Find unowned departments
  const unownedDepts = departments
    .filter((d) => !assignmentIndex.has(`DEPARTMENT:${d.id}`))
    .map((d) => ({
      entityType: "DEPARTMENT" as const,
      entityId: d.id,
      name: d.name,
      suggestedOwnerPersonId: null, // No suggestion for departments yet
    }));

  const ownedTeams = teams.length - unownedTeams.length;
  const ownedDepartments = departments.length - unownedDepts.length;

  return {
    coverage: {
      teams: { total: teams.length, owned: ownedTeams, unowned: unownedTeams.length },
      departments: { total: departments.length, owned: ownedDepartments, unowned: unownedDepts.length },
    },
    unowned: [...unownedTeams, ...unownedDepts],
    assignments: assignments
      .filter((a) => ownerMap.has(a.ownerPersonId))
      .map((a) => {
        const owner = ownerMap.get(a.ownerPersonId)!;
        return {
          id: a.id,
          entityType: a.entityType as "TEAM", // Only TEAM is supported by OwnedEntityType enum
          entityId: a.entityId,
          owner: {
            id: owner.id,
            fullName: owner.name || owner.email || "Unknown",
          },
        };
      }),
  };
}

