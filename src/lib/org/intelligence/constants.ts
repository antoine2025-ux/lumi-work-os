/**
 * Intelligence Issue Type Constants (Shared)
 *
 * Stable arrays mapping issue types to sections.
 * Shared between server and client code.
 * Single source of truth for issue type grouping.
 */

import type { OrgIssue } from "@/lib/org/deriveIssues";

// ============================================================================
// Issue Type Groups
// ============================================================================

/**
 * Ownership-related issue types
 */
export const OWNERSHIP_ISSUE_TYPES: OrgIssue[] = [
  "OWNERSHIP_CONFLICT",
  "UNOWNED_TEAM",
  "UNOWNED_DEPARTMENT",
  "UNASSIGNED_TEAM",
  "EMPTY_DEPARTMENT",
  "ORPHAN_ENTITY",
];

/**
 * Capacity & Availability issue types (Phase G + Capacity v1)
 */
export const CAPACITY_ISSUE_TYPES: OrgIssue[] = [
  "OVERALLOCATED_PERSON",
  "LOW_EFFECTIVE_CAPACITY",
  "NO_AVAILABLE_COVER",
  "SINGLE_POINT_OF_FAILURE",
  "UNAVAILABLE_OWNER",
  "CAPACITY_CONTRACT_CONFLICT",
  // Capacity v1: Team-level and missing-data issues
  "CAPACITY_MISSING_DATA_PERSON",
  "CAPACITY_OVERLOADED_TEAM",
  "CAPACITY_SEVERELY_OVERLOADED_TEAM",
  "CAPACITY_UNDERUTILIZED_TEAM",
  "CAPACITY_TEAM_NO_MEMBERS",
];

/**
 * Work Intake issue types (Phase H)
 */
export const WORK_ISSUE_TYPES: OrgIssue[] = [
  "WORK_NOT_STAFFABLE",
  "WORK_CAPACITY_GAP",
  "WORK_ROLE_MISMATCH",
  "WORK_NO_DECISION_DOMAIN",
];

/**
 * Role Responsibility issue types (Phase K)
 */
export const RESPONSIBILITY_ISSUE_TYPES: OrgIssue[] = [
  "ROLE_ALIGNMENT_UNKNOWN",
  "WORK_ROLE_MISALIGNED",
  "ROLE_PROFILE_MISSING",
  "FORBIDDEN_RESPONSIBILITY_CONFLICT",
];

/**
 * Decision Authority issue types (Phase I)
 */
export const DECISION_ISSUE_TYPES: OrgIssue[] = [
  "DECISION_AUTHORITY_MISSING",
  "DECISION_AUTHORITY_ROLE_UNRESOLVABLE",
  "DECISION_AUTHORITY_PRIMARY_UNAVAILABLE",
  "DECISION_DOMAIN_NO_COVERAGE",
];

/**
 * Impact & Dependency issue types (Phase J)
 */
export const IMPACT_ISSUE_TYPES: OrgIssue[] = [
  "WORK_IMPACT_UNDEFINED",
  "HIGH_IMPACT_SINGLE_OWNER",
  "DECISION_DOMAIN_IMPACTED",
];

/**
 * Structure-related issue types (person/position level)
 */
export const STRUCTURE_ISSUE_TYPES: OrgIssue[] = [
  "MISSING_MANAGER",
  "MISSING_TEAM",
  "MISSING_ROLE",
  "MANAGER_INTENTIONALLY_ABSENT",
  "TEAM_INTENTIONALLY_ABSENT",
  "ORPHAN_POSITION",
  "CYCLE_DETECTED",
];

// ============================================================================
// Section Keys
// ============================================================================

export type IntelligenceSection =
  | "ownership"
  | "capacity"
  | "work"
  | "responsibility"
  | "decisions"
  | "impact"
  | "structure"
  | "unknown";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the section key for a given issue type
 */
export function getIssueSection(issueType: OrgIssue): IntelligenceSection {
  if (OWNERSHIP_ISSUE_TYPES.includes(issueType)) return "ownership";
  if (CAPACITY_ISSUE_TYPES.includes(issueType)) return "capacity";
  if (WORK_ISSUE_TYPES.includes(issueType)) return "work";
  if (RESPONSIBILITY_ISSUE_TYPES.includes(issueType)) return "responsibility";
  if (DECISION_ISSUE_TYPES.includes(issueType)) return "decisions";
  if (IMPACT_ISSUE_TYPES.includes(issueType)) return "impact";
  if (STRUCTURE_ISSUE_TYPES.includes(issueType)) return "structure";
  return "unknown";
}
