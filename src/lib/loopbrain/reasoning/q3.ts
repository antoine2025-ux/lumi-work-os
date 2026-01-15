/**
 * Loopbrain Q3 Reasoning: "Who should be working on this right now?"
 * 
 * Spec: Q3.v1
 * Depends on: Org v1 (or v1.1 with coverage)
 * 
 * This function implements the deterministic reasoning pipeline for Q3,
 * using Org v1 as a read-only context substrate.
 */

import { prisma } from "@/lib/db";
import {
  deriveProjectAccountability,
  deriveEffectiveCapacity,
  deriveCurrentAvailability,
  deriveRoleProfile,
  type ProjectAccountabilityReadModel,
  type AccountabilityValue,
} from "@/lib/org";
import { activeAllocationsAt } from "@/lib/org";

// ============================================================================
// Types
// ============================================================================

export type Q3OutputMode = "C" | "B";

export type Q3Confidence = "high" | "medium" | "low";

export type Q3Constraint = {
  type:
    | "ownership_missing"
    | "ownership_role_unresolved"
    | "limited_role_definition"
    | "partial_availability"
    | "capacity_saturation"
    | "no_execution_scope_match"
    | "team_expansion_used";
  description: string;
};

export type Q3Candidate = {
  personId: string;
  name: string;
  role: string | null;
  team: string | null;
  capacityStatus: string; // e.g., "~40% available"
  effectiveCapacity: number; // 0..1
  inclusionReason: string;
  risks: string[];
  isOwner: boolean;
  hasExecutionScope: boolean;
  roleAlignment: "aligned" | "potentially_misaligned" | "unknown";
  isOverallocated: boolean;
};

export type Q3RankedCandidate = Q3Candidate & {
  rank: number;
  rationale: string;
};

export type Q3Refusal = {
  reason: string;
  details: string[];
};

export type Q3Output = {
  mode: Q3OutputMode;
  constraints: Q3Constraint[];
  viableCandidates: Q3Candidate[];
  suggestedOrdering?: Q3RankedCandidate[]; // Only in Mode B
  confidence: Q3Confidence;
  refusal?: Q3Refusal; // Only if refusing to answer
};

// ============================================================================
// Main Function
// ============================================================================

export async function answerQ3(
  projectId: string,
  workspaceId: string
): Promise<Q3Output> {
  const at = new Date();

  // Step 0: Fetch all required Org data
  const [project, people, roles] = await Promise.all([
    fetchProjectWithAccountability(projectId, workspaceId),
    fetchPeopleWithCapacity(workspaceId),
    fetchRolesWithResponsibilities(workspaceId),
  ]);

  if (!project) {
    return {
      mode: "C",
      constraints: [
        {
          type: "ownership_missing",
          description: "Project not found",
        },
      ],
      viableCandidates: [],
      confidence: "low",
      refusal: {
        reason: "Project not found",
        details: [`Project ${projectId} does not exist in workspace ${workspaceId}`],
      },
    };
  }

  // Refusal check: No people modeled
  if (people.length === 0) {
    return {
      mode: "C",
      constraints: [],
      viableCandidates: [],
      confidence: "low",
      refusal: {
        reason: "No people modeled in organization",
        details: ["Org has zero people modeled. Cannot suggest candidates."],
      },
    };
  }

  // Step 1: Establish accountability boundary
  const accountability = deriveProjectAccountability(project.accountability);
  const accountabilityBoundary = establishAccountabilityBoundary(
    accountability,
    people,
    roles
  );

  // Step 2: Build initial candidate pool
  const initialCandidates = buildInitialCandidatePool(
    projectId,
    accountabilityBoundary,
    people,
    roles,
    project.description || ""
  );

  // Step 3: Apply role alignment filter
  const candidatesWithAlignment = applyRoleAlignmentFilter(
    initialCandidates,
    roles
  );

  // Step 4: Apply availability constraints
  const candidatesAfterAvailability = applyAvailabilityConstraints(
    candidatesWithAlignment,
    at
  );

  // Step 5: Apply allocation sanity
  const finalCandidates = applyAllocationSanity(
    candidatesAfterAvailability,
    at
  );

  // Step 6: Decide output mode and format
  const constraints = collectConstraints(
    accountability,
    accountabilityBoundary,
    finalCandidates,
    roles
  );

  // Refusal check: No viable candidates
  const viableCandidates = finalCandidates.filter(
    (c) => c.effectiveCapacity > 0
  );

  if (viableCandidates.length === 0) {
    return {
      mode: "C",
      constraints,
      viableCandidates: [],
      confidence: "low",
      refusal: {
        reason: "No candidates with non-zero capacity",
        details: [
          "All relevant people are unavailable or have zero effective capacity.",
        ],
      },
    };
  }

  // Determine mode
  const canUseModeB =
    accountability.owner.type !== "unset" &&
    viableCandidates.some(
      (c) =>
        c.hasExecutionScope &&
        c.effectiveCapacity > 0 &&
        c.roleAlignment !== "potentially_misaligned"
    ) &&
    !viableCandidates.every((c) => c.effectiveCapacity === 0);

  const mode: Q3OutputMode = canUseModeB ? "B" : "C";

  // Format candidates
  const formattedCandidates: Q3Candidate[] = viableCandidates.map((c) => ({
    personId: c.personId,
    name: c.name,
    role: c.role,
    team: c.team,
    capacityStatus: formatCapacityStatus(c.effectiveCapacity),
    effectiveCapacity: c.effectiveCapacity,
    inclusionReason: c.inclusionReason,
    risks: c.risks,
    isOwner: c.isOwner,
    hasExecutionScope: c.hasExecutionScope,
    roleAlignment: c.roleAlignment,
    isOverallocated: c.isOverallocated,
  }));

  // Generate suggested ordering if Mode B
  let suggestedOrdering: Q3RankedCandidate[] | undefined;
  if (mode === "B") {
    suggestedOrdering = generateSuggestedOrdering(formattedCandidates).slice(
      0,
      3
    );
  }

  // Determine confidence
  const confidence = determineConfidence(
    accountability,
    constraints,
    roles.length,
    viableCandidates
  );

  return {
    mode,
    constraints,
    viableCandidates: formattedCandidates,
    suggestedOrdering,
    confidence,
  };
}

// ============================================================================
// Step 1: Establish Accountability Boundary
// ============================================================================

type AccountabilityBoundary = {
  ownerPersonIds: string[];
  ownerRoleNames: string[];
  hasOwner: boolean;
  expansionUsed: boolean;
};

function establishAccountabilityBoundary(
  accountability: ProjectAccountabilityReadModel,
  people: PersonWithCapacity[],
  roles: RoleWithResponsibilities[]
): AccountabilityBoundary {
  const ownerPersonIds: string[] = [];
  const ownerRoleNames: string[] = [];

  if (accountability.owner.type === "person") {
    ownerPersonIds.push(accountability.owner.personId);
  } else if (accountability.owner.type === "role") {
    ownerRoleNames.push(accountability.owner.role);
    // Resolve people holding this role
    const roleHolders = people.filter(
      (p) => p.role?.toLowerCase() === accountability.owner.role.toLowerCase()
    );
    ownerPersonIds.push(...roleHolders.map((p) => p.personId));
  }

  // Deduplicate ownerPersonIds
  const uniqueOwnerPersonIds = Array.from(new Set(ownerPersonIds));

  return {
    ownerPersonIds: uniqueOwnerPersonIds,
    ownerRoleNames,
    hasOwner: accountability.owner.type !== "unset",
    expansionUsed: false, // Will be set in Step 2 if needed
  };
}

// ============================================================================
// Step 2: Build Initial Candidate Pool
// ============================================================================

type CandidateWithMetadata = {
  personId: string;
  name: string;
  role: string | null;
  team: string | null;
  availability: { status: "available" | "partial" | "unavailable"; fraction?: number };
  allocations: Array<{ fraction: number; startDate: Date; endDate?: Date }>;
  isOwner: boolean;
  hasExecutionScope: boolean;
  inclusionReason: string;
  risks: string[];
};

function buildInitialCandidatePool(
  projectId: string,
  boundary: AccountabilityBoundary,
  people: PersonWithCapacity[],
  roles: RoleWithResponsibilities[],
  projectDescription: string
): CandidateWithMetadata[] {
  const candidates: CandidateWithMetadata[] = [];

  for (const person of people) {
    let isOwner = false;
    let hasExecutionScope = false;
    const inclusionReasons: string[] = [];
    const risks: string[] = [];

    // Check if person is owner
    if (boundary.ownerPersonIds.includes(person.personId)) {
      isOwner = true;
      inclusionReasons.push("Project owner");
    }

    // Check if person holds owner role
    if (
      person.role &&
      boundary.ownerRoleNames.some(
        (r) => r.toLowerCase() === person.role!.toLowerCase()
      )
    ) {
      isOwner = true;
      inclusionReasons.push(`Holds owner role: ${person.role}`);
    }

    // Check execution scope
    if (person.role) {
      const roleProfile = roles.find(
        (r) => r.name.toLowerCase() === person.role!.toLowerCase()
      );
      if (roleProfile) {
        const profile = deriveRoleProfile(roleProfile);
        // Simple matching: check if any execution scope mentions project domain
        // This is a basic heuristic; in production, you might use more sophisticated matching
        const projectKeywords = projectDescription
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3);
        const hasMatch =
          profile.executionScopes.some((scope) =>
            projectKeywords.some((kw) => scope.toLowerCase().includes(kw))
          ) || profile.executionScopes.length === 0; // If no scopes defined, assume potential match

        if (hasMatch) {
          hasExecutionScope = true;
          inclusionReasons.push("Execution scope alignment");
        }
      } else {
        // Role not found in catalog - unknown alignment
        inclusionReasons.push("Role responsibilities not defined");
      }
    }

    // Check if already allocated to project
    const projectAllocations = person.allocations.filter(
      (a) => a.projectId === projectId
    );
    if (projectAllocations.length > 0) {
      inclusionReasons.push("Already allocated to project");
    }

    // Only include if at least one reason
    if (isOwner || hasExecutionScope || projectAllocations.length > 0) {
      candidates.push({
        personId: person.personId,
        name: person.name,
        role: person.role,
        team: person.team,
        availability: person.availability,
        allocations: person.allocations.map((a) => ({
          fraction: a.fraction,
          startDate: new Date(a.startDate),
          endDate: a.endDate ? new Date(a.endDate) : undefined,
        })),
        isOwner,
        hasExecutionScope,
        inclusionReason: inclusionReasons.join("; "),
        risks,
      });
    }
  }

  // If no candidates, expand to owner's team
  if (candidates.length === 0 && boundary.ownerPersonIds.length > 0) {
    const owner = people.find((p) =>
      boundary.ownerPersonIds.includes(p.personId)
    );
    if (owner?.team) {
      const teamMembers = people.filter((p) => p.team === owner.team);
      for (const member of teamMembers) {
        candidates.push({
          personId: member.personId,
          name: member.name,
          role: member.role,
          team: member.team,
          availability: member.availability,
          allocations: member.allocations.map((a) => ({
            fraction: a.fraction,
            startDate: new Date(a.startDate),
            endDate: a.endDate ? new Date(a.endDate) : undefined,
          })),
          isOwner: false,
          hasExecutionScope: false,
          inclusionReason: `Team member (owner's team: ${owner.team})`,
          risks: ["Expanded from owner's team - execution scope unknown"],
        });
      }
      boundary.expansionUsed = true;
    }
  }

  return candidates;
}

// ============================================================================
// Step 3: Apply Role Alignment Filter
// ============================================================================

function applyRoleAlignmentFilter(
  candidates: CandidateWithMetadata[],
  roles: RoleWithResponsibilities[]
): Array<CandidateWithMetadata & { roleAlignment: "aligned" | "potentially_misaligned" | "unknown" }> {
  return candidates.map((c) => {
    if (!c.role) {
      return { ...c, roleAlignment: "unknown" as const };
    }

    const roleProfile = roles.find(
      (r) => r.name.toLowerCase() === c.role!.toLowerCase()
    );

    if (!roleProfile) {
      return { ...c, roleAlignment: "unknown" as const };
    }

    // If person has execution scope, consider aligned
    // If owner but no execution scope, potentially misaligned
    if (c.isOwner && !c.hasExecutionScope) {
      return { ...c, roleAlignment: "potentially_misaligned" as const };
    }

    return { ...c, roleAlignment: "aligned" as const };
  });
}

// ============================================================================
// Step 4: Apply Availability Constraints
// ============================================================================

function applyAvailabilityConstraints(
  candidates: Array<CandidateWithMetadata & { roleAlignment: "aligned" | "potentially_misaligned" | "unknown" }>,
  at: Date
): Array<CandidateWithMetadata & { roleAlignment: "aligned" | "potentially_misaligned" | "unknown"; effectiveCapacity: number }> {
  return candidates
    .map((c) => {
      const effective = deriveEffectiveCapacity({
        availabilityStatus: c.availability.status,
        partialFraction: c.availability.fraction,
        allocations: c.allocations,
        at,
      });

      return {
        ...c,
        effectiveCapacity: effective.effectiveFraction,
      };
    })
    .filter((c) => {
      // Exclude unavailable or zero capacity
      return (
        c.availability.status !== "unavailable" && c.effectiveCapacity > 0
      );
    });
}

// ============================================================================
// Step 5: Apply Allocation Sanity
// ============================================================================

function applyAllocationSanity(
  candidates: Array<CandidateWithMetadata & { roleAlignment: "aligned" | "potentially_misaligned" | "unknown"; effectiveCapacity: number }>
): Array<CandidateWithMetadata & { roleAlignment: "aligned" | "potentially_misaligned" | "unknown"; effectiveCapacity: number; isOverallocated: boolean }> {
  return candidates.map((c) => {
    const base =
      c.availability.status === "unavailable"
        ? 0
        : c.availability.status === "partial"
        ? c.availability.fraction ?? 0.5
        : 1;

    const allocated = c.allocations.reduce((sum, a) => sum + a.fraction, 0);
    const isOverallocated = allocated > base + 1e-6;

    if (isOverallocated) {
      c.risks.push("Capacity risk: overallocated");
    }

    if (c.availability.status === "partial") {
      c.risks.push("Partial availability");
    }

    return {
      ...c,
      isOverallocated,
    };
  });
}

// ============================================================================
// Step 6: Collect Constraints & Determine Mode
// ============================================================================

function collectConstraints(
  accountability: ProjectAccountabilityReadModel,
  boundary: AccountabilityBoundary,
  candidates: Array<CandidateWithMetadata & { roleAlignment: "aligned" | "potentially_misaligned" | "unknown"; effectiveCapacity: number; isOverallocated: boolean }>,
  roles: RoleWithResponsibilities[]
): Q3Constraint[] {
  const constraints: Q3Constraint[] = [];

  if (!boundary.hasOwner) {
    constraints.push({
      type: "ownership_missing",
      description: "Ownership not defined",
    });
  }

  if (boundary.ownerRoleNames.length > 0 && boundary.ownerPersonIds.length === 0) {
    constraints.push({
      type: "ownership_role_unresolved",
      description: `Owner role "${boundary.ownerRoleNames[0]}" has no people assigned`,
    });
  }

  if (boundary.expansionUsed) {
    constraints.push({
      type: "team_expansion_used",
      description: "Expanded candidate pool to owner's team",
    });
  }

  const partialAvailabilityCount = candidates.filter(
    (c) => c.availability.status === "partial"
  ).length;
  if (partialAvailabilityCount > 0) {
    constraints.push({
      type: "partial_availability",
      description: `${partialAvailabilityCount} candidate(s) have partial availability`,
    });
  }

  const overallocatedCount = candidates.filter((c) => c.isOverallocated).length;
  if (overallocatedCount > 0) {
    constraints.push({
      type: "capacity_saturation",
      description: `${overallocatedCount} candidate(s) are overallocated`,
    });
  }

  const unknownAlignmentCount = candidates.filter(
    (c) => c.roleAlignment === "unknown"
  ).length;
  if (unknownAlignmentCount > 0 && roles.length === 0) {
    constraints.push({
      type: "limited_role_definition",
      description: "Role responsibilities not defined in Org",
    });
  }

  return constraints;
}

function generateSuggestedOrdering(
  candidates: Q3Candidate[]
): Q3RankedCandidate[] {
  // Sort by: owner first, then execution scope, then capacity
  const sorted = [...candidates].sort((a, b) => {
    // Owners first
    if (a.isOwner && !b.isOwner) return -1;
    if (!a.isOwner && b.isOwner) return 1;

    // Then execution scope
    if (a.hasExecutionScope && !b.hasExecutionScope) return -1;
    if (!a.hasExecutionScope && b.hasExecutionScope) return 1;

    // Then capacity (higher first)
    if (a.effectiveCapacity > b.effectiveCapacity) return -1;
    if (a.effectiveCapacity < b.effectiveCapacity) return 1;

    return 0;
  });

  return sorted.map((c, idx) => {
    const rationales: string[] = [];
    if (c.isOwner) rationales.push("project owner");
    if (c.hasExecutionScope) rationales.push("execution scope alignment");
    if (c.effectiveCapacity > 0.5) rationales.push("available capacity");
    if (c.effectiveCapacity <= 0.3) rationales.push("limited capacity");

    return {
      ...c,
      rank: idx + 1,
      rationale: rationales.join(", "),
    };
  });
}

function determineConfidence(
  accountability: ProjectAccountabilityReadModel,
  constraints: Q3Constraint[],
  roleCount: number,
  candidates: Array<CandidateWithMetadata & { roleAlignment: "aligned" | "potentially_misaligned" | "unknown"; effectiveCapacity: number; isOverallocated: boolean }>
): Q3Confidence {
  if (accountability.owner.type === "unset") return "low";
  if (roleCount === 0) return "low";
  if (constraints.some((c) => c.type === "ownership_role_unresolved")) return "low";

  if (constraints.length === 0 && candidates.length > 0) return "high";

  return "medium";
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCapacityStatus(effectiveCapacity: number): string {
  const pct = Math.round(effectiveCapacity * 100);
  if (pct >= 80) return `~${pct}% available`;
  if (pct >= 50) return `~${pct}% available`;
  if (pct >= 20) return `~${pct}% available (limited)`;
  return `~${pct}% available (very limited)`;
}

// ============================================================================
// Data Fetching
// ============================================================================

type PersonWithCapacity = {
  personId: string;
  name: string;
  role: string | null;
  team: string | null;
  availability: { status: "available" | "partial" | "unavailable"; fraction?: number };
  allocations: Array<{
    projectId: string;
    fraction: number;
    startDate: string;
    endDate: string | null;
  }>;
};

type RoleWithResponsibilities = {
  name: string;
  responsibilities: Array<{ scope: string; target: string }>;
};

async function fetchProjectWithAccountability(
  projectId: string,
  workspaceId: string
) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ orgId: workspaceId }, { workspaceId }],
    },
    include: {
      accountability: {
        select: {
          ownerPersonId: true,
          ownerRole: true,
          decisionPersonId: true,
          decisionRole: true,
          escalationPersonId: true,
          escalationRole: true,
          backupOwnerPersonId: true,
          backupOwnerRole: true,
          backupDecisionPersonId: true,
          backupDecisionRole: true,
        },
      },
    },
  });

  return project;
}

async function fetchPeopleWithCapacity(
  workspaceId: string
): Promise<PersonWithCapacity[]> {
  // For v1, orgId = workspaceId
  const orgId = workspaceId;

  const users = await prisma.user.findMany({
    where: {
      // Get users who have positions in this workspace
      positions: {
        some: {
          workspaceId,
          isActive: true,
        },
      },
    },
    include: {
      positions: {
        where: {
          workspaceId,
          isActive: true,
        },
        include: {
          team: {
            select: {
              name: true,
            },
          },
        },
        take: 1, // Take first active position
      },
      availability: {
        select: {
          type: true,
          startDate: true,
          endDate: true,
          fraction: true,
        },
        orderBy: {
          startDate: "desc",
        },
      },
      allocations: {
        where: {
          orgId,
        },
        select: {
          projectId: true,
          fraction: true,
          startDate: true,
          endDate: true,
        },
        orderBy: {
          startDate: "desc",
        },
      },
    },
  });

  const at = new Date();

  return users.map((user) => {
    const position = user.positions[0];
    const availabilityWindows = user.availability.map((a) => ({
      type: a.type === "UNAVAILABLE" ? ("unavailable" as const) : ("partial" as const),
      startDate: a.startDate,
      endDate: a.endDate ?? undefined,
      fraction: a.fraction ?? undefined,
    }));
    const availability = deriveCurrentAvailability(availabilityWindows, at);

    return {
      personId: user.id,
      name: user.name || "Unnamed",
      role: position?.title || null,
      team: position?.team?.name || null,
      availability: {
        status: availability.status,
        fraction: availability.fraction,
      },
      allocations: user.allocations.map((a) => ({
        projectId: a.projectId,
        fraction: a.fraction,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate?.toISOString() ?? null,
      })),
    };
  });
}

async function fetchRolesWithResponsibilities(
  workspaceId: string
): Promise<RoleWithResponsibilities[]> {
  // For v1, orgId = workspaceId
  const orgId = workspaceId;

  const roles = await prisma.role.findMany({
    where: {
      orgId,
    },
    include: {
      responsibilities: {
        select: {
          scope: true,
          target: true,
        },
      },
    },
  });

  return roles.map((role) => ({
    name: role.name,
    responsibilities: role.responsibilities.map((r) => ({
      scope: r.scope,
      target: r.target,
    })),
  }));
}

