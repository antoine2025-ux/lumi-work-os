// src/lib/context/org/roleContextTypes.ts

import type { BaseContextObject } from "../types";

/**
 * RoleContextData – semantic, position/role-level context that
 * Loopbrain will use to reason about structure, responsibilities,
 * and who should own what.
 *
 * This is centered on OrgPosition + RoleCard.
 */
export interface RoleContextData {
  role: {
    id: string; // OrgPosition.id (primary identifier)
    workspaceId: string;
    title: string;
    level: number | null;
    description: string | null;
    jobFamily: string | null; // from RoleCard if present
    roleCardId: string | null; // RoleCard.id if linked
    isActive: boolean;
  };

  orgPlacement: {
    teamId: string | null;
    teamName: string | null;
    departmentId: string | null;
    departmentName: string | null;
    parentRoleId: string | null; // parent OrgPosition.id
    childRoleIds: string[]; // child OrgPosition.id[]
  };

  reporting: {
    reportsToRoleId: string | null; // alias for parentRoleId
    expectedTeamSize: number | null; // desired teamSize from OrgPosition
    actualTeamSize: number | null; // actual holders / reports (computed later)
    spanOfControlHint: string | null; // human-readable hint (optional)
  };

  holders: {
    primaryHolderId: string | null; // userId
    primaryHolderName: string | null;
    activeHolderIds: string[]; // all active users mapped to this role
    isVacant: boolean;
    isSinglePoint: boolean; // exactly one holder
  };

  responsibilities: {
    summary: string | null; // short human-readable summary
    responsibilities: string[]; // bullets
    decisionRights: string[]; // RACI / decision-level bullets
    keyMetrics: string[]; // key KPIs/OKRs
    requiredSkills: string[];
    preferredSkills: string[];
  };

  risk: {
    riskLevel: "unknown" | "low" | "medium" | "high";
    reasons: string[];
  };

  tags: string[];

  meta?: Record<string, unknown>;
}

/**
 * Concrete ContextObject type for role/position-level context (type = "role").
 */
export type RoleContextObject = BaseContextObject & {
  type: "role";
  data: RoleContextData;
};

