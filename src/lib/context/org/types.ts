// src/lib/context/org/types.ts

import type { BaseContextObject } from "../types";

// OrgWorkspaceContextData – structured payload for workspace-level org snapshot.
// This is what Loopbrain will "think over" when reasoning about an entire workspace.
export interface OrgWorkspaceContextData {
  workspace: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  };

  // High-level structure metrics.
  // For now these may be zeroed or stubbed; later steps wire real counts.
  orgStructure: {
    departmentsCount: number;
    teamsCount: number;
    positionsCount: number;
    filledPositionsCount: number;
    peopleCount: number;
  };

  // Quick flags that make it easy to reason about coverage.
  quickFacts: {
    hasOrgChart: boolean;
    hasDepartments: boolean;
    hasTeams: boolean;
    hasPositions: boolean;
  };

  // Free-form metadata for future expansion.
  meta?: Record<string, unknown>;
}

// Concrete ContextObject type for workspace-level org context.
export type OrgWorkspaceContextObject = BaseContextObject & {
  data: OrgWorkspaceContextData;
};

