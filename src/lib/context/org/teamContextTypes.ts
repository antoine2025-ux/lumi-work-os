// src/lib/context/org/teamContextTypes.ts

import type { BaseContextObject } from "../types";

/**
 * TeamContextData – semantic, team-level context that
 * Loopbrain will use to reason about structure, coverage,
 * and health of a single team.
 */
export interface TeamContextData {
  team: {
    id: string;
    workspaceId: string;
    departmentId: string | null;
    name: string;
    description?: string | null;
    color?: string | null;
    order?: number | null;
    isActive: boolean;
  };

  department: {
    id: string | null;
    name: string | null;
  };

  // Basic structure within this team
  structure: {
    positionsCount: number;
    filledPositionsCount: number;
    peopleCount: number;
  };

  // Basic workload / ownership hints (can be enriched later)
  workload: {
    projectsCount: number;
    activeTasksCount: number;
    blockedTasksCount: number;
  };

  // Signals about how "complete" this team is
  structureSignals: {
    hasPositions: boolean;
    hasPeople: boolean;
    isSinglePersonTeam: boolean;
  };

  // Early-stage health summary (to be refined by the health engine)
  healthSummary: {
    statusLabel: "unknown" | "incomplete" | "ok" | "healthy" | "risky";
    notes?: string | null;
  };

  // Team-specific tags for Loopbrain
  tags: string[];

  // Free-form metadata for future extensions
  meta?: Record<string, unknown>;
}

/**
 * Concrete ContextObject type for team-level context (type = "team").
 */
export type TeamContextObject = BaseContextObject & {
  type: "team";
  data: TeamContextData;
};

