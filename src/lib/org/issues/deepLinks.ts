/**
 * Canonical deep-link generators for issue Fix CTAs.
 *
 * Ownership rule: ALL issue fix URLs must be generated via this module.
 * No issue may inline hardcoded routes (e.g. "/org/structure") directly.
 * This prevents drift when routes evolve.
 * 
 * All functions now accept workspaceSlug to generate workspace-scoped URLs.
 */

import type { OrgIssue } from "@/lib/org/deriveIssues";

/**
 * Build workspace-scoped org base URL
 */
function buildOrgBase(workspaceSlug: string): string {
  return `/w/${workspaceSlug}/org`;
}

// ---------------------------------------------------------------------------
// Structure deep links
// ---------------------------------------------------------------------------

/** Open the "Assign Department" panel for a specific unassigned team. */
export function deepLinkForUnassignedTeam(workspaceSlug: string, teamId: string): string {
  const base = buildOrgBase(workspaceSlug);
  return `${base}/structure?tab=teams&teamId=${encodeURIComponent(teamId)}&panel=assignDepartment`;
}

/** Navigate to a specific team detail page (for ownership, capacity, etc.). */
export function deepLinkForTeam(workspaceSlug: string, teamId: string): string {
  const base = buildOrgBase(workspaceSlug);
  return `${base}/structure/teams/${encodeURIComponent(teamId)}`;
}

/** Navigate to a specific department detail page. */
export function deepLinkForDepartment(workspaceSlug: string, departmentId: string): string {
  const base = buildOrgBase(workspaceSlug);
  return `${base}/structure/departments/${encodeURIComponent(departmentId)}`;
}

/** Navigate to the structure page with the teams tab and a team highlighted. */
export function deepLinkForTeamInStructure(workspaceSlug: string, teamId: string): string {
  const base = buildOrgBase(workspaceSlug);
  return `${base}/structure?tab=teams&teamId=${encodeURIComponent(teamId)}`;
}

// ---------------------------------------------------------------------------
// People deep links
// ---------------------------------------------------------------------------

/** Open the Capacity Quick Entry popover for a specific person. */
export function deepLinkForPersonCapacity(workspaceSlug: string, personId: string): string {
  const base = buildOrgBase(workspaceSlug);
  return `${base}/directory?person=${encodeURIComponent(personId)}&openCapacity=true`;
}

// ---------------------------------------------------------------------------
// Work deep links
// ---------------------------------------------------------------------------

/** Navigate to a specific work request's detail/feasibility page. */
export function deepLinkForWorkRequest(workspaceSlug: string, workRequestId: string): string {
  const base = buildOrgBase(workspaceSlug);
  return `${base}/work/${encodeURIComponent(workRequestId)}`;
}

// ---------------------------------------------------------------------------
// Decision & Responsibility deep links
// ---------------------------------------------------------------------------

/** Navigate to decision authority settings, auto-focusing a specific domain. */
export function deepLinkForDecisionDomain(workspaceSlug: string, domainKey: string): string {
  const base = buildOrgBase(workspaceSlug);
  return `${base}/admin/decisions?domain=${encodeURIComponent(domainKey)}`;
}

/** Navigate to responsibility settings, auto-focusing a specific role profile. */
export function deepLinkForResponsibilityProfile(workspaceSlug: string, roleType: string): string {
  const base = buildOrgBase(workspaceSlug);
  return `${base}/admin/responsibility?roleType=${encodeURIComponent(roleType)}`;
}

// ---------------------------------------------------------------------------
// Generic
// ---------------------------------------------------------------------------

/** Navigate to the Issues page, optionally pre-filtered by severity. */
export function deepLinkForIssues(workspaceSlug: string, severity?: string): string {
  const base = buildOrgBase(workspaceSlug);
  if (severity) {
    return `${base}/admin/health?severity=${encodeURIComponent(severity)}`;
  }
  return `${base}/admin/health`;
}

// ---------------------------------------------------------------------------
// W1.5: Recommendation-aware deep links (issue type filters)
// ---------------------------------------------------------------------------

/** Navigate to Issues page pre-filtered to specific issue types. */
export function deepLinkForIssuesByTypes(workspaceSlug: string, types: OrgIssue[]): string {
  const base = buildOrgBase(workspaceSlug);
  if (types.length === 0) {
    return `${base}/admin/health`;
  }
  return `${base}/admin/health?types=${types.map(encodeURIComponent).join(",")}`;
}

/** Issues page filtered to ownership-related issues. */
export function deepLinkForOwnershipIssues(workspaceSlug: string): string {
  return deepLinkForIssuesByTypes(workspaceSlug, [
    "UNOWNED_TEAM",
    "UNOWNED_DEPARTMENT",
    "OWNERSHIP_CONFLICT",
  ]);
}

/** Issues page filtered to capacity-related issues. */
export function deepLinkForCapacityIssues(workspaceSlug: string): string {
  return deepLinkForIssuesByTypes(workspaceSlug, [
    "OVERALLOCATED_PERSON",
    "LOW_EFFECTIVE_CAPACITY",
    "CAPACITY_CONTRACT_CONFLICT",
  ]);
}

/** Issues page filtered to decision authority issues. */
export function deepLinkForDecisionIssues(workspaceSlug: string): string {
  return deepLinkForIssuesByTypes(workspaceSlug, [
    "DECISION_AUTHORITY_MISSING",
    "DECISION_DOMAIN_NO_COVERAGE",
  ]);
}

/** Issues page filtered to role responsibility/alignment issues. */
export function deepLinkForResponsibilityIssues(workspaceSlug: string): string {
  return deepLinkForIssuesByTypes(workspaceSlug, [
    "ROLE_ALIGNMENT_UNKNOWN",
    "WORK_ROLE_MISALIGNED",
    "ROLE_PROFILE_MISSING",
  ]);
}
