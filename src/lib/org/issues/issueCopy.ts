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
  
  // Phase G: Capacity & Availability issues
  capacity_contract_conflict: "This person has multiple overlapping capacity contracts.",
  unavailable_owner: "This entity's owner is currently unavailable.",
  overallocated_person: "This person's allocations exceed their available capacity.",
  low_effective_capacity: "This person has very limited available capacity.",
  no_available_cover: "No backup is available for this critical role.",
  single_point_of_failure: "Only one person can fulfill this critical function.",
  
  // Phase H: Work Intake issues
  work_not_staffable: "No viable candidates found to staff this work request.",
  work_capacity_gap: "Available capacity is less than the estimated effort required.",
  work_role_mismatch: "No candidates match the required role type for this work request.",
  work_no_decision_domain: "This work request has no decision domain configured.",
  
  // Phase I: Decision Authority issues
  decision_authority_missing: "No decision authority is configured for this domain.",
  decision_authority_role_unresolvable: "The configured role type could not be resolved to a person.",
  decision_authority_primary_unavailable: "The primary decision maker is unavailable in the requested time window.",
  decision_domain_no_coverage: "This decision domain has no backup coverage configured.",
  
  // Phase J: Impact & Dependency issues
  work_impact_undefined: "This work request has no explicit impacts defined.",
  high_impact_single_owner: "High-impact work has a single point of contact.",
  decision_domain_impacted: "This work affects a decision domain without escalation.",
  
  // Phase K: Role Alignment issues
  role_alignment_unknown: "Cannot determine role alignment for this work request.",
  work_role_misaligned: "This work request is misaligned with the assigned person's role.",
  role_profile_missing: "No responsibility profile is defined for this role type.",
  forbidden_responsibility_conflict: "This work requires a tag that is forbidden for the role.",

  // Structural issues (OrgIssue union types, lowercased)
  missing_manager: "This person has no manager assigned.",
  missing_team: "This person has no team assigned.",
  missing_role: "This person has no role assigned.",
  manager_intentionally_absent: "This person's manager absence is intentionally marked.",
  team_intentionally_absent: "This person's team absence is intentionally marked.",
  cycle_detected: "This person is part of a circular manager chain.",
  ownership_conflict: "This entity has conflicting ownership sources.",
  unowned_team: "This team has no owner assigned.",
  unowned_department: "This department has no owner assigned.",
  unassigned_team: "This team has no department assigned.",
  empty_department: "This department has no teams assigned.",
  orphan_entity: "This entity has no parent assigned.",

  // Capacity v1: Team-level and missing-data issues
  capacity_missing_data_person: "This person has no capacity data configured.",
  capacity_overloaded_team: "This team's members are collectively overloaded.",
  capacity_severely_overloaded_team: "This team's members are severely overloaded.",
  capacity_underutilized_team: "This team's members are collectively underutilized.",
  capacity_team_no_members: "This team has no active members assigned.",
  // Reserved for v1.1 (registered to avoid copy gaps)
  capacity_manager_overloaded: "This manager's direct reports exceed capacity thresholds.",
  capacity_team_donut: "This team has capacity but no incoming demand.",
  
  // Generic fallback
  unknown: "Issue details unavailable.",
};

/**
 * Outcome Hints - what fixing accomplishes (factual only)
 * 
 * Non-actionable, non-evaluative. No "risk", no "impact", no "should".
 */
export const ISSUE_OUTCOME_HINTS: Record<string, string> = {
  person_missing_manager: "Assigning a manager completes reporting hierarchy.",
  person_missing_team: "Assigning a team enables structure-based views.",
  person_missing_department: "Assigning a department groups this person correctly.",
  team_missing_owner: "Assigning an owner clarifies accountability.",
  department_missing_owner: "Assigning an owner clarifies accountability.",
  team_missing_department: "Assigning a department groups related teams.",
  
  // Phase G: Capacity & Availability outcomes
  capacity_contract_conflict: "Resolving contract conflict enables accurate capacity calculations.",
  unavailable_owner: "Assigning backup coverage ensures continuity.",
  overallocated_person: "Rebalancing allocations prevents burnout and missed commitments.",
  low_effective_capacity: "Clearing commitments or extending availability increases capacity.",
  no_available_cover: "Assigning backup personnel enables continuity.",
  single_point_of_failure: "Cross-training or hiring reduces single-point risk.",
  
  // Phase H: Work Intake outcomes
  work_not_staffable: "Adjusting constraints or timeline enables staffing.",
  work_capacity_gap: "Splitting work or extending timeline closes the capacity gap.",
  work_role_mismatch: "Broadening role requirements or hiring enables staffing.",
  work_no_decision_domain: "Assigning a decision domain enables authority routing and feasibility evaluation.",
  
  // Phase I: Decision Authority outcomes
  decision_authority_missing: "Configuring authority enables escalation and decision routing.",
  decision_authority_role_unresolvable: "Assigning a person to the role or updating configuration enables routing.",
  decision_authority_primary_unavailable: "Escalation paths or backup contacts ensure continuity.",
  decision_domain_no_coverage: "Adding escalation steps ensures continuity when the primary decider is unavailable.",
  
  // Phase J: Impact & Dependency outcomes
  work_impact_undefined: "Defining impacts enables blast radius visibility.",
  high_impact_single_owner: "Adding backup contacts reduces single-point risk.",
  decision_domain_impacted: "Configuring escalation ensures continuity.",
  
  // Phase K: Role Alignment outcomes
  role_alignment_unknown: "Adding work tags or role profiles enables alignment checking.",
  work_role_misaligned: "Adjusting assignment or work tags aligns work with capabilities.",
  role_profile_missing: "Creating a profile enables responsibility-based matching.",
  forbidden_responsibility_conflict: "Adjusting assignment or removing forbidden tag enables alignment.",

  // Structural issue outcomes
  missing_manager: "Assigning a manager completes reporting hierarchy.",
  missing_team: "Assigning a team enables structure-based views.",
  missing_role: "Assigning a role clarifies responsibilities.",
  ownership_conflict: "Resolving ownership conflict ensures consistent accountability.",
  unowned_team: "Assigning an owner clarifies team accountability.",
  unowned_department: "Assigning an owner clarifies department accountability.",
  unassigned_team: "Assigning a department groups related teams.",
  empty_department: "Adding teams to this department enables structure-based views.",
  orphan_entity: "Assigning a parent completes the hierarchy.",

  // Capacity v1 outcomes
  capacity_missing_data_person: "Configuring capacity data enables accurate workload calculations.",
  capacity_overloaded_team: "Rebalancing team allocations prevents burnout.",
  capacity_severely_overloaded_team: "Urgently rebalancing team allocations prevents burnout.",
  capacity_underutilized_team: "Increasing team allocation improves resource utilization.",
  capacity_team_no_members: "Assigning members enables team capacity calculations.",
  capacity_manager_overloaded: "Redistributing reports reduces management burden.",
  capacity_team_donut: "Assigning demand enables utilization tracking.",
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

/**
 * Get the outcome hint for an issue type (what fixing accomplishes).
 * Returns null if no hint is defined for the type.
 */
export function getIssueOutcomeHint(type: string): string | null {
  const normalizedType = type.toLowerCase();
  return ISSUE_OUTCOME_HINTS[normalizedType] ?? null;
}

/**
 * Resolution Explanations - past tense, factual, no interpretation
 * 
 * Explains why an issue is no longer active.
 */
export const ISSUE_RESOLUTION_EXPLANATIONS: Record<string, string> = {
  team_missing_owner: "An owner is now assigned to this team.",
  department_missing_owner: "An owner is now assigned to this department.",
  person_missing_manager: "A manager relationship is now defined.",
  person_missing_team: "A team is now assigned to this person.",
  person_missing_department: "A department is now assigned to this person's team.",
  team_missing_department: "A department is now assigned to this team.",
  manager_cycle: "The circular manager chain has been resolved.",
  orphan_position: "A person is now assigned to this position.",
  
  // Phase G: Capacity & Availability resolutions
  capacity_contract_conflict: "Conflicting contracts have been resolved.",
  unavailable_owner: "Owner is now available or backup has been assigned.",
  overallocated_person: "Allocations have been rebalanced within capacity.",
  low_effective_capacity: "Sufficient capacity is now available.",
  no_available_cover: "Backup coverage has been assigned.",
  single_point_of_failure: "Additional personnel can now cover this function.",
  
  // Phase H: Work Intake resolutions
  work_not_staffable: "Work request has been staffed or closed.",
  work_capacity_gap: "Capacity gap has been addressed.",
  work_role_mismatch: "Role requirements have been satisfied.",
  work_no_decision_domain: "A decision domain has been assigned to this work request.",
  
  // Phase I: Decision Authority resolutions
  decision_authority_missing: "Decision authority has been configured.",
  decision_authority_role_unresolvable: "Role can now be resolved to a person.",
  decision_authority_primary_unavailable: "Primary is now available or escalation is configured.",
  decision_domain_no_coverage: "Escalation steps have been configured for backup coverage.",
  
  // Phase J: Impact & Dependency resolutions
  work_impact_undefined: "Explicit impacts have been defined.",
  high_impact_single_owner: "Additional contacts have been assigned.",
  decision_domain_impacted: "Escalation has been configured for the domain.",
  
  // Phase K: Role Alignment resolutions
  role_alignment_unknown: "Work tags or role profile have been configured.",
  work_role_misaligned: "Assignment has been updated to an aligned candidate.",
  role_profile_missing: "A responsibility profile has been created for the role.",
  forbidden_responsibility_conflict: "Assignment or work tags have been adjusted.",

  // Structural issue resolutions
  missing_manager: "A manager relationship is now defined.",
  missing_team: "A team is now assigned to this person.",
  missing_role: "A role is now assigned to this person.",
  ownership_conflict: "Ownership conflict has been resolved.",
  unowned_team: "An owner is now assigned to this team.",
  unowned_department: "An owner is now assigned to this department.",
  unassigned_team: "A department is now assigned to this team.",
  empty_department: "Teams have been added to this department.",
  orphan_entity: "A parent is now assigned to this entity.",

  // Capacity v1 resolutions
  capacity_missing_data_person: "Capacity data has been configured for this person.",
  capacity_overloaded_team: "Team allocations have been rebalanced.",
  capacity_severely_overloaded_team: "Team allocations have been rebalanced.",
  capacity_underutilized_team: "Team allocation has been increased.",
  capacity_team_no_members: "Members have been assigned to this team.",
  capacity_manager_overloaded: "Reports have been redistributed.",
  capacity_team_donut: "Demand has been assigned to this team.",
};

/**
 * Get the resolution explanation for an issue type (why it's resolved).
 * Returns null if no explanation is defined for the type.
 */
export function getResolutionExplanation(type: string): string | null {
  const normalizedType = type.toLowerCase();
  return ISSUE_RESOLUTION_EXPLANATIONS[normalizedType] ?? null;
}

/**
 * Dev-only assertion: Warn if issue metadata is missing fix-surface fields.
 * 
 * Checks:
 * - fixUrl exists on the issue metadata object (warns if missing, but doesn't throw - some issues may route to Issues page)
 * - resolutionExplanation exists in ISSUE_RESOLUTION_EXPLANATIONS (warns if missing, but doesn't throw)
 * 
 * This function only runs in development mode and logs warnings to help catch
 * incomplete issue definitions during development. Not runtime enforcement.
 * 
 * Note: fixUrl is validated on the OrgIssueMetadata object itself (not in this file).
 * This function helps catch cases where issue metadata is missing fixUrl.
 * 
 * @param issue - The issue metadata object to validate (must include type and optional fixUrl)
 */
export function assertIssueIsFixable(issue: { type: string; fixUrl?: string }): void {
  if (process.env.NODE_ENV !== "development") {
    return; // Only run in dev mode
  }

  const normalizedType = issue.type.toLowerCase();
  const hasFixUrl = Boolean(issue.fixUrl);
  const hasResolutionExplanation = Boolean(getResolutionExplanation(issue.type));

  if (!hasFixUrl) {
    console.warn(
      `[Dev] Issue type "${issue.type}" is missing fixUrl in issue metadata. ` +
        "Some issues may intentionally route to the Issues page instead of a specific fix surface."
    );
  }

  if (!hasResolutionExplanation) {
    console.warn(
      `[Dev] Issue type "${issue.type}" is missing a resolution explanation in ISSUE_RESOLUTION_EXPLANATIONS. ` +
        "This may make it harder to explain why the issue was resolved."
    );
  }
}

