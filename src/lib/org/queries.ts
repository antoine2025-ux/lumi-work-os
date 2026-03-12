/**
 * Server-side query functions for Org data.
 * These functions can only be called from Server Components or Route Handlers.
 */

import { prisma } from "@/lib/db";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { resolveTeamOwners, resolveDepartmentOwners } from "@/lib/org/ownership-resolver";

export type DepartmentWithTeams = {
  id: string;
  name: string;
  teams: Array<{
    id: string;
    name: string;
    owner?: {
      id: string;
      fullName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null;
  }>;
};

/**
 * Helper to fetch a person by ID (User model).
 */
export async function getPersonById(personId: string) {
  if (!prisma) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: personId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) return null;

  const nameParts = (user.name || "").split(" ");
  const firstName = nameParts[0] || null;
  const lastName = nameParts.slice(1).join(" ") || null;

  return {
    id: user.id,
    fullName: user.name || null,
    firstName,
    lastName,
    email: user.email || null,
  };
}

/**
 * Get all departments with their teams and team owners.
 * Uses canonical ownership resolver with batch resolvers for performance.
 * Fetches data for the current workspace from getOrgPermissionContext.
 */
export async function getDepartmentsWithTeams() {
  if (!prisma) {
    return [];
  }
  
  // Get workspace context for batch resolvers
  const context = await getOrgPermissionContext();
  if (!context?.workspaceId) {
    return [];
  }
  const workspaceId = context.workspaceId;
  
  const departments = await prisma.orgDepartment.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      teams: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });

  // Use batch resolvers for performance (avoids N+1 queries)
  const deptIds = departments.map((d) => d.id);
  const allTeamIds = departments.flatMap((d) => (d.teams || []).map((t) => t.id));
  
  const [deptResolutions, teamResolutions] = await Promise.all([
    resolveDepartmentOwners(workspaceId, deptIds),
    resolveTeamOwners(workspaceId, allTeamIds),
  ]);

  // Collect all owner IDs from resolver results (departments + teams)
  const ownerIds = new Set<string>();
  deptResolutions.forEach((r) => {
    if (r.ownerPersonId) ownerIds.add(r.ownerPersonId);
  });
  teamResolutions.forEach((r) => {
    if (r.ownerPersonId) ownerIds.add(r.ownerPersonId);
  });

  const users = ownerIds.size > 0
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(ownerIds) } },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
    : [];

  const owners = users.map((user) => {
    const nameParts = (user.name || "").split(" ");
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(" ") || null;
    return {
      id: user.id,
      fullName: user.name || null,
      firstName,
      lastName,
      email: user.email || null,
    };
  });

  const ownerMap = new Map(owners.map((p) => [p.id, p]));

  // Map departments and teams using canonical resolver results
  const result = departments.map((d) => {
    const deptResolution = deptResolutions.get(d.id);
    const deptOwnerId = deptResolution?.ownerPersonId || null;
    
    return {
      ...d,
      ownerPerson: deptOwnerId ? ownerMap.get(deptOwnerId) ?? null : null,
      teams: (d.teams || []).map((t) => {
        const teamResolution = teamResolutions.get(t.id);
        const teamOwnerId = teamResolution?.ownerPersonId || null;
        return {
          ...t,
          owner: teamOwnerId ? ownerMap.get(teamOwnerId) ?? null : null,
        };
      }),
    };
  });

  return result;
}

/**
 * Get unassigned teams (teams where departmentId is null).
 * Uses canonical ownership resolver with batch resolvers for performance.
 * Unassigned is a STATE, not an ENTITY - teams can temporarily have no department.
 * Fetches data for the current workspace from getOrgPermissionContext.
 */
export async function getUnassignedTeams() {
  if (!prisma) {
    return [];
  }
  
  // Get workspace context (same pattern as getDepartmentsWithTeams)
  const context = await getOrgPermissionContext();
  if (!context?.workspaceId) {
    return [];
  }
  const workspaceId = context.workspaceId;
  
  // Find teams with null departmentId (unassigned teams)
  // Note: This requires departmentId to be nullable in the schema
  const teams = await prisma.orgTeam.findMany({
    where: {
      workspaceId: workspaceId,
      departmentId: null,
      isActive: true,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  // Use batch resolver for performance (avoids N+1 queries)
  const teamIds = teams.map((t) => t.id);
  const teamResolutions = await resolveTeamOwners(workspaceId, teamIds);

  // Collect all owner IDs from resolver results
  const ownerIds = new Set<string>();
  teamResolutions.forEach((r) => {
    if (r.ownerPersonId) ownerIds.add(r.ownerPersonId);
  });

  const users = ownerIds.size > 0
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(ownerIds) } },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
    : [];

  const owners = users.map((user) => {
    const nameParts = (user.name || "").split(" ");
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(" ") || null;
    return {
      id: user.id,
      fullName: user.name || null,
      firstName,
      lastName,
      email: user.email || null,
    };
  });

  const ownerMap = new Map(owners.map((p) => [p.id, p]));

  // Map teams using canonical resolver results
  return teams.map((t) => {
    const teamResolution = teamResolutions.get(t.id);
    const teamOwnerId = teamResolution?.ownerPersonId || null;
    return {
      id: t.id,
      name: t.name,
      ownerPerson: teamOwnerId ? ownerMap.get(teamOwnerId) ?? null : null,
    };
  });
}

/**
 * Get org structure (wrapper for getDepartmentsWithTeams for consistency).
 * Returns departments with teams and owners in a format suitable for Structure page.
 * Unassigned teams are returned separately (teams with departmentId = null).
 */
export async function getOrgStructure() {
  const allDepartments = await getDepartmentsWithTeams();
  
  // Filter out any "Unassigned" department if it exists (legacy cleanup)
  // Unassigned is a STATE, not an ENTITY - it should never be a department
  const departments = allDepartments.filter(
    (d) => d.name?.trim().toLowerCase() !== "unassigned"
  );
  
  // Get unassigned teams separately (teams with departmentId = null)
  const unassignedTeams = await getUnassignedTeams();
  
  // Map to the expected format (normalize owner field names)
  return {
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      ownerPerson: d.ownerPerson ? {
        id: d.ownerPerson.id,
        name: d.ownerPerson.fullName || [d.ownerPerson.firstName, d.ownerPerson.lastName].filter(Boolean).join(" ") || d.ownerPerson.email || "Unnamed",
      } : null,
      teams: (d.teams || []).map((t) => {
        const owner = t.owner;
        return {
          id: t.id,
          name: t.name,
          ownerPerson: owner ? {
            id: owner.id,
            name: owner.fullName || [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.email || "Unnamed",
          } : null,
        };
      }),
    })),
    unassignedTeams: unassignedTeams.map((t) => ({
      id: t.id,
      name: t.name,
      ownerPerson: t.ownerPerson ? {
        id: t.ownerPerson.id,
        name: t.ownerPerson.fullName || [t.ownerPerson.firstName, t.ownerPerson.lastName].filter(Boolean).join(" ") || t.ownerPerson.email || "Unnamed",
      } : null,
    })),
  };
}

export type DepartmentDetail = {
  id: string;
  name: string;
  description?: string | null;
  ownerPersonId?: string | null;
  ownerPerson?: {
    id: string;
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  teams: Array<{
    id: string;
    name: string;
    owner?: {
      id: string;
      fullName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null;
  }>;
};

/**
 * Get a single department by ID with teams and owners.
 * Fetches data for the current workspace from getOrgPermissionContext.
 */
export async function getDepartmentById(departmentId: string, workspaceId: string) {
  if (!prisma) {
    return null;
  }
  const department = await prisma.orgDepartment.findUnique({
    where: { id: departmentId, workspaceId },
    include: {
      teams: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!department) return null;

  // Collect all owner IDs (department + teams)
  const ownerIds = new Set<string>();
  const deptOwnerPersonId = department.ownerPersonId;
  if (deptOwnerPersonId) ownerIds.add(deptOwnerPersonId);
  (department.teams).forEach((t) => {
    if (t.ownerPersonId) ownerIds.add(t.ownerPersonId);
  });

  // Fetch all owners in one query
  const userIds = Array.from(ownerIds);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
    : [];

  const ownerMap = new Map(
    users.map((user) => {
      const nameParts = (user.name || "").split(" ");
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(" ") || null;
      return [
        user.id,
        {
          id: user.id,
          fullName: user.name || null,
          firstName,
          lastName,
          email: user.email || null,
        },
      ];
    })
  );

  const result = {
    ...department,
    ownerPerson: deptOwnerPersonId ? ownerMap.get(deptOwnerPersonId) ?? null : null,
    teams: (department.teams).map((t) => ({
      ...t,
      owner: t.ownerPersonId ? ownerMap.get(t.ownerPersonId) ?? null : null,
    })),
  };

  return result;
}

/**
 * Helper to extract the department owner person from the department object.
 * This is used when the department is returned from getDepartmentById.
 */
export function getDepartmentOwnerPerson(dept: DepartmentDetail | null) {
  if (!dept) return null;
  return dept.ownerPerson ?? null;
}

/**
 * Get a single team by ID with owner information.
 */
export async function getTeamById(teamId: string, workspaceId: string) {
  if (!prisma) {
    return null;
  }
  const team = await prisma.orgTeam.findUnique({
    where: { id: teamId, workspaceId },
    include: {
      department: true,
    },
  });

  if (!team) return null;

  const ownerPersonId = team.ownerPersonId;
  const ownerPerson = ownerPersonId ? await getPersonById(ownerPersonId) : null;

  return {
    ...team,
    owner: ownerPerson,
  };
}

export type PersonForPicker = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
};

/**
 * Get all people in the organization for use in pickers/selectors.
 * Returns people from OrgPosition joined with User.
 */
export async function getPeopleForOrgPicker(): Promise<PersonForPicker[]> {
  const context = await getOrgPermissionContext();
  
  if (!context) {
    return [];
  }

  const workspaceId = context.workspaceId;

  if (!prisma) {
    return [];
  }

  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      userId: { not: null },
      isActive: true,
    },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return positions
    .filter((pos) => pos.userId && pos.user)
    .map((pos) => {
      const user = pos.user!;
      const nameParts = (user.name || "").split(" ");
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(" ") || null;
      
      return {
        id: pos.userId!,
        firstName,
        lastName,
        fullName: user.name || user.email || "Unknown",
        email: user.email,
      };
    })
    .sort((a, b) => {
      // Sort by lastName, then firstName
      const lastNameA = a.lastName || a.firstName || "";
      const lastNameB = b.lastName || b.firstName || "";
      if (lastNameA !== lastNameB) {
        return lastNameA.localeCompare(lastNameB);
      }
      const firstNameA = a.firstName || "";
      const firstNameB = b.firstName || "";
      return firstNameA.localeCompare(firstNameB);
    });
}

export type DepartmentForPicker = {
  id: string;
  name: string;
};

/**
 * Get all departments for use in pickers/selectors.
 * Returns a lightweight list of departments.
 */
export async function getDepartmentsForPicker(): Promise<DepartmentForPicker[]> {
  try {
    const context = await getOrgPermissionContext();
    
    if (!context) {
      return [];
    }

    const workspaceId = context.workspaceId;

    if (!prisma) {
      console.warn("[getDepartmentsForPicker] Prisma client not available");
      return [];
    }

    const departments = await prisma.orgDepartment.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return departments;
  } catch (error: unknown) {
    console.error("[getDepartmentsForPicker] Error fetching departments:", error instanceof Error ? error.message : error);
    // Return empty array on error to prevent page crash
    return [];
  }
}

