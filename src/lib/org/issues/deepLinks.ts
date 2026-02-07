/**
 * Canonical deep-link generators for issue Fix CTAs.
 *
 * Ownership rule: ALL issue fix URLs must be generated via this module.
 * No issue may inline hardcoded routes (e.g. "/org/structure") directly.
 * This prevents drift when routes evolve.
 */

import type { OrgIssue } from "@/lib/org/deriveIssues";

// ---------------------------------------------------------------------------
// Structure deep links
// ---------------------------------------------------------------------------

/** Open the "Assign Department" panel for a specific unassigned team. */
export function deepLinkForUnassignedTeam(teamId: string): string {
  return `/org/structure?tab=teams&teamId=${encodeURIComponent(teamId)}&panel=assignDepartment`;
}

/** Navigate to a specific team detail page (for ownership, capacity, etc.). */
export function deepLinkForTeam(teamId: string): string {
  return `/org/structure/teams/${encodeURIComponent(teamId)}`;
}

/** Navigate to a specific department detail page. */
export function deepLinkForDepartment(departmentId: string): string {
  return `/org/structure/departments/${encodeURIComponent(departmentId)}`;
}

/** Navigate to the structure page with the teams tab and a team highlighted. */
export function deepLinkForTeamInStructure(teamId: string): string {
  return `/org/structure?tab=teams&teamId=${encodeURIComponent(teamId)}`;
}

// ---------------------------------------------------------------------------
// People deep links
// ---------------------------------------------------------------------------

/** Open the Capacity Quick Entry popover for a specific person. */
export function deepLinkForPersonCapacity(personId: string): string {
  return `/org/people?person=${encodeURIComponent(personId)}&openCapacity=true`;
}

// ---------------------------------------------------------------------------
// Work deep links
// ---------------------------------------------------------------------------

/** Navigate to a specific work request's detail/feasibility page. */
export function deepLinkForWorkRequest(workRequestId: string): string {
  return `/org/work/${encodeURIComponent(workRequestId)}`;
}

// ---------------------------------------------------------------------------
// Decision & Responsibility deep links
// ---------------------------------------------------------------------------

/** Navigate to decision authority settings, auto-focusing a specific domain. */
export function deepLinkForDecisionDomain(domainKey: string): string {
  return `/org/settings/decision-authority?domain=${encodeURIComponent(domainKey)}`;
}

/** Navigate to responsibility settings, auto-focusing a specific role profile. */
export function deepLinkForResponsibilityProfile(roleType: string): string {
  return `/org/settings/responsibility?roleType=${encodeURIComponent(roleType)}`;
}

// ---------------------------------------------------------------------------
// Generic
// ---------------------------------------------------------------------------

/** Navigate to the Issues page, optionally pre-filtered by severity. */
export function deepLinkForIssues(severity?: string): string {
  if (severity) {
    return `/org/issues?severity=${encodeURIComponent(severity)}`;
  }
  return `/org/issues`;
}

// ---------------------------------------------------------------------------
// W1.5: Recommendation-aware deep links (issue type filters)
// ---------------------------------------------------------------------------

/** Navigate to Issues page pre-filtered to specific issue types. */
export function deepLinkForIssuesByTypes(types: OrgIssue[]): string {
  if (types.length === 0) {
    return `/org/issues`;
  }
  return `/org/issues?types=${types.map(encodeURIComponent).join(",")}`;
}

/** Issues page filtered to ownership-related issues. */
export function deepLinkForOwnershipIssues(): string {
  return deepLinkForIssuesByTypes([
    "UNOWNED_TEAM",
    "UNOWNED_DEPARTMENT",
    "OWNERSHIP_CONFLICT",
  ]);
}

/** Issues page filtered to capacity-related issues. */
export function deepLinkForCapacityIssues(): string {
  return deepLinkForIssuesByTypes([
    "OVERALLOCATED_PERSON",
    "LOW_EFFECTIVE_CAPACITY",
    "CAPACITY_CONTRACT_CONFLICT",
  ]);
}

/** Issues page filtered to decision authority issues. */
export function deepLinkForDecisionIssues(): string {
  return deepLinkForIssuesByTypes([
    "DECISION_AUTHORITY_MISSING",
    "DECISION_DOMAIN_NO_COVERAGE",
  ]);
}

/** Issues page filtered to role responsibility/alignment issues. */
export function deepLinkForResponsibilityIssues(): string {
  return deepLinkForIssuesByTypes([
    "ROLE_ALIGNMENT_UNKNOWN",
    "WORK_ROLE_MISALIGNED",
    "ROLE_PROFILE_MISSING",
  ]);
}
