// src/lib/context/org/buildPersonContext.ts

import type {
  PersonContextData,
  PersonContextObject,
} from "./personContextTypes";

/**
 * Minimal input required to construct a PersonContextObject.
 * A loader will gather these values from Prisma later.
 */
export interface PersonContextInput {
  workspaceId: string;

  // Person core
  userId: string;
  name: string | null;
  email: string;
  image?: string | null;
  isActive: boolean;
  joinedAt?: string | null;

  // Position / role
  positionId?: string | null;
  positionTitle?: string | null;
  positionLevel?: number | null;
  teamId?: string | null;
  teamName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;

  // Manager & reporting
  managerId?: string | null;
  managerName?: string | null;
  directReportIds?: string[];
  totalReportsCount?: number | null;

  // Workload
  activeProjectsCount?: number | null;
  activeTasksCount?: number | null;
  blockedTasksCount?: number | null;
  recentlyUpdatedTasksCount?: number | null;

  // Responsibilities / metrics
  responsibilitiesSummary?: string | null;
  responsibilities?: string[];
  keyMetrics?: string[];

  // Relationships
  peerIds?: string[];

  // Health
  healthStatusLabel?: PersonContextData["healthSummary"]["statusLabel"];
  healthNotes?: string | null;

  // Optional tags
  tags?: string[];
}

/**
 * Pure builder to construct a PersonContextObject from PersonContextInput.
 * No DB access, no side effects.
 */
export function buildPersonContext(
  input: PersonContextInput
): PersonContextObject {
  const {
    workspaceId,
    userId,
    name,
    email,
    image = null,
    isActive,
    joinedAt = null,
    positionId = null,
    positionTitle = null,
    positionLevel = null,
    teamId = null,
    teamName = null,
    departmentId = null,
    departmentName = null,
    managerId = null,
    managerName = null,
    directReportIds = [],
    totalReportsCount = null,
    activeProjectsCount = 0,
    activeTasksCount = 0,
    blockedTasksCount = 0,
    recentlyUpdatedTasksCount = 0,
    responsibilitiesSummary = null,
    responsibilities = [],
    keyMetrics = [],
    peerIds = [],
    healthStatusLabel = "unknown",
    healthNotes = null,
    tags = [],
  } = input;

  // Span-of-control heuristic – refined later by health engine
  const directReportsCount = directReportIds.length;
  let spanOfControlRisk: PersonContextData["reporting"]["spanOfControlRisk"] =
    "unknown";

  if (directReportsCount === 0) {
    spanOfControlRisk = "low";
  } else if (directReportsCount <= 5) {
    spanOfControlRisk = "low";
  } else if (directReportsCount <= 8) {
    spanOfControlRisk = "medium";
  } else {
    spanOfControlRisk = "high";
  }

  const data: PersonContextData = {
    person: {
      id: userId,
      workspaceId,
      name,
      email,
      image,
      title: positionTitle,
      level: positionLevel,
      joinedAt,
      isActive,
    },
    position: {
      id: positionId,
      title: positionTitle,
      level: positionLevel ?? null,
      teamId: teamId ?? null,
      departmentId: departmentId ?? null,
    },
    manager: {
      id: managerId,
      name: managerName ?? null,
    },
    team: {
      id: teamId ?? null,
      name: teamName ?? null,
    },
    department: {
      id: departmentId ?? null,
      name: departmentName ?? null,
    },
    reporting: {
      directReportsCount,
      totalReportsCount: totalReportsCount ?? directReportsCount,
      spanOfControlRisk,
    },
    workload: {
      activeProjectsCount: activeProjectsCount ?? 0,
      activeTasksCount: activeTasksCount ?? 0,
      blockedTasksCount: blockedTasksCount ?? 0,
      recentlyUpdatedTasksCount: recentlyUpdatedTasksCount ?? 0,
    },
    responsibilities: {
      summary: responsibilitiesSummary,
      responsibilities,
      keyMetrics,
    },
    relationships: {
      managerId,
      directReportIds,
      peerIds,
      teamId: teamId ?? null,
      departmentId: departmentId ?? null,
    },
    healthSummary: {
      statusLabel: healthStatusLabel,
      notes: healthNotes,
    },
    tags: [
      "person",
      `user_id:${userId}`,
      isActive ? "active:true" : "active:false",
      positionTitle ? `role:${positionTitle}` : "role:unknown",
      teamId ? `team_id:${teamId}` : "team:unknown",
      departmentId ? `department_id:${departmentId}` : "department:unknown",
      `projects:${activeProjectsCount ?? 0}`,
      `tasks_active:${activeTasksCount ?? 0}`,
      `tasks_blocked:${blockedTasksCount ?? 0}`,
      ...tags,
    ],
    meta: {},
  };

  const displayName = name || email;

  const context: PersonContextObject = {
    contextId: userId,
    workspaceId,
    type: "person",
    title: `${displayName} – Person Context`,
    summary:
      "Person-level role, relationships, and workload context snapshot for Loopbrain.",
    data,
    capturedAt: new Date().toISOString(),
  };

  return context;
}

