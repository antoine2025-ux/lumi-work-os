// src/lib/context/org/personContextTypes.ts

import type { BaseContextObject } from "../types";

/**
 * PersonContextData – semantic, person-level context that
 * Loopbrain will use to reason about an individual's role,
 * relationships, and workload in the organization.
 */
export interface PersonContextData {
  person: {
    id: string; // user.id
    workspaceId: string;
    name: string | null;
    email: string;
    image?: string | null;
    title?: string | null; // primary role/position title
    level?: number | null; // org level if known
    joinedAt?: string | null; // ISO date when joined (if known)
    isActive: boolean;
  };

  position: {
    id: string | null; // OrgPosition.id
    title: string | null;
    level: number | null;
    teamId: string | null;
    departmentId: string | null;
  };

  manager: {
    id: string | null;
    name: string | null;
  };

  team: {
    id: string | null;
    name: string | null;
  };

  department: {
    id: string | null;
    name: string | null;
  };

  reporting: {
    directReportsCount: number;
    totalReportsCount: number; // future-friendly, can stay 0 for now
    spanOfControlRisk: "unknown" | "low" | "medium" | "high";
  };

  workload: {
    activeProjectsCount: number;
    activeTasksCount: number;
    blockedTasksCount: number;
    recentlyUpdatedTasksCount: number;
  };

  responsibilities: {
    summary: string | null; // short description from role/position
    responsibilities: string[]; // key bullets or tags
    keyMetrics: string[]; // "owns OKRs", "NPS", "SLAs", etc.
  };

  relationships: {
    managerId: string | null;
    directReportIds: string[];
    peerIds: string[];
    teamId: string | null;
    departmentId: string | null;
  };

  healthSummary: {
    statusLabel: "unknown" | "balanced" | "overloaded" | "underutilized" | "risky";
    notes?: string | null;
  };

  tags: string[];

  meta?: Record<string, unknown>;
}

/**
 * Concrete ContextObject type for person-level context (type = "person").
 */
export type PersonContextObject = BaseContextObject & {
  type: "person";
  data: PersonContextData;
};

