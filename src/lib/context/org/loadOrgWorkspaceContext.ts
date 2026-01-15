// src/lib/context/org/loadOrgWorkspaceContext.ts

import { prisma } from "@/lib/db";
import {
  buildOrgWorkspaceContext,
  type OrgWorkspaceContextInput,
} from "./buildOrgWorkspaceContext";

/**
 * Load the latest org workspace context for a given workspaceId
 * by querying Prisma for real counts.
 *
 * This is a pure loader: it does NOT write to ContextItem yet.
 */
export async function loadOrgWorkspaceContext(
  workspaceId: string
) {
  // 1) Load workspace basic info
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
  });

  if (!workspace) {
    throw new Error(
      `loadOrgWorkspaceContext: workspace not found (id=${workspaceId})`
    );
  }

  // 2) Compute org-related counts

  // Departments
  const departmentsCount = await prisma.orgDepartment.count({
    where: {
      workspaceId,
      isActive: true,
    },
  });

  // Teams
  const teamsCount = await prisma.orgTeam.count({
    where: {
      workspaceId,
      isActive: true,
    },
  });

  // Positions
  const positionsCount = await prisma.orgPosition.count({
    where: {
      workspaceId,
      isActive: true,
    },
  });

  // Filled positions (positions with a user assigned)
  const filledPositionsCount = await prisma.orgPosition.count({
    where: {
      workspaceId,
      isActive: true,
      userId: {
        not: null,
      },
    },
  });

  // People (users who are members of this workspace)
  const peopleCount = await prisma.workspaceMember.count({
    where: {
      workspaceId,
    },
  });

  const input: OrgWorkspaceContextInput = {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    workspaceDescription: workspace.description ?? null,
    departmentsCount,
    teamsCount,
    positionsCount,
    filledPositionsCount,
    peopleCount,
  };

  // 3) Build the context object using our in-memory builder
  return buildOrgWorkspaceContext(input);
}

