// src/lib/context/org/buildTeamContext.ts

import type { TeamContextData, TeamContextObject } from "./teamContextTypes";

/**
 * Minimal input required to construct a TeamContextObject.
 * A loader will gather these values from Prisma later.
 */
export interface TeamContextInput {
  workspaceId: string;

  teamId: string;
  teamName: string;
  teamDescription?: string | null;
  teamColor?: string | null;
  teamOrder?: number | null;
  teamIsActive: boolean;

  departmentId?: string | null;
  departmentName?: string | null;

  positionsCount: number;
  filledPositionsCount: number;
  peopleCount: number;

  projectsCount: number;
  activeTasksCount: number;
  blockedTasksCount: number;

  // Optional health flags and notes
  healthStatusLabel?: TeamContextData["healthSummary"]["statusLabel"];
  healthNotes?: string | null;

  // Optional tags
  tags?: string[];
}

/**
 * Pure builder to construct a TeamContextObject from TeamContextInput.
 * No DB access, no side effects.
 */
export function buildTeamContext(
  input: TeamContextInput
): TeamContextObject {
  const {
    workspaceId,
    teamId,
    teamName,
    teamDescription = null,
    teamColor = null,
    teamOrder = null,
    teamIsActive,
    departmentId = null,
    departmentName = null,
    positionsCount,
    filledPositionsCount,
    peopleCount,
    projectsCount,
    activeTasksCount,
    blockedTasksCount,
    healthStatusLabel = "unknown",
    healthNotes = null,
    tags = [],
  } = input;

  const isSinglePersonTeam = peopleCount === 1;

  const data: TeamContextData = {
    team: {
      id: teamId,
      workspaceId,
      departmentId,
      name: teamName,
      description: teamDescription,
      color: teamColor,
      order: teamOrder,
      isActive: teamIsActive,
    },
    department: {
      id: departmentId,
      name: departmentName,
    },
    structure: {
      positionsCount,
      filledPositionsCount,
      peopleCount,
    },
    workload: {
      projectsCount,
      activeTasksCount,
      blockedTasksCount,
    },
    structureSignals: {
      hasPositions: positionsCount > 0,
      hasPeople: peopleCount > 0,
      isSinglePersonTeam,
    },
    healthSummary: {
      statusLabel: healthStatusLabel,
      notes: healthNotes,
    },
    tags: [
      "team",
      `team_id:${teamId}`,
      departmentId ? `department_id:${departmentId}` : "department:unknown",
      `positions:${positionsCount}`,
      `filled_positions:${filledPositionsCount}`,
      `people:${peopleCount}`,
      `projects:${projectsCount}`,
      `active_tasks:${activeTasksCount}`,
      `blocked_tasks:${blockedTasksCount}`,
      isSinglePersonTeam ? "single_person_team:true" : "single_person_team:false",
      ...tags,
    ],
    meta: {},
  };

  const context: TeamContextObject = {
    contextId: teamId,
    workspaceId,
    type: "team",
    title: `${teamName} – Team Context`,
    summary:
      "Team-level structural, workload, and health context snapshot for Loopbrain.",
    data,
    capturedAt: new Date().toISOString(),
  };

  return context;
}

