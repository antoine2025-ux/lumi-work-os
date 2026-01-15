/**
 * Write services for Org People.
 * 
 * IMPORTANT: These services assume Prisma is already workspace-scoped
 * via setWorkspaceContext(workspaceId) in the calling route handler.
 * However, workspaceId must be explicitly passed for create operations
 * to ensure database truth compliance.
 * 
 * NOTE: This codebase uses OrgPosition model (not OrgPerson).
 * People are represented as OrgPosition records with userId linking to User.
 */

import { prisma } from "@/lib/db";

export type UpsertOrgPersonInput = {
  personId?: string; // OrgPosition ID for updates
  userId?: string; // User ID to link to (for creating new person)
  fullName: string;
  email: string | null;
  title: string | null;
  departmentId: string | null;
  teamId: string | null;
  managerId?: string | null;
  workspaceId: string; // Required for create operations
};

/**
 * Create a new person by creating/updating User and OrgPosition.
 * If userId is provided, links to existing User. Otherwise creates new User.
 */
export async function createOrgPerson(input: UpsertOrgPersonInput) {
  let userId = input.userId;

  // If no userId provided, create a new User
  if (!userId) {
    // Generate a unique email if none provided
    let email = input.email;
    if (!email) {
      const baseEmail = `${input.fullName.toLowerCase().replace(/\s+/g, '.')}@org.local`;
      email = baseEmail;
      
      // Check if email exists and append a number to make it unique
      let counter = 1;
      while (true) {
        const existing = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (!existing) break;
        email = `${input.fullName.toLowerCase().replace(/\s+/g, '.')}.${counter}@org.local`;
        counter++;
        // Safety limit to prevent infinite loop
        if (counter > 1000) {
          // Fallback to timestamp-based email
          email = `${input.fullName.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@org.local`;
          break;
        }
      }
    }
    
    // Use raw SQL to avoid Prisma trying to insert into non-existent columns (skills, bio, etc.)
    // This is a workaround for schema/database mismatch - proper fix is to run migrations
    try {
      const user = await prisma.user.create({
        data: {
          email,
          name: input.fullName,
        },
        select: { id: true },
      });
      userId = user.id;
    } catch (prismaError: any) {
      // Fallback to raw SQL if Prisma fails due to schema mismatch
      if (prismaError?.code === 'P2022' || prismaError?.message?.includes('does not exist')) {
        const { randomBytes } = await import('crypto');
        const cuid = 'c' + Date.now().toString(36) + randomBytes(4).toString('hex');
        const escapedEmail = email.replace(/'/g, "''");
        const escapedName = input.fullName.replace(/'/g, "''");
        
        // Use raw SQL INSERT with ON CONFLICT to handle duplicate emails
        const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
          INSERT INTO users (id, email, name, "createdAt", "updatedAt")
          VALUES ('${cuid}', '${escapedEmail}', '${escapedName}', NOW(), NOW())
          ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `);
        
        if (result && result.length > 0) {
          userId = result[0].id;
        } else {
          // If no result (shouldn't happen), fetch the user by email
          const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
          });
          if (existingUser) {
            userId = existingUser.id;
          } else {
            throw new Error('Failed to create user');
          }
        }
      } else {
        throw prismaError;
      }
    }
  } else {
    // Update existing User if needed
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.fullName,
        email: input.email || undefined,
      },
    });
  }

  // Create OrgPosition (explicitly attach workspaceId for database truth compliance)
  // Use raw SQL to avoid Prisma trying to insert into non-existent columns (responsibilities, requiredSkills, etc.)
  let position: { id: string; userId: string | null };
  try {
    const created = await prisma.orgPosition.create({
      data: {
        workspaceId: input.workspaceId,
        userId,
        title: input.title,
        teamId: input.teamId,
        parentId: input.managerId || null,
        isActive: true,
      },
      select: { id: true, userId: true },
    });
    position = created;
  } catch (prismaError: any) {
    // Fallback to raw SQL if Prisma fails due to schema mismatch
    if (prismaError?.code === 'P2022' || prismaError?.message?.includes('does not exist')) {
      const { randomBytes } = await import('crypto');
      const cuid = 'c' + Date.now().toString(36) + randomBytes(4).toString('hex');
      // Note: title might be required (NOT NULL), so provide a default if missing
      const titleValue = input.title || input.fullName || 'Untitled Position';
      const escapedTitle = titleValue.replace(/'/g, "''");
      const escapedWorkspaceId = input.workspaceId.replace(/'/g, "''");
      const escapedUserId = userId.replace(/'/g, "''");
      const escapedTeamId = input.teamId ? input.teamId.replace(/'/g, "''") : null;
      const escapedParentId = input.managerId ? input.managerId.replace(/'/g, "''") : null;
      
      // Use raw SQL INSERT - only insert columns that exist in the database
      const result = await prisma.$queryRawUnsafe<Array<{ id: string; userId: string | null }>>(`
        INSERT INTO org_positions (id, "workspaceId", "userId", title, "teamId", "parentId", "isActive", "createdAt", "updatedAt", "level", "order")
        VALUES ('${cuid}', '${escapedWorkspaceId}', '${escapedUserId}', '${escapedTitle}', ${escapedTeamId ? `'${escapedTeamId}'` : 'NULL'}, ${escapedParentId ? `'${escapedParentId}'` : 'NULL'}, true, NOW(), NOW(), 1, 0)
        RETURNING id, "userId"
      `);
      
      if (result && result.length > 0) {
        position = result[0];
      } else {
        throw new Error('Failed to create org position');
      }
    } else {
      throw prismaError;
    }
  }

  return { id: position.id, userId: position.userId || '' };
}

/**
 * Update an existing person (OrgPosition).
 */
export async function updateOrgPerson(
  personId: string,
  input: UpsertOrgPersonInput
) {
  // Get the existing position to find userId
  const existing = await prisma.orgPosition.findUnique({
    where: { id: personId },
    select: { userId: true },
  });

  if (!existing || !existing.userId) {
    throw new Error("Person not found or not linked to a user");
  }

  // Update User if name/email changed
  if (input.fullName || input.email) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: {
        ...(input.fullName && { name: input.fullName }),
        ...(input.email !== null && { email: input.email }),
      },
    });
  }

  // Update OrgPosition
  const position = await prisma.orgPosition.update({
    where: { id: personId },
    data: {
      title: input.title ?? undefined,
      teamId: input.teamId ?? undefined,
      parentId: input.managerId !== undefined ? input.managerId : undefined,
    },
    select: { id: true, userId: true },
  });

  return { id: position.id, userId: position.userId };
}

/**
 * Set the manager (reporting line) for a person.
 */
export async function setOrgPersonManager(
  personId: string,
  managerId: string | null
) {
  console.log("[setOrgPersonManager] Called with:", { personId, managerId });
  
  // First, find the person's position to validate it exists
  const personPosition = await prisma.orgPosition.findUnique({
    where: { id: personId },
    select: { id: true, userId: true, workspaceId: true },
  });

  if (!personPosition) {
    console.error("[setOrgPersonManager] Person position not found:", personId);
    throw new Error("Person not found");
  }
  
  console.log("[setOrgPersonManager] Found person position:", personPosition);

  // If managerId is provided, validate and convert to position ID if needed
  let managerPositionId: string | null = null;
  if (managerId) {
    console.log("[setOrgPersonManager] Looking for manager:", managerId);
    
    // Check if managerId is a position ID or userId
    // Try to find by position ID first
    let managerPosition = await prisma.orgPosition.findFirst({
      where: {
        id: managerId,
        workspaceId: personPosition.workspaceId,
        isActive: true,
      },
      select: { id: true, userId: true },
    });

    // If not found by position ID, try by userId
    if (!managerPosition) {
      console.log("[setOrgPersonManager] Manager not found by position ID, trying userId");
      managerPosition = await prisma.orgPosition.findFirst({
        where: {
          userId: managerId,
          workspaceId: personPosition.workspaceId,
          isActive: true,
        },
        select: { id: true, userId: true },
      });
    }

    if (!managerPosition) {
      console.error("[setOrgPersonManager] Manager not found:", { managerId, workspaceId: personPosition.workspaceId });
      throw new Error("Manager not found or does not belong to the same workspace");
    }
    
    console.log("[setOrgPersonManager] Found manager position:", managerPosition);

    // Prevent self-assignment (check both position ID and userId)
    if (managerPosition.id === personId) {
      throw new Error("Manager cannot be self");
    }
    if (managerPosition.userId && personPosition.userId && managerPosition.userId === personPosition.userId) {
      throw new Error("Manager cannot be self");
    }

    managerPositionId = managerPosition.id;
  } else {
    console.log("[setOrgPersonManager] Clearing manager (managerId is null)");
  }

  // Update the person's position with the manager's position ID
  console.log("[setOrgPersonManager] Updating position:", { personId, parentId: managerPositionId });
  try {
    const updated = await prisma.orgPosition.update({
      where: { id: personId },
      data: { parentId: managerPositionId },
      select: { id: true, parentId: true, userId: true },
    });
    
    console.log("[setOrgPersonManager] Successfully updated:", updated);
    
    return {
      id: updated.id,
      managerId: updated.parentId,
      userId: updated.userId,
    };
  } catch (error: any) {
    console.error("[setOrgPersonManager] Database update failed:", error);
    throw error;
  }
}

