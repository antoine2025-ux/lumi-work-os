// src/lib/context/org/departmentContextTypes.ts

import type { BaseContextObject } from "../types";

/**
 * DepartmentContextData – semantic, department-level context that
 * Loopbrain will use to reason about structure, coverage, and health
 * of a single department.
 */
export interface DepartmentContextData {
  department: {
    id: string;
    workspaceId: string;
    name: string;
    description?: string | null;
    color?: string | null;
    order?: number | null;
    isActive: boolean;
  };

  // Basic org structure within this department
  structure: {
    teamsCount: number;
    positionsCount: number;
    filledPositionsCount: number;
    peopleCount: number;
  };

  // Signals about how "complete" this department is, structurally
  structureSignals: {
    hasTeams: boolean;
    hasPositions: boolean;
    hasPeople: boolean;
    hasOrgChartNodes: boolean;
  };

  // Early-stage health summary (will later be connected to the health engine)
  healthSummary: {
    statusLabel: "unknown" | "incomplete" | "ok" | "healthy" | "risky";
    notes?: string | null;
  };

  // Department-specific tags for Loopbrain
  tags: string[];

  // Free-form metadata for future extensions
  meta?: Record<string, unknown>;
}

/**
 * Concrete ContextObject type for department-level context (type = "department").
 */
export type DepartmentContextObject = BaseContextObject & {
  type: "department";
  data: DepartmentContextData;
};

