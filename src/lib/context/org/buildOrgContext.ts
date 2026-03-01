// src/lib/context/org/buildOrgContext.ts

import type { OrgContextData, OrgContextObject } from "./orgContextTypes";

/**
 * Minimal input required to construct an OrgContextObject.
 * Later, a loader will gather these values from Prisma + QA/health.
 */
export interface OrgContextInput {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceDescription?: string | null;

  departmentsCount: number;
  teamsCount: number;
  positionsCount: number;
  filledPositionsCount: number;
  peopleCount: number;

  // Initial structural flags (can be derived from counts or QA).
  hasRoleCards?: boolean;

  // Optional preset health label/notes (can be refined by health engine later).
  healthStatusLabel?: OrgContextData["healthSummary"]["statusLabel"];
  healthNotes?: string | null;

  // Optional tags
  tags?: string[];
}

/**
 * Pure builder to construct an OrgContextObject from OrgContextInput.
 * No DB access, no side effects.
 */
export function buildOrgContext(input: OrgContextInput): OrgContextObject {
  const {
    workspaceId,
    workspaceName,
    workspaceSlug,
    workspaceDescription = null,
    departmentsCount,
    teamsCount,
    positionsCount,
    filledPositionsCount,
    peopleCount,
    hasRoleCards = false,
    healthStatusLabel = "unknown",
    healthNotes = null,
    tags = [],
  } = input;

  const data: OrgContextData = {
    org: {
      workspaceId,
      name: workspaceName,
      slug: workspaceSlug,
      description: workspaceDescription,
    },
    metrics: {
      departmentsCount,
      teamsCount,
      positionsCount,
      filledPositionsCount,
      peopleCount,
    },
    structureSignals: {
      hasDepartments: departmentsCount > 0,
      hasTeams: teamsCount > 0,
      hasPositions: positionsCount > 0,
      hasOrgChart:
        departmentsCount > 0 || teamsCount > 0 || positionsCount > 0,
      hasRoleCards,
    },
    healthSummary: {
      statusLabel: healthStatusLabel,
      notes: healthNotes,
    },
    tags,
    meta: {},
  };

  const context: OrgContextObject = {
    contextId: workspaceId,
    workspaceId,
    type: "org",
    title: `${workspaceName} – Org Context`,
    summary: "Org-level structural and health context snapshot for Loopbrain.",
    data,
    capturedAt: new Date().toISOString(),
  };

  return context;
}

