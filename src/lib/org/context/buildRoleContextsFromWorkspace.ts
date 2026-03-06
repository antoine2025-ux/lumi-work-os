// src/lib/org/context/buildRoleContextsFromWorkspace.ts

import { prisma } from "@/lib/db";
import { buildRoleContext, type RoleContextSource } from "./buildRoleContext";
import type { RoleContext } from "./roleContextTypes";

/**
 * Build RoleContexts for all roles in a workspace.
 * This loads RoleCards and OrgPositions from Prisma and merges them into unified RoleContexts.
 * 
 * For now, this is read-only and used for inspection.
 * In L6 Step 2, we'll convert these into ContextItems.
 */
export async function buildRoleContextsFromWorkspace(
  workspaceId: string
): Promise<RoleContext[]> {
  if (!workspaceId) {
    throw new Error("buildRoleContextsFromWorkspace: workspaceId is required");
  }

  // Load all active OrgPositions with related data
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
    include: {
      team: {
        include: {
          department: true,
        },
      },
      parent: true,
      jobDescription: {
        select: { id: true, title: true, summary: true, level: true },
      },
    },
  });

  // Load all RoleCards for this workspace
  const roleCards = await prisma.roleCard.findMany({
    where: {
      workspaceId,
    },
    include: {
      position: {
        include: {
          team: {
            include: {
              department: true,
            },
          },
          parent: true,
          jobDescription: {
            select: { id: true, title: true, summary: true, level: true },
          },
        },
      },
    },
  });

  const roleContexts: RoleContext[] = [];

  // Build RoleContexts from OrgPositions
  for (const position of positions) {
    const team = position.team ?? null;
    const department = team?.department ?? null;
    const parentPosition = position.parent ?? null;

    const source: RoleContextSource = {
      workspaceId,
      position,
      roleCard: null, // Will be merged if RoleCard exists
      team,
      department,
      parentPosition,
      jobDescription: position.jobDescription ?? null,
    };

    const ctx = buildRoleContext(source);
    if (ctx) {
      roleContexts.push(ctx);
    }
  }

  // Build RoleContexts from RoleCards (merge with positions if linked)
  for (const roleCard of roleCards) {
    const position = roleCard.position ?? null;
    const team = position?.team ?? null;
    const department = team?.department ?? null;
    const parentPosition = position?.parent ?? null;

    // Check if we already built a context for this position
    const existingIndex = roleContexts.findIndex(
      (ctx) => ctx.id === position?.id
    );

    if (existingIndex >= 0 && position) {
      // Merge RoleCard data into existing context
      const existing = roleContexts[existingIndex];
      roleContexts[existingIndex] = {
        ...existing,
        sourceType: "orgPosition", // Keep orgPosition as source since position exists
        title: roleCard.roleName || existing.title,
        level: roleCard.level || existing.level,
        jobFamily: roleCard.jobFamily || existing.jobFamily,
        roleDescription: roleCard.roleDescription || existing.roleDescription,
        responsibilities: [
          ...existing.responsibilities,
          ...(roleCard.responsibilities ?? []),
        ],
        requiredSkills: [
          ...existing.requiredSkills,
          ...(roleCard.requiredSkills ?? []),
        ],
        preferredSkills: [
          ...existing.preferredSkills,
          ...(roleCard.preferredSkills ?? []),
        ],
        keyMetrics: [
          ...existing.keyMetrics,
          ...(roleCard.keyMetrics ?? []),
        ],
        // Merge manager-authored context from RoleCard
        roleInOrg: roleCard.roleInOrg ?? existing.roleInOrg,
        focusArea: roleCard.focusArea ?? existing.focusArea,
        managerNotes: roleCard.managerNotes ?? existing.managerNotes,
      };
    } else {
      // Build new context from RoleCard
      const source: RoleContextSource = {
        workspaceId,
        roleCard,
        position,
        team,
        department,
        parentPosition,
        jobDescription: position?.jobDescription ?? null,
      };

      const ctx = buildRoleContext(source);
      if (ctx) {
        roleContexts.push(ctx);
      }
    }
  }

  // Log for debugging (dev-only)
  if (process.env.NODE_ENV === "development") {
    console.log(
      "[RoleContext] sample",
      roleContexts.slice(0, 3).map((r) => ({
        id: r.id,
        title: r.title,
        sourceType: r.sourceType,
        responsibilitiesCount: r.responsibilities.length,
        requiredSkillsCount: r.requiredSkills.length,
        keyMetricsCount: r.keyMetrics.length,
        teamId: r.teamId,
        departmentId: r.departmentId,
      }))
    );
  }

  return roleContexts;
}

