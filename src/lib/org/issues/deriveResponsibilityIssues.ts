/**
 * deriveResponsibilityIssues – Phase K Responsibility Deriver
 *
 * Scans role types and responsibility profiles to detect:
 *   ROLE_PROFILE_MISSING             – active role type has no profile
 *   FORBIDDEN_RESPONSIBILITY_CONFLICT – person override conflicts with forbidden tag
 *
 * Scope constraint: This deriver must NOT emit ROLE_ALIGNMENT_UNKNOWN or
 * WORK_ROLE_MISALIGNED. Those are per-work-request issues belonging to
 * deriveWorkImpactIssues() or a future work-alignment pass.
 *
 * Query budget: at most 3 Prisma queries total. No per-entity resolution calls.
 */

import { prisma } from "@/lib/db";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { getIssueExplanation } from "@/lib/org/issues/issueCopy";
import { deepLinkForResponsibilityProfile } from "@/lib/org/issues/deepLinks";

export async function deriveResponsibilityIssues(
  workspaceId: string
): Promise<OrgIssueMetadata[]> {
  const issues: OrgIssueMetadata[] = [];

  // ─── Query 1: Distinct active role types ──────────────────────────────
  // "Active" = OrgPosition.isActive === true, userId is set,
  // and linked user has a non-terminated WorkspaceMember.
  const activePositions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      userId: { not: null },
      title: { not: null },
      user: {
        workspaceMemberships: {
          some: {
            workspaceId,
            employmentStatus: { not: "TERMINATED" },
          },
        },
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Build distinct role types and their people
  const roleTypeMap = new Map<string, Array<{ userId: string; name: string }>>();
  for (const pos of activePositions) {
    if (!pos.title || !pos.userId) continue;
    const roleType = pos.title;
    if (!roleTypeMap.has(roleType)) {
      roleTypeMap.set(roleType, []);
    }
    roleTypeMap.get(roleType)!.push({
      userId: pos.userId,
      name: pos.user?.name ?? pos.user?.email ?? pos.userId,
    });
  }

  if (roleTypeMap.size === 0) return [];

  // ─── Query 2: All role responsibility profiles with forbidden tags ────
  const profiles = await prisma.roleResponsibilityProfile.findMany({
    where: { workspaceId },
    include: {
      forbiddenTags: {
        where: { isArchived: false },
        select: { id: true, key: true, label: true },
      },
    },
  });

  const profileByRoleType = new Map(
    profiles.map((p) => [p.roleType, p])
  );

  // ─── ROLE_PROFILE_MISSING ────────────────────────────────────────────
  // Emitted once per roleType (not per person).
  for (const [roleType] of roleTypeMap) {
    if (!profileByRoleType.has(roleType)) {
      const entityId = `role:${roleType}`;
      const issueKey = `ROLE_PROFILE_MISSING:DECISION_DOMAIN:${entityId}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: "ROLE_PROFILE_MISSING",
        severity: "info",
        entityType: "DECISION_DOMAIN",
        entityId,
        entityName: `Role: ${roleType}`,
        explanation: getIssueExplanation("ROLE_PROFILE_MISSING"),
        fixUrl: deepLinkForResponsibilityProfile(roleType),
        fixAction: "Create profile",
      });
    }
  }

  // ─── Query 3: Person responsibility overrides with tag info ───────────
  const overrides = await prisma.personResponsibilityOverride.findMany({
    where: { workspaceId },
    include: {
      tag: {
        select: { id: true, key: true, label: true, isArchived: true },
      },
    },
  });

  if (overrides.length === 0) return issues;

  // ─── FORBIDDEN_RESPONSIBILITY_CONFLICT ────────────────────────────────
  // Check if any person has an override for a tag that is forbidden by their profile.
  // Build forbidden tag sets per role type
  const forbiddenByRoleType = new Map<string, Set<string>>();
  for (const profile of profiles) {
    if (profile.forbiddenTags.length > 0) {
      forbiddenByRoleType.set(
        profile.roleType,
        new Set(profile.forbiddenTags.map((t) => t.id))
      );
    }
  }

  // Map personId → roleType from active positions
  const personRoleType = new Map<string, string>();
  for (const pos of activePositions) {
    if (pos.userId && pos.title) {
      personRoleType.set(pos.userId, pos.title);
    }
  }

  // Map personId → name for entity display
  const personNames = new Map<string, string>();
  for (const pos of activePositions) {
    if (pos.userId) {
      personNames.set(
        pos.userId,
        pos.user?.name ?? pos.user?.email ?? pos.userId
      );
    }
  }

  for (const override of overrides) {
    if (override.tag.isArchived) continue;

    const roleType = personRoleType.get(override.personId);
    if (!roleType) continue;

    const forbidden = forbiddenByRoleType.get(roleType);
    if (!forbidden || !forbidden.has(override.tagId)) continue;

    const personName = personNames.get(override.personId) ?? "Unknown";
    const issueKey = `FORBIDDEN_RESPONSIBILITY_CONFLICT:PERSON:${override.personId}:${override.tagId}`;
    issues.push({
      issueKey,
      issueId: issueKey,
      type: "FORBIDDEN_RESPONSIBILITY_CONFLICT",
      severity: "warning",
      entityType: "PERSON",
      entityId: override.personId,
      entityName: personName,
      explanation: getIssueExplanation("FORBIDDEN_RESPONSIBILITY_CONFLICT"),
      fixUrl: `/org/people/${override.personId}`,
      fixAction: "Resolve conflict",
    });
  }

  return issues;
}
