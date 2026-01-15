/**
 * Issue Type Copy Mapping
 * 
 * Deterministic, factual explanations for each issue type.
 * One sentence max, no impact language.
 */

export const ISSUE_TYPE_COPY: Record<string, string> = {
  // Person issues
  person_missing_team: "This person has no team assigned.",
  person_missing_department: "This person's team has no department assigned.",
  person_missing_manager: "This person has no manager assigned.",
  
  // Team issues
  team_missing_department: "This team has no department assigned.",
  team_missing_owner: "This team has no owner assigned.",
  
  // Department issues
  department_missing_owner: "This department has no owner assigned.",
  
  // Structural issues
  manager_cycle: "This person is part of a circular manager chain.",
  orphan_position: "This position has no person assigned.",
  
  // Generic fallback
  unknown: "Issue details unavailable.",
};

/**
 * Get the detection rule explanation for an issue type.
 */
export function getIssueExplanation(type: string): string {
  const normalizedType = type.toLowerCase();
  return ISSUE_TYPE_COPY[normalizedType] ?? ISSUE_TYPE_COPY.unknown;
}

/**
 * Get a human-readable label for an issue type.
 */
export function getIssueTypeLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

