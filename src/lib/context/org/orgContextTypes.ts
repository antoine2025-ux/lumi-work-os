// src/lib/context/org/orgContextTypes.ts

import type { BaseContextObject } from "../types";

/**
 * OrgContextData – semantic, org-wide context that Loopbrain will use
 * to reason about the structure, health, and coverage of the organization.
 *
 * This is a more "semantic" layer than the workspace snapshot:
 * - It focuses on org-level metrics and status
 * - It can include QA/health signals later
 */
export interface OrgContextData {
  org: {
    workspaceId: string;
    name: string;
    slug: string;
    description?: string | null;
  };

  // High-level metrics about the org model.
  metrics: {
    departmentsCount: number;
    teamsCount: number;
    positionsCount: number;
    filledPositionsCount: number;
    peopleCount: number;
  };

  // Structural signals that help Loopbrain understand how "complete"
  // the org representation is. These will be wired to QA/health later.
  structureSignals: {
    hasDepartments: boolean;
    hasTeams: boolean;
    hasPositions: boolean;
    hasOrgChart: boolean;
    hasRoleCards: boolean;
  };

  // Simple health-like flags (initially stubbed; later sourced from QA/health engine).
  healthSummary: {
    statusLabel: "unknown" | "incomplete" | "ok" | "healthy" | "risky";
    notes?: string | null;
  };

  // Placeholder for any org-level tags Loopbrain may care about.
  tags: string[];

  // Free-form metadata for future extensions (versioning, sources, etc.)
  meta?: Record<string, unknown>;
}

/**
 * Concrete ContextObject type for org-level context (type = "org").
 */
export type OrgContextObject = BaseContextObject & {
  type: "org";
  data: OrgContextData;
};

