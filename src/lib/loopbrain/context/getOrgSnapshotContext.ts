/**
 * Org Semantic Snapshot context layer for Loopbrain.
 *
 * Calls buildOrgSemanticSnapshotV0 directly (server-side, no HTTP),
 * applies role-based field filtering, and formats the snapshot into
 * a prompt-ready text section.
 *
 * SAFETY CONTRACT:
 * - Filtering happens here, NOT in the org snapshot builder.
 * - MEMBER sees aggregate metrics only (no issue IDs, no work breakdowns).
 * - MEMBER with manager role: same aggregate view (person-level data is
 *   filtered at the read-tool level via permissions/hierarchy.ts).
 * - ADMIN/OWNER sees the full snapshot.
 * - If snapshot.readiness.isAnswerable is false, returns a blockers-only section.
 */

import { buildOrgSemanticSnapshotV0 } from "@/lib/org/snapshot/buildOrgSemanticSnapshotV0";
import type { OrgSemanticSnapshotV0 } from "@/lib/org/snapshot/types";
import type { WorkspaceRole } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrgSnapshotContextResult {
  /** Prompt-ready text section to inject into the user prompt. */
  section: string;
  /** The (filtered) snapshot object. */
  snapshot: OrgSemanticSnapshotV0;
  /** Source tag for telemetry / debugging. */
  source: "org_snapshot_v0";
}

// ---------------------------------------------------------------------------
// Role-based filtering
// ---------------------------------------------------------------------------

/**
 * Strip sensitive operational details for MEMBER role.
 * ADMIN and OWNER see the full snapshot.
 */
function filterSnapshotForRole(
  snapshot: OrgSemanticSnapshotV0,
  role: WorkspaceRole,
): OrgSemanticSnapshotV0 {
  if (role === "OWNER" || role === "ADMIN") return snapshot;

  // MEMBER / VIEWER: strip specific IDs and operational breakdowns
  return {
    ...snapshot,
    issues: {
      total: snapshot.issues.total,
      countsBySeverity: snapshot.issues.countsBySeverity,
      topIssueIds: [],
      topIssueTypes: [],
    },
    work: {
      openCount: snapshot.work.openCount,
      byRecommendationAction: {},
      unacknowledgedCount: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Prompt formatting
// ---------------------------------------------------------------------------

function formatSnapshotForPrompt(snapshot: OrgSemanticSnapshotV0): string {
  const lines: string[] = [];

  lines.push(`## Org Semantic Snapshot (v0)`);
  lines.push(`Generated: ${snapshot.generatedAt}`);

  // Readiness
  if (snapshot.readiness.isAnswerable) {
    lines.push(`Readiness: answerable (no blockers)`);
  } else {
    const blockerList = snapshot.readiness.blockers.join(", ");
    lines.push(`Readiness: NOT answerable — blockers: ${blockerList}`);
  }
  lines.push("");

  // Coverage
  const { ownership, capacity: capCov, responsibilityProfiles, decisionDomains: ddCov } = snapshot.coverage;
  lines.push(`### Coverage`);
  lines.push(`- Ownership: ${ownership.coveragePct}% coverage, ${ownership.conflictCount} conflict(s)`);
  lines.push(`- Capacity: ${capCov.count}/${capCov.total} configured (${capCov.pct}%)`);
  lines.push(`- Responsibility profiles: ${responsibilityProfiles.count}/${responsibilityProfiles.total} (${responsibilityProfiles.pct}%)`);
  lines.push(`- Decision domains: ${ddCov.count}/${ddCov.total} (${ddCov.pct}%)`);
  lines.push("");

  // Roles
  if (snapshot.roles.length > 0) {
    lines.push(`### Roles (${snapshot.roles.length} types)`);
    for (const role of snapshot.roles.slice(0, 15)) {
      lines.push(`- ${role.roleType}: ${role.peopleCount} people, profile: ${role.hasProfile ? "yes" : "no"}`);
    }
    if (snapshot.roles.length > 15) {
      lines.push(`- ... and ${snapshot.roles.length - 15} more`);
    }
    lines.push("");
  }

  // Capacity
  lines.push(`### Capacity`);
  lines.push(`- Configured: ${snapshot.capacity.configuredCount}/${snapshot.capacity.totalPeople} (${snapshot.capacity.pctConfigured}%), ${snapshot.capacity.issueCount} issue(s)`);
  lines.push("");

  // Responsibility
  lines.push(`### Responsibility`);
  lines.push(`- Profiles: ${snapshot.responsibility.profileCount}, distinct role types: ${snapshot.responsibility.distinctRoleTypes}, coverage: ${snapshot.responsibility.pctCovered}%`);
  lines.push("");

  // Decision domains
  if (snapshot.decisionDomains.length > 0) {
    lines.push(`### Decision Domains (${snapshot.decisionDomains.length})`);
    for (const dd of snapshot.decisionDomains.slice(0, 10)) {
      lines.push(`- ${dd.name} (${dd.key}): primary=${dd.hasPrimary ? "yes" : "no"}, coverage=${dd.hasCoverage ? "yes" : "no"}`);
    }
    if (snapshot.decisionDomains.length > 10) {
      lines.push(`- ... and ${snapshot.decisionDomains.length - 10} more`);
    }
    lines.push("");
  }

  // Issues
  const { issues } = snapshot;
  lines.push(`### Issues`);
  lines.push(`- Total: ${issues.total} (error: ${issues.countsBySeverity.error}, warning: ${issues.countsBySeverity.warning}, info: ${issues.countsBySeverity.info})`);
  if (issues.topIssueTypes && issues.topIssueTypes.length > 0) {
    lines.push(`- Top types: ${issues.topIssueTypes.join(", ")}`);
  }
  lines.push("");

  // Work
  if (snapshot.work.openCount > 0) {
    lines.push(`### Work Requests`);
    lines.push(`- Open: ${snapshot.work.openCount}, unacknowledged: ${snapshot.work.unacknowledgedCount}`);
    const actions = Object.entries(snapshot.work.byRecommendationAction);
    if (actions.length > 0) {
      lines.push(`- By action: ${actions.map(([k, v]) => `${k}=${v}`).join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatBlockersOnlySection(snapshot: OrgSemanticSnapshotV0): string {
  const lines: string[] = [];
  lines.push(`## Org Semantic Snapshot (v0)`);
  lines.push(`Generated: ${snapshot.generatedAt}`);
  lines.push(`Readiness: partial — some org setup steps remain`);
  lines.push(`Setup gaps: ${snapshot.readiness.blockers.join(", ")}`);
  lines.push("");
  lines.push(`Note: Some advanced org features (decision domains, responsibility profiles) are not yet configured. However, basic org structure data (people, roles, teams, reporting lines) IS available in the ORGANIZATIONAL CONTEXT section below. Use that data to answer questions.`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Fetch, filter, and format the Org Semantic Snapshot for Loopbrain.
 *
 * @param workspaceId - Workspace to build the snapshot for.
 * @param role - The caller's workspace role (determines filtering).
 * @param personId - Optional org position ID of the caller (for future
 *   hierarchy-aware filtering). Person-level data filtering is currently
 *   handled at the read-tool level via permissions/hierarchy.ts.
 * @returns Prompt section + snapshot, or null if the snapshot cannot be built.
 */
export async function getOrgSnapshotContext(params: {
  workspaceId: string;
  role: WorkspaceRole;
  personId?: string;
}): Promise<OrgSnapshotContextResult> {
  const raw = await buildOrgSemanticSnapshotV0({ workspaceId: params.workspaceId });
  const filtered = filterSnapshotForRole(raw, params.role);

  const section = filtered.readiness.isAnswerable
    ? formatSnapshotForPrompt(filtered)
    : formatBlockersOnlySection(filtered);

  return {
    section,
    snapshot: filtered,
    source: "org_snapshot_v0",
  };
}
