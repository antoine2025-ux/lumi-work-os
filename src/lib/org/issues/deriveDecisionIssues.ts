// @ts-nocheck
/**
 * deriveDecisionIssues – Phase I Decision Authority Deriver
 *
 * Scans all active DecisionDomain records and detects:
 *   DECISION_AUTHORITY_MISSING       – no authority configured
 *   DECISION_AUTHORITY_ROLE_UNRESOLVABLE – role can't resolve to a person
 *   DECISION_AUTHORITY_PRIMARY_UNAVAILABLE – primary decider unavailable
 *   DECISION_DOMAIN_NO_COVERAGE      – primary exists but no escalation steps
 *
 * entityType: "DECISION_DOMAIN" for all issues (already in OrgIssueMetadata union).
 *
 * Availability rule: If no availability data exists for a person
 * (availabilityFactor === 1.0 / default), they are assumed available.
 * This prevents noisy false positives in orgs without capacity data.
 */

import { prisma } from "@/lib/db";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { resolveEffectiveCapacityBatch } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { getIssueExplanation } from "@/lib/org/issues/issueCopy";
import {
  deepLinkForDecisionDomain,
} from "@/lib/org/issues/deepLinks";

// ============================================================================
// Role Resolution (lightweight, no per-domain resolver call)
// ============================================================================

async function resolveRoleTypeToPerson(
  workspaceId: string,
  roleType: string
): Promise<{ personId: string; personName: string } | null> {
  // Try OrgPosition.title first (most common)
  const position = await prisma.orgPosition.findFirst({
    where: {
      workspaceId,
      title: { contains: roleType, mode: "insensitive" },
      isActive: true,
      userId: { not: null },
    },
    select: { userId: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { userId: "asc" }, // Deterministic
  });

  if (position?.user) {
    return {
      personId: position.user.id,
      personName: position.user.name ?? position.user.email ?? position.user.id,
    };
  }

  return null;
}

// ============================================================================
// Main Deriver
// ============================================================================

export async function deriveDecisionIssues(
  workspaceId: string,
  issueWindow: { start: Date; end: Date }
): Promise<OrgIssueMetadata[]> {
  // 1. Fetch all active domains with authority + escalation steps in one query
  const domains = await prisma.decisionDomain.findMany({
    where: { workspaceId, isArchived: false },
    include: {
      authority: {
        include: {
          escalationSteps: { orderBy: { stepOrder: "asc" } },
        },
      },
    },
  });

  if (domains.length === 0) return [];

  const issues: OrgIssueMetadata[] = [];

  // 2. Collect primary person IDs for batch availability check
  const primaryPersonIds: string[] = [];
  for (const domain of domains) {
    if (domain.authority?.primaryPersonId) {
      primaryPersonIds.push(domain.authority.primaryPersonId);
    }
  }

  // 3. Batch resolve availability (only for domains with explicit primary persons)
  let availabilityMap = new Map<string, { availabilityFactor: number }>();
  if (primaryPersonIds.length > 0) {
    try {
      const capacities = await resolveEffectiveCapacityBatch(
        workspaceId,
        primaryPersonIds,
        issueWindow
      );
      availabilityMap = new Map(
        Array.from(capacities.entries()).map(([id, cap]) => [
          id,
          { availabilityFactor: cap.availabilityFactor },
        ])
      );
    } catch {
      // Non-fatal: if capacity resolution fails, skip availability checks
      availabilityMap = new Map();
    }
  }

  // 4. Derive issues per domain
  for (const domain of domains) {
    const authority = domain.authority;
    const entityBase = {
      entityType: "DECISION_DOMAIN" as const,
      entityId: domain.id,
      entityName: domain.name,
    };

    // --- DECISION_AUTHORITY_MISSING ---
    if (!authority) {
      const issueKey = `DECISION_AUTHORITY_MISSING:DECISION_DOMAIN:${domain.id}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: "DECISION_AUTHORITY_MISSING",
        severity: "warning",
        ...entityBase,
        explanation: getIssueExplanation("DECISION_AUTHORITY_MISSING"),
        fixUrl: deepLinkForDecisionDomain(domain.key),
        fixAction: "Configure authority",
      });
      continue; // No further checks if no authority at all
    }

    // --- Resolve primary person ---
    let primaryResolved = false;
    let primaryPersonId: string | null = null;

    if (authority.primaryPersonId) {
      primaryResolved = true;
      primaryPersonId = authority.primaryPersonId;
    } else if (authority.primaryRoleType) {
      // Try to resolve role to person
      const resolved = await resolveRoleTypeToPerson(workspaceId, authority.primaryRoleType);
      if (resolved) {
        primaryResolved = true;
        primaryPersonId = resolved.personId;
      } else {
        // --- DECISION_AUTHORITY_ROLE_UNRESOLVABLE ---
        const issueKey = `DECISION_AUTHORITY_ROLE_UNRESOLVABLE:DECISION_DOMAIN:${domain.id}`;
        issues.push({
          issueKey,
          issueId: issueKey,
          type: "DECISION_AUTHORITY_ROLE_UNRESOLVABLE",
          severity: "warning",
          ...entityBase,
          explanation: getIssueExplanation("DECISION_AUTHORITY_ROLE_UNRESOLVABLE"),
          fixUrl: deepLinkForDecisionDomain(domain.key),
          fixAction: "Fix role mapping",
        });
      }
    }

    // --- DECISION_AUTHORITY_PRIMARY_UNAVAILABLE ---
    if (primaryResolved && primaryPersonId) {
      const availability = availabilityMap.get(primaryPersonId);
      // Only flag if availability data exists AND factor is explicitly 0
      // Default (1.0) = no data = assumed available
      if (availability && availability.availabilityFactor === 0) {
        const issueKey = `DECISION_AUTHORITY_PRIMARY_UNAVAILABLE:DECISION_DOMAIN:${domain.id}`;
        issues.push({
          issueKey,
          issueId: issueKey,
          type: "DECISION_AUTHORITY_PRIMARY_UNAVAILABLE",
          severity: "warning",
          ...entityBase,
          explanation: getIssueExplanation("DECISION_AUTHORITY_PRIMARY_UNAVAILABLE"),
          fixUrl: deepLinkForDecisionDomain(domain.key),
          fixAction: "Configure escalation",
        });
      }
    }

    // --- DECISION_DOMAIN_NO_COVERAGE ---
    if (primaryResolved && (!authority.escalationSteps || authority.escalationSteps.length === 0)) {
      const issueKey = `DECISION_DOMAIN_NO_COVERAGE:DECISION_DOMAIN:${domain.id}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: "DECISION_DOMAIN_NO_COVERAGE",
        severity: "info",
        ...entityBase,
        explanation: getIssueExplanation("DECISION_DOMAIN_NO_COVERAGE"),
        fixUrl: deepLinkForDecisionDomain(domain.key),
        fixAction: "Add escalation",
      });
    }
  }

  return issues;
}
