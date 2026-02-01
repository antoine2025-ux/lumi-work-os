/**
 * Read services for Org People.
 * 
 * IMPORTANT: Since scoping middleware is currently disabled, workspaceId must be
 * explicitly passed and used in queries to ensure proper workspace isolation.
 */

import { prisma } from "@/lib/db";
import type { OrgPeopleListDTO, OrgPersonDTO } from "@/server/org/dto";
import { isAvailabilityStale } from "@/server/org/availability/stale";
import { getOrCreateIntelligenceSettings } from "@/server/org/intelligence/settings";
import { getWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import {
  derivePersonAvailability,
  type AvailabilityWindow,
  type EmploymentStatus,
} from "@/lib/org/deriveAvailability";

/**
 * List all people in the organization.
 * Returns people from OrgPosition joined with User.
 * 
 * @param workspaceId - Optional workspaceId. If not provided, will try to get from context.
 */
export async function listOrgPeople(workspaceId?: string, includeArchived: boolean = false): Promise<OrgPeopleListDTO> {
  // Get workspaceId from context if not provided (for backward compatibility)
  const effectiveWorkspaceId = workspaceId || getWorkspaceContext();
  
  if (!effectiveWorkspaceId) {
    console.warn("[listOrgPeople] No workspaceId provided and no workspace context set. Returning empty list.");
    return { people: [] };
  }

  // Build where clause - REMOVED archivedAt filter to restore people list
  const whereClause: any = {
    workspaceId: effectiveWorkspaceId, // Explicitly filter by workspaceId
    userId: { not: null },
    isActive: true,
  };

  // Use select to explicitly choose fields that exist in the database
  // This avoids errors when schema has fields that don't exist in the actual database
  const positions = await prisma.orgPosition.findMany({
    where: whereClause,
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, email: true },
      },
      team: {
        select: { id: true, name: true, department: { select: { id: true, name: true } } },
      },
      parent: {
        select: { id: true, user: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Get derived availability for all people (replaces legacy PersonAvailabilityHealth)
  const userIds = positions.filter(p => p.userId).map(p => p.userId!);
  const availabilityMap = new Map<string, { status: string; updatedAt: Date | null }>();
  
  if (userIds.length > 0) {
    // Fetch employment status from WorkspaceMember
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        userId: { in: userIds },
        workspaceId: effectiveWorkspaceId,
      },
      select: { userId: true, employmentStatus: true },
    });
    const employmentMap = new Map<string, EmploymentStatus>();
    for (const wm of workspaceMembers) {
      employmentMap.set(wm.userId, (wm.employmentStatus as EmploymentStatus) ?? "ACTIVE");
    }

    // Fetch availability windows
    const availabilityWindows = await prisma.personAvailability.findMany({
      where: {
        personId: { in: userIds },
        workspaceId: effectiveWorkspaceId,
      },
      select: {
        personId: true,
        type: true,
        startDate: true,
        endDate: true,
        fraction: true,
        reason: true,
        expectedReturnDate: true,
        updatedAt: true,
      },
    });

    // Group windows by personId
    const windowsMap = new Map<string, AvailabilityWindow[]>();
    const latestUpdateMap = new Map<string, Date | null>();
    for (const w of availabilityWindows) {
      const existing = windowsMap.get(w.personId) || [];
      existing.push({
        type: w.type === "UNAVAILABLE" ? "unavailable" : "partial",
        startDate: w.startDate,
        endDate: w.endDate ?? undefined,
        fraction: w.fraction ?? undefined,
        reason: w.reason as AvailabilityWindow["reason"],
        expectedReturnDate: w.expectedReturnDate ?? undefined,
      });
      windowsMap.set(w.personId, existing);
      
      // Track latest update
      const currentLatest = latestUpdateMap.get(w.personId);
      if (!currentLatest || (w.updatedAt && w.updatedAt > currentLatest)) {
        latestUpdateMap.set(w.personId, w.updatedAt);
      }
    }

    // Derive availability for each person
    for (const userId of userIds) {
      const employmentStatus = employmentMap.get(userId) ?? "ACTIVE";
      const windows = windowsMap.get(userId) ?? [];
      const latestUpdate = latestUpdateMap.get(userId) ?? null;

      const derived = derivePersonAvailability({
        personId: userId,
        employmentStatus,
        windows,
      });

      // Map derived status to DTO format
      let status: string;
      if (derived.effectiveCapacity === 1) {
        status = "AVAILABLE";
      } else if (derived.effectiveCapacity > 0) {
        status = "LIMITED";
      } else {
        status = "UNAVAILABLE";
      }

      availabilityMap.set(userId, {
        status,
        updatedAt: latestUpdate,
      });
    }
  }

  // Get top skills for all people (top 3 by proficiency)
  const skillsMap = new Map<string, Array<{ id: string; name: string; proficiency: number }>>();
  
  if (userIds.length > 0) {
    const personSkills = await prisma.personSkill.findMany({
      where: {
        personId: { in: userIds },
        workspaceId: effectiveWorkspaceId,
      },
      select: {
        personId: true,
        proficiency: true,
        skill: {
          select: { id: true, name: true },
        },
      },
      orderBy: { proficiency: "desc" },
    });
    
    for (const ps of personSkills) {
      const existing = skillsMap.get(ps.personId) || [];
      // Only keep top 3 skills
      if (existing.length < 3) {
        existing.push({
          id: ps.skill.id,
          name: ps.skill.name,
          proficiency: ps.proficiency,
        });
        skillsMap.set(ps.personId, existing);
      }
    }
  }

  // Sort people by user name after fetching (Prisma doesn't easily sort by nested relations)
  const sortedPositions = positions
    .filter(p => p.user && p.userId)
    .sort((a, b) => {
      const nameA = a.user!.name || a.user!.email || "";
      const nameB = b.user!.name || b.user!.email || "";
      return nameA.localeCompare(nameB);
    });

  // Get intelligence settings for staleness threshold
  // If table doesn't exist, use default settings (non-blocking)
  let settings: { availabilityStaleDays: number };
  try {
    settings = await getOrCreateIntelligenceSettings();
  } catch (error: any) {
    // If table doesn't exist, use default settings
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      console.warn("[listOrgPeople] Intelligence settings table not found, using defaults:", error.message);
      settings = { availabilityStaleDays: 30 }; // Default: 30 days
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  const people = sortedPositions.map((p) => {
      const userId = p.userId!;
      const availability = availabilityMap.get(userId);
      
      // Map AvailabilityStatus enum to DTO format
      let availabilityStatus: OrgPersonDTO["availabilityStatus"] = "UNKNOWN";
      if (availability) {
        switch (availability.status) {
          case "AVAILABLE":
            availabilityStatus = "AVAILABLE";
            break;
          case "LIMITED":
            availabilityStatus = "PARTIALLY_AVAILABLE";
            break;
          case "UNAVAILABLE":
            availabilityStatus = "UNAVAILABLE";
            break;
          default:
            availabilityStatus = "UNKNOWN";
        }
      }

      const availabilityUpdatedAt = availability?.updatedAt ? availability.updatedAt : null;
      const topSkills = skillsMap.get(userId) || [];
      return {
        id: p.id,
        fullName: p.user!.name || p.user!.email || "Unknown",
        email: p.user!.email,
        title: p.title,
        department: p.team?.department ? {
          id: p.team.department.id,
          name: p.team.department.name,
        } : null,
        team: p.team ? {
          id: p.team.id,
          name: p.team.name,
        } : null,
        manager: p.parent?.user ? {
          id: p.parent.id,
          fullName: p.parent.user.name || p.parent.user.email || "Unknown",
        } : null,
        availabilityStatus,
        availabilityUpdatedAt: availabilityUpdatedAt ? availabilityUpdatedAt.toISOString() : null,
        availabilityStale: isAvailabilityStale(availabilityUpdatedAt, settings.availabilityStaleDays),
        // Top 3 skills by proficiency (for list display)
        topSkills,
      };
    });

  return { people };
}

/**
 * Get a single person by ID.
 * Returns person from OrgPosition joined with User.
 * 
 * @param personId - The person (OrgPosition) ID
 * @param workspaceId - Optional workspaceId. If not provided, will try to get from context.
 */
export async function getOrgPerson(personId: string, workspaceId?: string): Promise<OrgPersonDTO | null> {
  // Get workspaceId from context if not provided (for backward compatibility)
  const effectiveWorkspaceId = workspaceId || getWorkspaceContext();
  
  // Use select to explicitly choose fields that exist in the database
  const position = await prisma.orgPosition.findUnique({
    where: { id: personId },
    select: {
      id: true,
      userId: true,
      title: true,
      workspaceId: true,
      user: {
        select: { id: true, name: true, email: true },
      },
      team: {
        select: { id: true, name: true, department: { select: { id: true, name: true } } },
      },
      parent: {
        select: { id: true, user: { select: { id: true, name: true } } },
      },
      children: {
        where: { isActive: true },
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!position || !position.user || !position.userId) {
    // If position not found by ID, personId might be a User ID
    // Try to find OrgPosition by userId
    if (effectiveWorkspaceId) {
      const positionByUserId = await prisma.orgPosition.findFirst({
        where: {
          userId: personId,
          workspaceId: effectiveWorkspaceId,
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          title: true,
          workspaceId: true,
          user: {
            select: { id: true, name: true, email: true },
          },
          team: {
            select: { id: true, name: true, department: { select: { id: true, name: true } } },
          },
          parent: {
            select: { id: true, user: { select: { id: true, name: true } } },
          },
          children: {
            where: { isActive: true },
            select: {
              id: true,
              user: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }).catch(() => null);
      
      if (positionByUserId && positionByUserId.user && positionByUserId.userId) {
        // Use the position found by userId
        const effectivePosition = positionByUserId;
        
        // Continue with the rest of the function using effectivePosition
        // Verify workspace ownership (security check)
        if (effectivePosition.workspaceId !== effectiveWorkspaceId) {
          console.warn(`[getOrgPerson] Person ${effectivePosition.id} belongs to workspace ${effectivePosition.workspaceId}, but requested workspace is ${effectiveWorkspaceId}`);
          return null;
        }

        // Get intelligence settings for staleness threshold
        let settings: { availabilityStaleDays: number };
        try {
          settings = await getOrCreateIntelligenceSettings();
        } catch (error: any) {
          if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
            console.warn("[getOrgPerson] Intelligence settings table not found, using defaults:", error.message);
            settings = { availabilityStaleDays: 30 };
          } else {
            throw error;
          }
        }

        // Get derived availability
        const userId = effectivePosition.userId;
        const wsId = effectivePosition.workspaceId;

        const workspaceMember = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId: wsId, userId },
          },
          select: { employmentStatus: true },
        }).catch(() => null);
        const employmentStatus = (workspaceMember?.employmentStatus as EmploymentStatus) ?? "ACTIVE";

        const availabilityWindows = await prisma.personAvailability.findMany({
          where: { personId: userId, workspaceId: wsId },
          select: {
            type: true,
            startDate: true,
            endDate: true,
            fraction: true,
            reason: true,
            expectedReturnDate: true,
            updatedAt: true,
          },
        }).catch(() => []);

        const latestUpdate = availabilityWindows.reduce<Date | null>((latest, w) => {
          if (!latest) return w.updatedAt;
          return w.updatedAt && w.updatedAt > latest ? w.updatedAt : latest;
        }, null);

        const windows: AvailabilityWindow[] = availabilityWindows.map((w) => ({
          type: w.type === "UNAVAILABLE" ? "unavailable" : "partial",
          startDate: w.startDate,
          endDate: w.endDate ?? undefined,
          fraction: w.fraction ?? undefined,
          reason: w.reason as AvailabilityWindow["reason"],
          expectedReturnDate: w.expectedReturnDate ?? undefined,
        }));

        const derived = derivePersonAvailability({
          personId: userId,
          employmentStatus,
          windows,
        });

        let availabilityStatus: OrgPersonDTO["availabilityStatus"] = "UNKNOWN";
        if (derived.effectiveCapacity === 1) {
          availabilityStatus = "AVAILABLE";
        } else if (derived.effectiveCapacity > 0) {
          availabilityStatus = "PARTIALLY_AVAILABLE";
        } else if (employmentStatus === "ACTIVE" || employmentStatus === "CONTRACTOR") {
          availabilityStatus = "UNAVAILABLE";
        } else {
          availabilityStatus = "UNKNOWN";
        }

        const availability = { updatedAt: latestUpdate };
        const directReports = (effectivePosition.children || [])
          .filter((child) => child.user)
          .map((child) => ({
            id: child.id,
            fullName: child.user!.name || child.user!.email || "Unknown",
          }))
          .sort((a, b) => a.fullName.localeCompare(b.fullName));

        const availabilityUpdatedAt = availability?.updatedAt ? availability.updatedAt : null;
        return {
          id: effectivePosition.id,
          fullName: effectivePosition.user.name || effectivePosition.user.email || "Unknown",
          email: effectivePosition.user.email,
          title: effectivePosition.title,
          department: effectivePosition.team?.department ? {
            id: effectivePosition.team.department.id,
            name: effectivePosition.team.department.name,
          } : null,
          team: effectivePosition.team ? {
            id: effectivePosition.team.id,
            name: effectivePosition.team.name,
          } : null,
          manager: effectivePosition.parent?.user ? {
            id: effectivePosition.parent.id,
            fullName: effectivePosition.parent.user.name || effectivePosition.parent.user.email || "Unknown",
          } : null,
          directReports,
          availabilityStatus,
          availabilityUpdatedAt: availabilityUpdatedAt ? availabilityUpdatedAt.toISOString() : null,
          availabilityStale: isAvailabilityStale(availabilityUpdatedAt, settings.availabilityStaleDays),
        };
      }
    }
    
    return null;
  }

  // Verify workspace ownership (security check)
  if (effectiveWorkspaceId && position.workspaceId !== effectiveWorkspaceId) {
    console.warn(`[getOrgPerson] Person ${personId} belongs to workspace ${position.workspaceId}, but requested workspace is ${effectiveWorkspaceId}`);
    return null;
  }

  // Get intelligence settings for staleness threshold
  // If table doesn't exist, use default settings (non-blocking)
  let settings: { availabilityStaleDays: number };
  try {
    settings = await getOrCreateIntelligenceSettings();
  } catch (error: any) {
    // If table doesn't exist, use default settings
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      console.warn("[getOrgPerson] Intelligence settings table not found, using defaults:", error.message);
      settings = { availabilityStaleDays: 30 }; // Default: 30 days
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  // Get derived availability (replaces legacy PersonAvailabilityHealth)
  const userId = position.userId;
  const wsId = position.workspaceId;

  // Fetch employment status
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: wsId, userId },
    },
    select: { employmentStatus: true },
  }).catch(() => null);
  const employmentStatus = (workspaceMember?.employmentStatus as EmploymentStatus) ?? "ACTIVE";

  // Fetch availability windows
  const availabilityWindows = await prisma.personAvailability.findMany({
    where: { personId: userId, workspaceId: wsId },
    select: {
      type: true,
      startDate: true,
      endDate: true,
      fraction: true,
      reason: true,
      expectedReturnDate: true,
      updatedAt: true,
    },
  }).catch(() => []);

  // Get latest update timestamp
  const latestUpdate = availabilityWindows.reduce<Date | null>((latest, w) => {
    if (!latest) return w.updatedAt;
    return w.updatedAt && w.updatedAt > latest ? w.updatedAt : latest;
  }, null);

  // Convert to AvailabilityWindow format
  const windows: AvailabilityWindow[] = availabilityWindows.map((w) => ({
    type: w.type === "UNAVAILABLE" ? "unavailable" : "partial",
    startDate: w.startDate,
    endDate: w.endDate ?? undefined,
    fraction: w.fraction ?? undefined,
    reason: w.reason as AvailabilityWindow["reason"],
    expectedReturnDate: w.expectedReturnDate ?? undefined,
  }));

  // Derive availability
  const derived = derivePersonAvailability({
    personId: userId,
    employmentStatus,
    windows,
  });

  // Map derived status to DTO format
  let availabilityStatus: OrgPersonDTO["availabilityStatus"] = "UNKNOWN";
  if (derived.effectiveCapacity === 1) {
    availabilityStatus = "AVAILABLE";
  } else if (derived.effectiveCapacity > 0) {
    availabilityStatus = "PARTIALLY_AVAILABLE";
  } else if (employmentStatus === "ACTIVE" || employmentStatus === "CONTRACTOR") {
    availabilityStatus = "UNAVAILABLE";
  } else {
    availabilityStatus = "UNKNOWN";
  }

  const availability = { updatedAt: latestUpdate };

  // Map direct reports (children) to DTO format
  const directReports = (position.children || [])
    .filter((child) => child.user)
    .map((child) => ({
      id: child.id,
      fullName: child.user!.name || child.user!.email || "Unknown",
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const availabilityUpdatedAt = availability?.updatedAt ? availability.updatedAt : null;
  return {
    id: position.id,
    fullName: position.user.name || position.user.email || "Unknown",
    email: position.user.email,
    title: position.title,
    department: position.team?.department ? {
      id: position.team.department.id,
      name: position.team.department.name,
    } : null,
    team: position.team ? {
      id: position.team.id,
      name: position.team.name,
    } : null,
    manager: position.parent?.user ? {
      id: position.parent.id,
      fullName: position.parent.user.name || position.parent.user.email || "Unknown",
    } : null,
    directReports,
    availabilityStatus,
    availabilityUpdatedAt: availabilityUpdatedAt ? availabilityUpdatedAt.toISOString() : null,
    availabilityStale: isAvailabilityStale(availabilityUpdatedAt, settings.availabilityStaleDays),
  };
}

