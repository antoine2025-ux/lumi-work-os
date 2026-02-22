/**
 * Write services for Org Structure (Departments and Teams).
 * 
 * IMPORTANT: These services require workspaceId to be passed explicitly
 * since OrgDepartment/OrgTeam are not in WORKSPACE_SCOPED_MODELS.
 */

import { prisma } from "@/lib/db";

export async function createDepartment(input: { name: string; workspaceId: string; ownerPersonId?: string | null }) {
  // Create department
  const department = await prisma.orgDepartment.create({
    data: { name: input.name, workspaceId: input.workspaceId },
    select: { id: true, name: true },
  });

  // If ownerPersonId is provided, create OwnerAssignment
  if (input.ownerPersonId) {
    // Resolve ownerPersonId to userId if it's a positionId
    let userId: string = input.ownerPersonId;
    
    const position = await prisma.orgPosition.findFirst({
      where: { 
        id: input.ownerPersonId, 
        workspaceId: input.workspaceId,
        isActive: true 
      },
      select: { userId: true },
    });
    
    if (position?.userId) {
      userId = position.userId;
    } else {
      // Verify it's a valid userId in the workspace
      const userPosition = await prisma.orgPosition.findFirst({
        where: {
          userId: input.ownerPersonId,
          workspaceId: input.workspaceId,
          isActive: true
        },
        select: { userId: true },
      });

      if (!userPosition) {
        throw new Error(`Person not found or does not belong to this workspace`);
      }
    }

    // Create owner assignment (use raw SQL to avoid enum type issues)
    try {
      await prisma.ownerAssignment.create({
        data: {
          workspaceId: input.workspaceId,
          entityType: "DEPARTMENT",
          entityId: department.id,
          entityLabel: department.name,
          ownerPersonId: userId,
          isPrimary: true,
        },
      });
    } catch (error: unknown) {
      // If enum doesn't exist, use raw SQL
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("OwnedEntityType") || errorMessage.includes("does not exist")) {
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO owner_assignments (id, workspace_id, entity_type, entity_id, entity_label, owner_person_id, is_primary, created_at, updated_at)
             VALUES (gen_random_uuid()::text, $1::text, $2::text, $3::text, $4::text, $5::text, true, NOW(), NOW())`,
            input.workspaceId,
            'DEPARTMENT',
            department.id,
            department.name,
            userId
          );
        } catch (rawError: unknown) {
          console.warn("[createDepartment] Could not create owner assignment:", rawError instanceof Error ? rawError.message : rawError);
          // Continue without owner assignment if table doesn't exist
        }
      } else {
        throw error;
      }
    }
  }

  return department;
}

export async function createTeam(input: { name: string; departmentId: string | null; workspaceId: string }) {
  // departmentId is optional - teams can be unassigned (departmentId: null)
  // This is a valid first-class state, not a configuration error
  const departmentId = input.departmentId ?? null;
  
  return prisma.orgTeam.create({
    data: { name: input.name, departmentId, workspaceId: input.workspaceId },
    select: { id: true, name: true, departmentId: true },
  });
}

export async function setTeamOwner(input: { teamId: string; ownerPersonId: string | null; workspaceId: string }) {
  // Step 1: Validate team exists in workspace
  const team = await prisma.orgTeam.findFirst({
    where: { 
      id: input.teamId,
      workspaceId: input.workspaceId,
      isActive: true
    },
    select: { id: true, name: true },
  });

  if (!team) {
    throw new Error(`Team not found or does not belong to this workspace`);
  }

  // Step 2: Resolve ownerPersonId to userId if needed
  // ownerPersonId can be either a userId or a positionId
  // If it's a positionId, we need to look up the userId
  let userId: string | null = input.ownerPersonId;
  
  if (userId) {
    // Try to find if it's a position ID first (must be in same workspace)
    const position = await prisma.orgPosition.findFirst({
      where: { 
        id: userId, 
        workspaceId: input.workspaceId,
        isActive: true 
      },
      select: { userId: true },
    });
    
    if (position?.userId) {
      userId = position.userId;
    } else {
      // If not found as position, verify it's a valid userId in the workspace
      // Check if there's a position with this userId in the workspace
      const userPosition = await prisma.orgPosition.findFirst({
        where: {
          userId: userId,
          workspaceId: input.workspaceId,
          isActive: true
        },
        select: { userId: true },
      });

      if (!userPosition) {
        throw new Error(`Person not found or does not belong to this workspace`);
      }
      // userId is already correct, no need to change it
    }
  }
  
  // Step 3: Update team owner
  return prisma.orgTeam.update({
    where: { id: input.teamId },
    data: { ownerPersonId: userId },
    select: { id: true, ownerPersonId: true },
  });
}

// Note: Team membership is managed via OrgPosition.teamId.
// We update the person's position to add/remove them from teams.
// personId is the OrgPosition ID (as returned by the structure read service)
export async function addTeamMember(input: { teamId: string; personId: string; workspaceId: string }) {
  // Step 1: Validate team exists in workspace
  const team = await prisma.orgTeam.findFirst({
    where: { 
      id: input.teamId,
      workspaceId: input.workspaceId,
      isActive: true
    },
    select: { id: true, name: true },
  });

  if (!team) {
    throw new Error(`Team not found or does not belong to this workspace`);
  }

  // Step 2: Verify the position exists, is active, and belongs to the workspace
  const position = await prisma.orgPosition.findFirst({
    where: { 
      id: input.personId,
      workspaceId: input.workspaceId,
      isActive: true 
    },
    select: { id: true },
  });

  if (!position) {
    throw new Error(`Person does not have an active position in this workspace`);
  }

  // Step 3: Update position to add to team
  const updated = await prisma.orgPosition.update({
    where: { id: input.personId },
    data: { teamId: input.teamId },
    select: { id: true },
  });

  // Return in a format compatible with the expected return type
  return { id: updated.id };
}

export async function removeTeamMember(input: { teamId: string; personId: string; workspaceId: string }) {
  // Step 1: Validate team exists in workspace
  const team = await prisma.orgTeam.findFirst({
    where: { 
      id: input.teamId,
      workspaceId: input.workspaceId,
      isActive: true
    },
    select: { id: true, name: true },
  });

  if (!team) {
    throw new Error(`Team not found or does not belong to this workspace`);
  }

  // Step 2: Verify the position exists, is active, belongs to this team, and belongs to the workspace
  const position = await prisma.orgPosition.findFirst({
    where: { 
      id: input.personId,
      teamId: input.teamId,
      workspaceId: input.workspaceId,
      isActive: true 
    },
    select: { id: true },
  });

  if (!position) {
    // Return success (idempotent) - person is not a member of this team
    return { count: 0 };
  }

  // Step 3: Remove from team
  return prisma.orgPosition.updateMany({
    where: { 
      id: input.personId,
      workspaceId: input.workspaceId
    },
    data: { teamId: null },
  });
}

