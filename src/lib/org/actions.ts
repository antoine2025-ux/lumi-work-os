"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";


export async function updateDepartment(input: {
  departmentId: string;
  name: string;
  ownerPersonId?: string | null;
}) {
  const name = input.name?.trim();
  if (!name) {
    return { ok: false as const, error: "Department name is required." };
  }

  try {
    await prisma.orgDepartment.update({
      where: { id: input.departmentId },
      data: {
        name,
        ownerPersonId: input.ownerPersonId ?? null,
      },
    });

    revalidatePath("/org/structure");
    revalidatePath(`/org/structure/departments/${input.departmentId}`);

    return { ok: true as const };
  } catch (e: unknown) {
    return {
      ok: false as const,
      error: "Could not save changes. Please try again.",
      details:
        process.env.NODE_ENV !== "production"
          ? { prismaError: e instanceof Error ? e.message : String(e) }
          : undefined,
    };
  }
}

type CreateTeamInput = {
  name: string;
  ownerId?: string | null;
  departmentId?: string | null;
};

export async function createTeam(input: CreateTeamInput) {
  const name = input.name?.trim();
  if (!name) {
    return { ok: false as const, error: "Team name is required." };
  }

  try {
    // Get workspace context for permission check
    const context = await getOrgPermissionContext();
    if (!context) {
      return { ok: false as const, error: "Unauthorized. Please ensure you are logged in." };
    }

    const workspaceId = context.workspaceId;

    if (!prisma) {
      return { ok: false as const, error: "Database connection unavailable." };
    }

    // departmentId is optional - teams can be unassigned (departmentId: null)
    // This is a valid first-class state, not a configuration error
    const departmentId = input.departmentId ?? null;
    
    if (departmentId) {
      // Verify department exists in workspace if provided
      const department = await prisma.orgDepartment.findFirst({
        where: {
          id: departmentId,
          workspaceId,
          isActive: true,
        },
      });

      if (!department) {
        return { ok: false as const, error: "Department not found." };
      }
    }

    // Resolve ownerId to userId if needed (teams use ownerPersonId directly)
    let ownerPersonId: string | null = null;
    if (input.ownerId) {
      // Check if it's a positionId or userId
      const position = await prisma.orgPosition.findFirst({
        where: { 
          id: input.ownerId, 
          workspaceId,
          isActive: true 
        },
        select: { userId: true },
      });
      
      if (position?.userId) {
        ownerPersonId = position.userId;
      } else {
        // Verify it's a valid userId in the workspace
        const userPosition = await prisma.orgPosition.findFirst({
          where: {
            userId: input.ownerId,
            workspaceId,
            isActive: true
          },
          select: { userId: true },
        });

        if (userPosition) {
          ownerPersonId = input.ownerId;
        } else {
          return { ok: false as const, error: "Person not found or does not belong to this workspace." };
        }
      }
    }

    // Create team
    const team = await prisma.orgTeam.create({
      data: {
        name,
        workspaceId,
        departmentId,
        ownerPersonId,
      },
      select: { id: true, departmentId: true },
    });

    revalidatePath("/org/structure");
    if (team.departmentId) {
      revalidatePath(`/org/structure/departments/${team.departmentId}`);
    }

    return { ok: true as const, teamId: team.id };
  } catch (e: unknown) {
    console.error("[createTeam] Error:", e);
    const message = e instanceof Error ? e.message : "";
    return {
      ok: false as const,
      error:
        message.includes("Foreign key") || message.includes("constraint")
          ? "Could not create the team with the selected owner/department. Try again."
          : message || "Could not create team. Please try again.",
    };
  }
}

