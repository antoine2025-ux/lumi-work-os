// src/lib/context/org/buildOrgWorkspaceContext.ts

import type { BaseContextObject } from "../types";
import type {
  OrgWorkspaceContextData,
  OrgWorkspaceContextObject,
} from "./types";

// Minimal input needed to build a workspace-level org context.
// Later we'll add a loader that gathers these values from Prisma.
export interface OrgWorkspaceContextInput {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceDescription?: string | null;

  departmentsCount?: number;
  teamsCount?: number;
  positionsCount?: number;
  filledPositionsCount?: number;
  peopleCount?: number;
}

// Build an OrgWorkspaceContextObject from basic input values.
// This function is PURE: no DB calls, no side effects.
export function buildOrgWorkspaceContext(
  input: OrgWorkspaceContextInput
): OrgWorkspaceContextObject {
  const {
    workspaceId,
    workspaceName,
    workspaceSlug,
    workspaceDescription = null,
    departmentsCount = 0,
    teamsCount = 0,
    positionsCount = 0,
    filledPositionsCount = 0,
    peopleCount = 0,
  } = input;

  const data: OrgWorkspaceContextData = {
    workspace: {
      id: workspaceId,
      name: workspaceName,
      slug: workspaceSlug,
      description: workspaceDescription,
    },
    orgStructure: {
      departmentsCount,
      teamsCount,
      positionsCount,
      filledPositionsCount,
      peopleCount,
    },
    quickFacts: {
      hasOrgChart:
        departmentsCount > 0 || teamsCount > 0 || positionsCount > 0,
      hasDepartments: departmentsCount > 0,
      hasTeams: teamsCount > 0,
      hasPositions: positionsCount > 0,
    },
    meta: {},
  };

  const base: BaseContextObject = {
    contextId: workspaceId,
    workspaceId,
    type: "workspace",
    title: `${workspaceName} – Org Overview`,
    summary: "Workspace-level org context snapshot for Loopbrain.",
    data,
    capturedAt: new Date().toISOString(),
  };

  return base as OrgWorkspaceContextObject;
}

