/**
 * Phase I: Decision Authority Resolver
 * 
 * Pure resolver that answers: "Who decides this, right now?"
 * 
 * Resolution Rules (Deterministic):
 * 1. If primaryPersonId → use directly
 * 2. If primaryRoleType → resolve via Phase H rules, take first match by personId
 * 3. Escalation follows same rules
 * 4. Availability check uses Phase G resolvers (if timeWindow provided)
 * 5. firstAvailable = first person with isAvailable = true
 */

import { prisma } from "@/lib/db";
import { resolveEffectiveCapacityBatch } from "@/lib/org/capacity/resolveEffectiveCapacity";
import {
  type DecisionAuthorityResolution,
  type ResolvedPerson,
  type ResolvedEscalationStep,
  type FirstAvailable,
  type AvailabilityStatus,
  type UnresolvableRole,
  getDecisionResponseMeta,
  buildDecisionEvidence,
  computeDecisionConfidence,
} from "./types";
import type { ExplainabilityBlock, ExplainDependency } from "@/lib/org/explainability/types";

// ============================================================================
// Types
// ============================================================================

type ResolveInput = {
  workspaceId: string;
  domainKey: string;
  timeWindow?: { start: Date; end: Date };
};

type RoleResolutionResult = {
  personId: string;
  personName: string;
} | null;

// ============================================================================
// Role Resolution (follows Phase H rules)
// ============================================================================

/**
 * Resolve a roleType to a specific person
 * 
 * Resolution order:
 * 1. PersonRoleAssignment.role (primary)
 * 2. OrgPosition.title (fallback)
 * 3. Deterministic tie-breaker: personId
 */
async function resolveRoleType(
  workspaceId: string,
  roleType: string
): Promise<RoleResolutionResult> {
  // Step 1: Check PersonRoleAssignment
  const roleAssignments = await prisma.personRoleAssignment.findMany({
    where: {
      role: { contains: roleType, mode: "insensitive" },
    },
    select: { personId: true },
    orderBy: { personId: "asc" }, // Deterministic ordering
  });

  if (roleAssignments.length > 0) {
    const personId = roleAssignments[0].personId;
    const user = await prisma.user.findUnique({
      where: { id: personId },
      select: { id: true, name: true, email: true },
    });
    if (user) {
      return {
        personId: user.id,
        personName: user.name ?? user.email ?? user.id,
      };
    }
  }

  // Step 2: Fallback to OrgPosition.title
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      title: { contains: roleType, mode: "insensitive" },
      isActive: true,
      userId: { not: null },
    },
    select: { userId: true },
    orderBy: { userId: "asc" }, // Deterministic ordering
  });

  if (positions.length > 0 && positions[0].userId) {
    const user = await prisma.user.findUnique({
      where: { id: positions[0].userId },
      select: { id: true, name: true, email: true },
    });
    if (user) {
      return {
        personId: user.id,
        personName: user.name ?? user.email ?? user.id,
      };
    }
  }

  return null;
}

/**
 * Resolve a person ID to name
 */
async function resolvePersonId(personId: string): Promise<RoleResolutionResult> {
  const user = await prisma.user.findUnique({
    where: { id: personId },
    select: { id: true, name: true, email: true },
  });

  if (!user) return null;

  return {
    personId: user.id,
    personName: user.name ?? user.email ?? user.id,
  };
}

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve decision authority for a domain
 */
export async function resolveDecisionAuthority(
  input: ResolveInput
): Promise<DecisionAuthorityResolution> {
  const { workspaceId, domainKey, timeWindow } = input;

  // Step 1: Fetch domain and authority
  const domain = await prisma.decisionDomain.findFirst({
    where: {
      workspaceId,
      key: domainKey,
      isArchived: false,
    },
    include: {
      authority: {
        include: {
          escalationSteps: {
            orderBy: { stepOrder: "asc" },
          },
        },
      },
    },
  });

  if (!domain) {
    return buildNotFoundResponse(domainKey);
  }

  const authority = domain.authority;
  let roleResolutionUsed = false;
  const unresolvableRoles: UnresolvableRole[] = [];

  // Step 2: Resolve primary
  let primary: ResolvedPerson | null = null;

  if (authority) {
    if (authority.primaryPersonId) {
      const resolved = await resolvePersonId(authority.primaryPersonId);
      if (resolved) {
        primary = {
          ...resolved,
          configuredAs: "PERSON",
          resolvedAs: "PERSON",
          roleType: null,
          availability: null,
        };
      }
    } else if (authority.primaryRoleType) {
      const resolved = await resolveRoleType(workspaceId, authority.primaryRoleType);
      roleResolutionUsed = true;
      if (resolved) {
        primary = {
          ...resolved,
          configuredAs: "ROLE",
          resolvedAs: "PERSON",
          roleType: authority.primaryRoleType,
          availability: null,
        };
      } else {
        // Track unresolvable primary role
        unresolvableRoles.push({
          configuredFor: "PRIMARY",
          stepOrder: null,
          roleType: authority.primaryRoleType,
        });
      }
    }
  }

  // Step 3: Resolve escalation steps
  const escalation: ResolvedEscalationStep[] = [];

  if (authority?.escalationSteps) {
    for (const step of authority.escalationSteps) {
      let resolved: RoleResolutionResult = null;
      let configuredAs: "PERSON" | "ROLE" = "PERSON";
      let roleType: string | null = null;

      if (step.personId) {
        resolved = await resolvePersonId(step.personId);
        configuredAs = "PERSON";
      } else if (step.roleType) {
        resolved = await resolveRoleType(workspaceId, step.roleType);
        configuredAs = "ROLE";
        roleType = step.roleType;
        roleResolutionUsed = true;

        // Track unresolvable escalation role
        if (!resolved) {
          unresolvableRoles.push({
            configuredFor: "ESCALATION",
            stepOrder: step.stepOrder,
            roleType: step.roleType,
          });
        }
      }

      if (resolved) {
        escalation.push({
          stepOrder: step.stepOrder,
          personId: resolved.personId,
          personName: resolved.personName,
          configuredAs,
          resolvedAs: "PERSON",
          roleType,
          availability: null,
        });
      }
    }
  }

  // Step 4: Check availability if timeWindow provided
  let availabilityChecked = false;
  if (timeWindow) {
    availabilityChecked = true;

    // Collect all person IDs to check
    const personIds: string[] = [];
    if (primary) personIds.push(primary.personId);
    escalation.forEach((step) => personIds.push(step.personId));

    if (personIds.length > 0) {
      const capacities = await resolveEffectiveCapacityBatch(
        workspaceId,
        personIds,
        timeWindow
      );

      // Update primary availability
      if (primary) {
        const capacity = capacities.get(primary.personId);
        if (capacity) {
          primary.availability = {
            isAvailable: capacity.availabilityFactor > 0,
            availabilityFactor: capacity.availabilityFactor,
            effectiveAvailableHours: capacity.effectiveAvailableHours,
          };
        }
      }

      // Update escalation availability
      for (const step of escalation) {
        const capacity = capacities.get(step.personId);
        if (capacity) {
          step.availability = {
            isAvailable: capacity.availabilityFactor > 0,
            availabilityFactor: capacity.availabilityFactor,
            effectiveAvailableHours: capacity.effectiveAvailableHours,
          };
        }
      }
    }
  }

  // Step 5: Compute firstAvailable
  let firstAvailable: FirstAvailable | null = null;

  if (timeWindow) {
    // Check primary first
    if (primary?.availability?.isAvailable) {
      firstAvailable = {
        personId: primary.personId,
        personName: primary.personName,
        stepOrder: null,
        whyChosen: ["Primary decider is available in the requested time window"],
      };
    } else {
      // Walk escalation in order
      for (const step of escalation) {
        if (step.availability?.isAvailable) {
          firstAvailable = {
            personId: step.personId,
            personName: step.personName,
            stepOrder: step.stepOrder,
            whyChosen: [
              `Primary decider unavailable; escalation step ${step.stepOrder + 1} is available`,
            ],
          };
          break;
        }
      }
    }

    // If no one is available, still report first in line
    if (!firstAvailable && (primary || escalation.length > 0)) {
      const fallback = primary ?? escalation[0];
      firstAvailable = {
        personId: fallback.personId,
        personName: fallback.personName,
        stepOrder: primary ? null : escalation[0]?.stepOrder ?? null,
        whyChosen: ["No available authority found; showing primary/first in escalation order"],
      };
    }
  }

  // Step 6: Build explainability
  const dependsOn: ExplainDependency[] = [
    { type: "DATA", label: "Decision domain configuration", reference: domainKey },
  ];
  if (roleResolutionUsed) {
    dependsOn.push({ type: "RULE", label: "Role resolution rules" });
  }
  if (timeWindow) {
    dependsOn.push({ type: "TIME_WINDOW", label: "Time window", reference: `${timeWindow.start.toISOString()}/${timeWindow.end.toISOString()}` });
    dependsOn.push({ type: "DATA", label: "Person availability data" });
  }

  const why: string[] = [];
  if (!hasAuthority) {
    why.push(`No decision authority configured for domain "${domainKey}"`);
  } else {
    if (primary) {
      why.push(`Primary decider: ${primary.personName}${primary.configuredAs === "ROLE" ? ` (resolved from role ${primary.roleType})` : ""}`);
    }
    if (escalation.length > 0) {
      why.push(`${escalation.length} escalation step(s) configured`);
    }
    if (unresolvableRoles.length > 0) {
      why.push(`${unresolvableRoles.length} role(s) could not be resolved to a person`);
    }
  }

  const whatChangesIt: string[] = [
    "Configure primary person or role for the domain",
    "Add or modify escalation steps",
  ];
  if (timeWindow) {
    whatChangesIt.push("Change the time window to find available deciders");
  }

  const explainability: ExplainabilityBlock = {
    blockId: `${domainKey}:decision`,
    kind: "DECISION",
    why,
    dependsOn,
    whatChangesIt,
  };

  // Step 7: Build response
  const hasAuthority = !!authority && (!!primary || escalation.length > 0);

  return {
    domainKey,
    domainName: domain.name,
    primary,
    escalation,
    firstAvailable,
    confidence: computeDecisionConfidence({
      hasAuthority,
      roleResolutionUsed,
      availabilityChecked,
    }),
    evidence: buildDecisionEvidence({
      domainKey,
      domainName: domain.name,
      hasAuthority,
      primaryConfiguredAs: authority?.primaryPersonId
        ? "PERSON"
        : authority?.primaryRoleType
        ? "ROLE"
        : null,
      escalationCount: escalation.length,
      roleResolutionUsed,
      unresolvableRoles,
    }),
    responseMeta: getDecisionResponseMeta(),
    explainability,
  };
}

/**
 * Build response for domain not found
 */
function buildNotFoundResponse(domainKey: string): DecisionAuthorityResolution {
  return {
    domainKey,
    domainName: "",
    primary: null,
    escalation: [],
    firstAvailable: null,
    confidence: {
      score: 0,
      factors: { completeness: 0, consistency: 0, freshness: 0 },
      explanation: [`Domain '${domainKey}' not found or is archived`],
    },
    evidence: buildDecisionEvidence({
      domainKey,
      domainName: "",
      hasAuthority: false,
      primaryConfiguredAs: null,
      escalationCount: 0,
      roleResolutionUsed: false,
    }),
    responseMeta: getDecisionResponseMeta(),
  };
}
