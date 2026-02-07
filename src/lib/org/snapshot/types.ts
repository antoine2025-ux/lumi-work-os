/**
 * Org Semantic Snapshot v0 - Type definitions
 *
 * Machine contract for Loopbrain consumption. NOT a UI model.
 * All arrays must be deterministic-sorted. No unstructured blobs.
 *
 * Blocker enums are append-only; meanings must never change.
 * If semantics evolve, introduce a new enum value.
 */

/** Readiness blockers. Append-only; meanings never change. */
export type OrgReadinessBlocker =
  | "NO_ACTIVE_PEOPLE"
  | "NO_TEAMS"
  | "OWNERSHIP_INCOMPLETE"
  | "NO_DECISION_DOMAINS"
  | "CAPACITY_COVERAGE_BELOW_MIN"
  | "RESPONSIBILITY_PROFILES_MISSING"
  | "WORK_CANNOT_EVALUATE_BASELINE";

/** Standard coverage metric with count, total, and percentage. */
export type OrgCoverageMetric = {
  count: number;
  total: number;
  /** 0–100 */
  pct: number;
};

/** Ownership: coverage and conflicts as separate signals. */
export type OrgOwnershipCoverage = {
  /** 0–100. Answers "Is something owned?" */
  coveragePct: number;
  /** Answers "Is ownership clean?" */
  conflictCount: number;
};

export type RoleSemanticSummary = {
  roleType: string;
  peopleCount: number;
  hasProfile: boolean;
};

export type DecisionDomainSemanticSummary = {
  key: string;
  name: string;
  /** primaryPersonId set OR primaryRoleType resolves to ≥1 active person */
  hasPrimary: boolean;
  /** escalationSteps.length > 0 */
  hasCoverage: boolean;
};

export type CapacitySemanticSummary = {
  configuredCount: number;
  totalPeople: number;
  pctConfigured: number;
  issueCount: number;
};

export type ResponsibilitySemanticSummary = {
  profileCount: number;
  distinctRoleTypes: number;
  pctCovered: number;
};

export type WorkSemanticSummary = {
  openCount: number;
  byRecommendationAction: Record<string, number>;
  unacknowledgedCount: number;
};

export type IssueSemanticSummary = {
  total: number;
  countsBySeverity: { error: number; warning: number; info: number };
  topIssueIds: string[];
  topIssueTypes?: string[];
};

export type OrgSemanticSnapshotV0 = {
  schemaVersion: "v0";
  generatedAt: string;
  workspaceId: string;

  readiness: {
    isAnswerable: boolean;
    blockers: OrgReadinessBlocker[];
  };

  coverage: {
    ownership: OrgOwnershipCoverage;
    capacity: OrgCoverageMetric;
    responsibilityProfiles: OrgCoverageMetric;
    decisionDomains: OrgCoverageMetric;
  };

  roles: RoleSemanticSummary[];
  decisionDomains: DecisionDomainSemanticSummary[];

  capacity: CapacitySemanticSummary;
  responsibility: ResponsibilitySemanticSummary;
  decisions: { domains: DecisionDomainSemanticSummary[] };

  work: WorkSemanticSummary;

  issues: IssueSemanticSummary;
};
