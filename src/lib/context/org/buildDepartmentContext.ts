// src/lib/context/org/buildDepartmentContext.ts

import type {
  DepartmentContextData,
  DepartmentContextObject,
} from "./departmentContextTypes";

/**
 * Minimal input required to construct a DepartmentContextObject.
 * A loader will gather these values from Prisma.
 */
export interface DepartmentContextInput {
  workspaceId: string;

  departmentId: string;
  departmentName: string;
  departmentDescription?: string | null;
  departmentColor?: string | null;
  departmentOrder?: number | null;
  departmentIsActive: boolean;

  teamsCount: number;
  positionsCount: number;
  filledPositionsCount: number;
  peopleCount: number;

  // Optional precomputed health/notes if available
  healthStatusLabel?: DepartmentContextData["healthSummary"]["statusLabel"];
  healthNotes?: string | null;

  // Optional tags
  tags?: string[];
}

/**
 * Pure builder to construct a DepartmentContextObject from DepartmentContextInput.
 * No DB access, no side effects.
 */
export function buildDepartmentContext(
  input: DepartmentContextInput
): DepartmentContextObject {
  const {
    workspaceId,
    departmentId,
    departmentName,
    departmentDescription = null,
    departmentColor = null,
    departmentOrder = null,
    departmentIsActive,
    teamsCount,
    positionsCount,
    filledPositionsCount,
    peopleCount,
    healthStatusLabel = "unknown",
    healthNotes = null,
    tags = [],
  } = input;

  const data: DepartmentContextData = {
    department: {
      id: departmentId,
      workspaceId,
      name: departmentName,
      description: departmentDescription,
      color: departmentColor,
      order: departmentOrder,
      isActive: departmentIsActive,
    },
    structure: {
      teamsCount,
      positionsCount,
      filledPositionsCount,
      peopleCount,
    },
    structureSignals: {
      hasTeams: teamsCount > 0,
      hasPositions: positionsCount > 0,
      hasPeople: peopleCount > 0,
      hasOrgChartNodes:
        teamsCount > 0 || positionsCount > 0 || peopleCount > 0,
    },
    healthSummary: {
      statusLabel: healthStatusLabel,
      notes: healthNotes,
    },
    tags: [
      "department",
      `department_id:${departmentId}`,
      `teams:${teamsCount}`,
      `positions:${positionsCount}`,
      `filled_positions:${filledPositionsCount}`,
      `people:${peopleCount}`,
      ...tags,
    ],
    meta: {},
  };

  const context: DepartmentContextObject = {
    contextId: departmentId,
    workspaceId,
    type: "department",
    title: `${departmentName} – Department Context`,
    summary:
      "Department-level structural and health context snapshot for Loopbrain.",
    data,
    capturedAt: new Date().toISOString(),
  };

  return context;
}

