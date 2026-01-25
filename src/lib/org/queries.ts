/**
 * Server-side query functions for Org data.
 * These functions can only be called from Server Components or Route Handlers.
 */

import { prisma } from "@/lib/db";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";

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
 * Fetches data for the current workspace from getOrgPermissionContext.
 * 
 * NOTE: Gracefully handles missing ownerPersonId column (if migration not run).
 */
export async function getDepartmentsWithTeams() {
  if (!prisma) {
    return [];
  }
  
  try {
    const departments = await prisma.orgDepartment.findMany({
      orderBy: { name: "asc" },
      include: {
        teams: {
          orderBy: { name: "asc" },
        },
      },
    });

    // Safely access ownerPersonId - may not exist if migration not run
    const ownerIds = Array.from(
      new Set([
        ...departments.map((d: any) => d.ownerPersonId).filter(Boolean),
        ...departments.flatMap((d: any) => (d.teams as any[]).map((t: any) => t.ownerPersonId).filter(Boolean)),
      ])
    ) as string[];

    const users = ownerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: ownerIds } },
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

    const result = departments.map((d: any) => ({
      ...d,
      ownerPerson: d.ownerPersonId ? ownerMap.get(d.ownerPersonId) ?? null : null,
      teams: (d.teams as any[]).map((t: any) => ({
        ...t,
        owner: t.ownerPersonId ? ownerMap.get(t.ownerPersonId) ?? null : null,
      })),
    }));

    return result;
  } catch (error: any) {
    // Handle missing column error gracefully
    if (error?.message?.includes('ownerPersonId') && error?.message?.includes('does not exist')) {
      console.warn('[getDepartmentsWithTeams] ownerPersonId column not found - returning departments without owners. Run migrations to fix.');
      
      // Fallback: use explicit select to avoid missing columns
      const departments = await prisma.orgDepartment.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          workspaceId: true,
          createdAt: true,
          updatedAt: true,
          teams: {
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              workspaceId: true,
              departmentId: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
      
      return departments.map((d: any) => ({
        ...d,
        ownerPerson: null,
        teams: (d.teams as any[]).map((t: any) => ({
          ...t,
          owner: null,
        })),
      }));
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Get unassigned teams (teams where departmentId is null).
 * Unassigned is a STATE, not an ENTITY - teams can temporarily have no department.
 * Fetches data for the current workspace from getOrgPermissionContext.
 * 
 * NOTE: Gracefully handles missing ownerPersonId column (if migration not run).
 */
export async function getUnassignedTeams() {
  if (!prisma) {
    return [];
  }
  
  // Get workspace context (same pattern as getDepartmentsWithTeams)
  const context = await getOrgPermissionContext();
  if (!context?.orgId) {
    return [];
  }
  const workspaceId = context.orgId;
  
  try {
    // Find teams with null departmentId (unassigned teams)
    // Note: This requires departmentId to be nullable in the schema
    const teams = await prisma.orgTeam.findMany({
      where: {
        workspaceId: workspaceId,
        departmentId: null,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    // Safely collect owner IDs - may not exist if migration not run
    const ownerIds = Array.from(
      new Set(teams.map((t: any) => t.ownerPersonId).filter(Boolean))
    ) as string[];

    const users = ownerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: ownerIds } },
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

    return teams.map((t: any) => ({
      id: t.id,
      name: t.name,
      ownerPerson: t.ownerPersonId ? ownerMap.get(t.ownerPersonId) ?? null : null,
    }));
  } catch (error: any) {
    // Handle missing column error gracefully
    if (error?.message?.includes('ownerPersonId') && error?.message?.includes('does not exist')) {
      console.warn('[getUnassignedTeams] ownerPersonId column not found - returning teams without owners. Run migrations to fix.');
      
      // Fallback: use explicit select to avoid missing columns
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
          workspaceId: true,
          departmentId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      return teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        ownerPerson: null,
      }));
    }
    
    // Re-throw other errors
    throw error;
  }
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
    (d: any) => d.name?.trim().toLowerCase() !== "unassigned"
  );
  
  // Get unassigned teams separately (teams with departmentId = null)
  const unassignedTeams = await getUnassignedTeams();
  
  // Map to the expected format (normalize owner field names)
  return {
    departments: departments.map((d: any) => ({
      id: d.id,
      name: d.name,
      ownerPerson: d.ownerPerson ? {
        id: d.ownerPerson.id,
        name: d.ownerPerson.fullName || [d.ownerPerson.firstName, d.ownerPerson.lastName].filter(Boolean).join(" ") || d.ownerPerson.email || "Unnamed",
      } : null,
      teams: (d.teams || []).map((t: any) => {
        const owner = t.owner || t.ownerPerson;
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
    unassignedTeams: unassignedTeams.map((t: any) => ({
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
 * 
 * NOTE: Gracefully handles missing ownerPersonId column (if migration not run).
 */
export async function getDepartmentById(departmentId: string) {
  if (!prisma) {
    return null;
  }
  
  const department = await prisma.orgDepartment.findUnique({
    where: { id: departmentId },
    include: {
      teams: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!department) return null;

  try {
    // Collect all owner IDs (department + teams) - may not exist if migration not run
    const ownerIds = new Set<string>();
    const deptOwnerPersonId = (department as any).ownerPersonId as string | null | undefined;
    if (deptOwnerPersonId) ownerIds.add(deptOwnerPersonId);
    (department.teams as any[]).forEach((t: any) => {
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
      teams: (department.teams as any[]).map((t: any) => ({
        ...t,
        owner: t.ownerPersonId ? ownerMap.get(t.ownerPersonId) ?? null : null,
      })),
    };

    return result;
  } catch (error: any) {
    // Handle missing column gracefully - return department without owner info
    if (error?.message?.includes('ownerPersonId')) {
      console.warn('[getDepartmentById] ownerPersonId column not found - returning department without owner. Run migrations to fix.');
      return {
        ...department,
        ownerPerson: null,
        teams: (department.teams as any[]).map((t: any) => ({
          ...t,
          owner: null,
        })),
      };
    }
    throw error;
  }
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
 * 
 * NOTE: Gracefully handles missing ownerPersonId column (if migration not run).
 */
export async function getTeamById(teamId: string) {
  if (!prisma) {
    return null;
  }
  const team = await prisma.orgTeam.findUnique({
    where: { id: teamId },
    include: {
      department: true,
    },
  });

  if (!team) return null;

  try {
    const ownerPersonId = (team as any).ownerPersonId as string | null | undefined;
    const ownerPerson = ownerPersonId ? await getPersonById(ownerPersonId) : null;

    return {
      ...team,
      owner: ownerPerson,
    };
  } catch (error: any) {
    // Handle missing column gracefully
    if (error?.message?.includes('ownerPersonId')) {
      console.warn('[getTeamById] ownerPersonId column not found - returning team without owner. Run migrations to fix.');
      return {
        ...team,
        owner: null,
      };
    }
    throw error;
  }
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

  const workspaceId = context.orgId;

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

    const workspaceId = context.orgId;

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
  } catch (error: any) {
    console.error("[getDepartmentsForPicker] Error fetching departments:", error?.message);
    // Return empty array on error to prevent page crash
    return [];
  }
}

