// src/lib/context/org/loadOrgContext.ts

import { prisma } from "@/lib/db";
import { buildOrgContext, type OrgContextInput } from "./buildOrgContext";

/**
 * Load org-level context for a given workspaceId.
 *
 * This loader:
 *  - Fetches workspace info
 *  - Computes org metrics (departments/teams/positions/people)
 *  - Derives basic structure flags
 *  - (Optionally) stubs initial health label
 *  - Builds an OrgContextObject via buildOrgContext(...)
 */
export async function loadOrgContext(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("loadOrgContext: workspaceId is required");
  }

  // 1) Workspace basics
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
    throw new Error(`loadOrgContext: workspace not found (id=${workspaceId})`);
  }

  // 2) Org metrics (reuse the same counts we used for workspace-level context)

  const [
    departmentsCount,
    teamsCount,
    positionsCount,
    filledPositionsCount,
    peopleCount,
    roleCardsCount,
  ] = await Promise.all([
    prisma.orgDepartment.count({
      where: {
        workspaceId,
        isActive: true,
      },
    }),
    prisma.orgTeam.count({
      where: {
        workspaceId,
        isActive: true,
      },
    }),
    prisma.orgPosition.count({
      where: {
        workspaceId,
        isActive: true,
      },
    }),
    prisma.orgPosition.count({
      where: {
        workspaceId,
        isActive: true,
        userId: {
          not: null,
        },
      },
    }),
    prisma.workspaceMember.count({
      where: {
        workspaceId,
      },
    }),
    prisma.roleCard.count({
      where: {
        workspaceId,
      },
    }),
  ]);

  const hasRoleCards = roleCardsCount > 0;

  // 3) Derive initial health label (simple heuristic for now)
  const hasAnyStructure =
    departmentsCount > 0 || teamsCount > 0 || positionsCount > 0;

  const healthStatusLabel: OrgContextInput["healthStatusLabel"] =
    !hasAnyStructure
      ? "incomplete"
      : peopleCount === 0
      ? "incomplete"
      : "ok";

  const healthNotes =
    !hasAnyStructure
      ? "Org structure is not yet configured (no departments/teams/positions)."
      : peopleCount === 0
      ? "Org structure exists, but no people are assigned to this workspace yet."
      : "Org structure is present; detailed health will be refined by the health engine later.";

  const tags: string[] = [
    "org",
    `departments:${departmentsCount}`,
    `teams:${teamsCount}`,
    `positions:${positionsCount}`,
    `filled_positions:${filledPositionsCount}`,
    `people:${peopleCount}`,
  ];

  if (hasRoleCards) {
    tags.push("has_role_cards");
  }

  const input: OrgContextInput = {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    workspaceDescription: workspace.description ?? null,
    departmentsCount,
    teamsCount,
    positionsCount,
    filledPositionsCount,
    peopleCount,
    hasRoleCards,
    healthStatusLabel,
    healthNotes,
    tags,
  };

  // 4) Build org-level ContextObject
  return buildOrgContext(input);
}

