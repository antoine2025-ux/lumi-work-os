/**
 * Org Issues Derivation
 * 
 * Deterministic issue derivation from org state.
 * No storage, no mutation, no prioritization.
 * 
 * Golden Rule: Problems Are Views, Not States
 * 
 * Phase 1 Extensions:
 * - Extended issue types with intentional absence support
 * - Cycle detection for reporting chains
 * - Orphan position detection
 */

// Issue types that can be flagged for a person
export type OrgIssue =
  | "MISSING_MANAGER"
  | "MISSING_TEAM"
  | "MISSING_ROLE"
  | "MANAGER_INTENTIONALLY_ABSENT"
  | "TEAM_INTENTIONALLY_ABSENT"
  | "ORPHAN_POSITION"
  | "CYCLE_DETECTED";

// Extended person input type for issue derivation
export type PersonInput = {
  id: string;
  managerId?: string | null;
  team?: string | null;
  teamName?: string | null;
  teamId?: string | null;
  role?: string | null;
  title?: string | null;
  positionId?: string | null;
  // Phase 1: Intentional absence flags
  managerIntentionallyUnassigned?: boolean;
  teamIntentionallyUnassigned?: boolean;
};

// Extended issue result with metadata
export type PersonIssue = {
  type: OrgIssue;
  isIntentional: boolean;
  context?: Record<string, unknown>;
};

export type PersonIssues = {
  personId: string;
  issues: OrgIssue[];
  // Extended issue details with intentionality
  issueDetails: PersonIssue[];
};

/**
 * Derive issues for a list of people
 * 
 * @param people - Array of person objects with org data
 * @returns Array of PersonIssues for people with at least one issue
 */
export function deriveIssues(people: PersonInput[]): PersonIssues[] {
  return people
    .map(p => {
      const issues: OrgIssue[] = [];
      const issueDetails: PersonIssue[] = [];

      // Manager check with intentionality
      if (!p.managerId) {
        if (p.managerIntentionallyUnassigned) {
          issues.push("MANAGER_INTENTIONALLY_ABSENT");
          issueDetails.push({
            type: "MANAGER_INTENTIONALLY_ABSENT",
            isIntentional: true,
            context: { reason: "Marked as intentionally without manager" },
          });
        } else {
          issues.push("MISSING_MANAGER");
          issueDetails.push({
            type: "MISSING_MANAGER",
            isIntentional: false,
          });
        }
      }

      // Team check with intentionality
      if (!p.team && !p.teamName && !p.teamId) {
        if (p.teamIntentionallyUnassigned) {
          issues.push("TEAM_INTENTIONALLY_ABSENT");
          issueDetails.push({
            type: "TEAM_INTENTIONALLY_ABSENT",
            isIntentional: true,
            context: { reason: "Marked as intentionally without team" },
          });
        } else {
          issues.push("MISSING_TEAM");
          issueDetails.push({
            type: "MISSING_TEAM",
            isIntentional: false,
          });
        }
      }

      // Role check (no intentional absence for roles - always an issue)
      if (!p.role && !p.title) {
        issues.push("MISSING_ROLE");
        issueDetails.push({
          type: "MISSING_ROLE",
          isIntentional: false,
        });
      }

      return {
        personId: p.id,
        issues,
        issueDetails,
      };
    })
    .filter(r => r.issues.length > 0);
}

// Position input type for position-level issues
export type PositionInput = {
  id: string;
  userId?: string | null;
  parentId?: string | null;
  teamId?: string | null;
  title?: string | null;
  managerIntentionallyUnassigned?: boolean;
  teamIntentionallyUnassigned?: boolean;
};

export type PositionIssue = {
  type: OrgIssue;
  isIntentional: boolean;
  context?: Record<string, unknown>;
};

export type PositionIssues = {
  positionId: string;
  issues: OrgIssue[];
  issueDetails: PositionIssue[];
};

/**
 * Derive issues for positions (org structure)
 * 
 * @param positions - Array of position objects
 * @returns Array of PositionIssues for positions with at least one issue
 */
export function derivePositionIssues(positions: PositionInput[]): PositionIssues[] {
  return positions
    .map(pos => {
      const issues: OrgIssue[] = [];
      const issueDetails: PositionIssue[] = [];

      // Orphan position: no user assigned
      if (!pos.userId) {
        issues.push("ORPHAN_POSITION");
        issueDetails.push({
          type: "ORPHAN_POSITION",
          isIntentional: false,
          context: { positionTitle: pos.title },
        });
      }

      // Missing team with intentionality
      if (!pos.teamId) {
        if (pos.teamIntentionallyUnassigned) {
          issues.push("TEAM_INTENTIONALLY_ABSENT");
          issueDetails.push({
            type: "TEAM_INTENTIONALLY_ABSENT",
            isIntentional: true,
          });
        } else {
          issues.push("MISSING_TEAM");
          issueDetails.push({
            type: "MISSING_TEAM",
            isIntentional: false,
          });
        }
      }

      // Missing manager with intentionality
      if (!pos.parentId) {
        if (pos.managerIntentionallyUnassigned) {
          issues.push("MANAGER_INTENTIONALLY_ABSENT");
          issueDetails.push({
            type: "MANAGER_INTENTIONALLY_ABSENT",
            isIntentional: true,
          });
        } else {
          issues.push("MISSING_MANAGER");
          issueDetails.push({
            type: "MISSING_MANAGER",
            isIntentional: false,
          });
        }
      }

      return {
        positionId: pos.id,
        issues,
        issueDetails,
      };
    })
    .filter(r => r.issues.length > 0);
}

/**
 * Detect cycles in the reporting chain
 * 
 * @param positions - Array of positions with parentId relationships
 * @returns Array of position IDs that are part of a cycle
 */
export function detectReportingCycles(
  positions: { id: string; parentId?: string | null }[]
): { cyclePositionIds: string[]; cycleChains: string[][] } {
  const positionMap = new Map(positions.map(p => [p.id, p]));
  const cyclePositionIds = new Set<string>();
  const cycleChains: string[][] = [];

  for (const position of positions) {
    if (cyclePositionIds.has(position.id)) continue;

    const visited = new Set<string>();
    const chain: string[] = [];
    let current: string | null | undefined = position.id;

    while (current && !visited.has(current)) {
      visited.add(current);
      chain.push(current);
      const pos = positionMap.get(current);
      current = pos?.parentId;
    }

    // If we ended up at a position we've already visited in this chain, it's a cycle
    if (current && visited.has(current)) {
      const cycleStart = chain.indexOf(current);
      const cycleChain = chain.slice(cycleStart);
      cycleChain.forEach(id => cyclePositionIds.add(id));
      cycleChains.push(cycleChain);
    }
  }

  return {
    cyclePositionIds: Array.from(cyclePositionIds),
    cycleChains,
  };
}

/**
 * Get all issues including cycle detection
 * 
 * @param positions - Array of positions
 * @returns Combined issues with cycle detection
 */
export function deriveAllPositionIssues(positions: PositionInput[]): {
  positionIssues: PositionIssues[];
  cycles: { cyclePositionIds: string[]; cycleChains: string[][] };
} {
  const positionIssues = derivePositionIssues(positions);
  const cycles = detectReportingCycles(positions);

  // Add cycle issues to affected positions
  for (const positionId of cycles.cyclePositionIds) {
    const existingIssue = positionIssues.find(pi => pi.positionId === positionId);
    if (existingIssue) {
      existingIssue.issues.push("CYCLE_DETECTED");
      existingIssue.issueDetails.push({
        type: "CYCLE_DETECTED",
        isIntentional: false,
        context: { message: "Position is part of a circular reporting chain" },
      });
    } else {
      positionIssues.push({
        positionId,
        issues: ["CYCLE_DETECTED"],
        issueDetails: [{
          type: "CYCLE_DETECTED",
          isIntentional: false,
          context: { message: "Position is part of a circular reporting chain" },
        }],
      });
    }
  }

  return { positionIssues, cycles };
}

/**
 * Utility: Check if an issue type is intentional
 */
export function isIntentionalIssue(issueType: OrgIssue): boolean {
  return issueType === "MANAGER_INTENTIONALLY_ABSENT" || 
         issueType === "TEAM_INTENTIONALLY_ABSENT";
}

/**
 * Utility: Get non-intentional issues only (for actual problems)
 */
export function filterNonIntentionalIssues(issues: PersonIssues[]): PersonIssues[] {
  return issues
    .map(pi => ({
      ...pi,
      issues: pi.issues.filter(i => !isIntentionalIssue(i)),
      issueDetails: pi.issueDetails.filter(id => !id.isIntentional),
    }))
    .filter(pi => pi.issues.length > 0);
}

