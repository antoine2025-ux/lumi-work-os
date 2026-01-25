/**
 * Phase H: Work Candidate Resolution
 * Phase K: Role Alignment Integration
 * 
 * Deterministic candidate pool selection and ranking for work requests.
 * 
 * Pool Selection Order:
 * 1. If domainType = TEAM → team members (via OrgPosition.teamId)
 * 2. If domainType = DEPARTMENT → all team members in department
 * 3. If requiredRoleType set → filter by PersonRoleAssignment.role or OrgPosition.title
 * 4. Fallback: workspace-wide role matches
 * 
 * Ranking Criteria (server-side only):
 * 1. Viability: available + effectiveAvailableHours >= threshold
 * 2. Alignment score (ALIGNED=3, PARTIAL=2, MISALIGNED=1, UNKNOWN=0)
 * 3. effectiveAvailableHours descending
 * 4. Proximity: same team > same dept > other
 * 5. Deterministic tie-breaker: personId
 * 
 * Critical invariant: Alignment does not override feasibility — it refines it.
 */

import { prisma } from "@/lib/db";
import type { WorkRequest, SeniorityLevel } from "@prisma/client";
import { resolveEffectiveCapacityBatch } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { getWorkspaceThresholds } from "@/lib/org/capacity/thresholds";
import type { WorkCandidate, CandidatePoolResult, EffectiveCapacitySummary } from "./types";
import {
  resolveRoleAlignment,
  getAlignmentScore,
  type AlignmentResult,
} from "@/lib/org/responsibility/resolveRoleAlignment";

// ============================================================================
// Candidate Pool Selection
// ============================================================================

type CandidatePoolInput = {
  workspaceId: string;
  domainType: string;
  domainId: string | null;
  requiredRoleType: string | null;
  requiredSeniority: SeniorityLevel | null;
};

/**
 * Get candidate pool based on domain type and constraints
 */
export async function getCandidatePool(
  input: CandidatePoolInput
): Promise<CandidatePoolResult> {
  const { workspaceId, domainType, domainId, requiredRoleType, requiredSeniority } = input;
  const explanation: string[] = [];
  let candidateUserIds: string[] = [];
  let teamIdForProximity: string | null = null;
  let departmentIdForProximity: string | null = null;
  
  // Track pool metrics for issue evidence
  let totalBeforeRoleFilter = 0;
  let matchingRoleCount = 0;
  const roleFilterApplied = !!requiredRoleType;

  // Step 1: Get base candidate pool by domain type
  if (domainType === "TEAM" && domainId) {
    // Get team members via OrgPosition
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        teamId: domainId,
        isActive: true,
        userId: { not: null },
      },
      select: { userId: true, teamId: true },
    });

    candidateUserIds = positions.map((p) => p.userId!).filter(Boolean);
    teamIdForProximity = domainId;
    explanation.push(`Candidates from team (${candidateUserIds.length} members)`);

    // Get team's department for proximity scoring
    const team = await prisma.orgTeam.findUnique({
      where: { id: domainId },
      select: { departmentId: true },
    });
    departmentIdForProximity = team?.departmentId ?? null;
  } else if (domainType === "DEPARTMENT" && domainId) {
    // Get all team members in department
    const teams = await prisma.orgTeam.findMany({
      where: {
        workspaceId,
        departmentId: domainId,
        isActive: true,
      },
      select: { id: true },
    });

    const teamIds = teams.map((t) => t.id);
    departmentIdForProximity = domainId;

    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        teamId: { in: teamIds },
        isActive: true,
        userId: { not: null },
      },
      select: { userId: true },
    });

    candidateUserIds = positions.map((p) => p.userId!).filter(Boolean);
    explanation.push(`Candidates from department (${candidateUserIds.length} members across ${teamIds.length} teams)`);
  } else {
    // Workspace-wide: get all active positions with users
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
      },
      select: { userId: true },
    });

    candidateUserIds = positions.map((p) => p.userId!).filter(Boolean);
    explanation.push(`Candidates workspace-wide (${candidateUserIds.length} active members)`);
  }

  // Deduplicate
  candidateUserIds = [...new Set(candidateUserIds)];
  
  // Track total before any role filtering
  totalBeforeRoleFilter = candidateUserIds.length;

  // Step 2: Filter by role type if specified
  if (requiredRoleType && candidateUserIds.length > 0) {
    // Check PersonRoleAssignment first
    const roleAssignments = await prisma.personRoleAssignment.findMany({
      where: {
        personId: { in: candidateUserIds },
        role: { contains: requiredRoleType, mode: "insensitive" },
      },
      select: { personId: true },
    });

    const roleMatchedIds = new Set(roleAssignments.map((r) => r.personId));

    // Fallback: check OrgPosition.title
    const positionMatches = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        userId: { in: candidateUserIds },
        title: { contains: requiredRoleType, mode: "insensitive" },
        isActive: true,
      },
      select: { userId: true },
    });

    positionMatches.forEach((p) => {
      if (p.userId) roleMatchedIds.add(p.userId);
    });

    const beforeCount = candidateUserIds.length;
    candidateUserIds = candidateUserIds.filter((id) => roleMatchedIds.has(id));
    matchingRoleCount = candidateUserIds.length;
    
    explanation.push(
      `Filtered by role '${requiredRoleType}': ${candidateUserIds.length}/${beforeCount} match`
    );
  } else {
    // No role filter applied; all candidates count as matching
    matchingRoleCount = candidateUserIds.length;
  }

  // Step 3: Get user details and position info for candidates
  if (candidateUserIds.length === 0) {
    return {
      candidates: [],
      explanation,
      poolMetrics: {
        totalBeforeRoleFilter,
        matchingRoleCount,
        roleFilterApplied,
        requiredRoleType,
      },
    };
  }

  const users = await prisma.user.findMany({
    where: { id: { in: candidateUserIds } },
    select: { id: true, name: true, email: true },
  });

  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      userId: { in: candidateUserIds },
      isActive: true,
    },
    select: {
      userId: true,
      teamId: true,
      title: true,
      level: true,
      team: {
        select: { departmentId: true },
      },
    },
  });

  // Get role assignments for seniority matching
  const roleAssignments = await prisma.personRoleAssignment.findMany({
    where: {
      personId: { in: candidateUserIds },
    },
    select: { personId: true, role: true },
  });

  // Build candidate objects
  const userMap = new Map(users.map((u) => [u.id, u]));
  const positionMap = new Map(positions.map((p) => [p.userId!, p]));
  const roleMap = new Map<string, string[]>();
  roleAssignments.forEach((r) => {
    const roles = roleMap.get(r.personId) ?? [];
    roles.push(r.role);
    roleMap.set(r.personId, roles);
  });

  const candidates: WorkCandidate[] = candidateUserIds.map((userId) => {
    const user = userMap.get(userId);
    const position = positionMap.get(userId);
    const roles = roleMap.get(userId) ?? [];

    // Determine proximity
    let proximity: "SAME_TEAM" | "SAME_DEPARTMENT" | "OTHER" = "OTHER";
    if (teamIdForProximity && position?.teamId === teamIdForProximity) {
      proximity = "SAME_TEAM";
    } else if (departmentIdForProximity && position?.team?.departmentId === departmentIdForProximity) {
      proximity = "SAME_DEPARTMENT";
    }

    // Infer seniority from position level or title
    let seniorityLevel: string | null = null;
    if (position?.level) {
      if (position.level >= 5) seniorityLevel = "PRINCIPAL";
      else if (position.level >= 4) seniorityLevel = "LEAD";
      else if (position.level >= 3) seniorityLevel = "SENIOR";
      else if (position.level >= 2) seniorityLevel = "MID";
      else seniorityLevel = "JUNIOR";
    }

    return {
      personId: userId,
      personName: user?.name ?? user?.email ?? userId,
      teamId: position?.teamId ?? null,
      departmentId: position?.team?.departmentId ?? null,
      roleType: roles[0] ?? position?.title ?? null,
      seniorityLevel,
      effectiveCapacity: null, // Will be populated later
      confidence: null,
      isViable: false, // Will be determined after capacity check
      proximity,
      whyChosen: [],
      // Phase K: Alignment fields (computed in ranking)
      alignment: null,
      alignmentExplanation: [],
    };
  });

  return {
    candidates,
    explanation,
    poolMetrics: {
      totalBeforeRoleFilter,
      matchingRoleCount,
      roleFilterApplied,
      requiredRoleType,
    },
  };
}

// ============================================================================
// Candidate Ranking
// ============================================================================

type RankingInput = {
  candidates: WorkCandidate[];
  workRequest: WorkRequest & { workTags?: { key: string }[] };
  workspaceId: string;
  minCapacityThreshold: number;
};

/**
 * Rank candidates based on capacity, alignment, and proximity
 * 
 * Ranking order:
 * 1. Viability (available + capacity >= threshold)
 * 2. Alignment score (ALIGNED=3, PARTIAL=2, MISALIGNED=1, UNKNOWN=0)
 * 3. effectiveAvailableHours descending
 * 4. Proximity (SAME_TEAM > SAME_DEPARTMENT > OTHER)
 * 5. personId (deterministic tie-breaker)
 * 
 * Critical invariant: Alignment does not override feasibility — it refines it.
 */
export async function rankCandidates(input: RankingInput): Promise<WorkCandidate[]> {
  const { candidates, workRequest, workspaceId, minCapacityThreshold } = input;

  if (candidates.length === 0) return [];

  // Get capacity for all candidates
  const personIds = candidates.map((c) => c.personId);
  const timeWindow = {
    start: workRequest.desiredStart,
    end: workRequest.desiredEnd,
  };

  const capacitiesMap = await resolveEffectiveCapacityBatch(
    workspaceId,
    personIds,
    timeWindow
  );

  // Phase K: Compute alignment for all candidates
  const alignmentMap = new Map<string, { alignment: AlignmentResult; explanation: string[] }>();
  for (const candidate of candidates) {
    try {
      const alignmentResult = await resolveRoleAlignment({
        workspaceId,
        workRequest,
        personId: candidate.personId,
        personName: candidate.personName,
        roleType: candidate.roleType,
      });
      alignmentMap.set(candidate.personId, {
        alignment: alignmentResult.alignment,
        explanation: alignmentResult.explanation,
      });
    } catch (error) {
      // Non-blocking: if alignment fails, treat as UNKNOWN
      alignmentMap.set(candidate.personId, {
        alignment: "UNKNOWN",
        explanation: ["Alignment computation failed"],
      });
    }
  }

  // Update candidates with capacity and alignment info
  const rankedCandidates = candidates.map((candidate) => {
    const capacity = capacitiesMap.get(candidate.personId);
    const alignmentData = alignmentMap.get(candidate.personId);
    const whyChosen: string[] = [];

    if (!capacity) {
      return {
        ...candidate,
        isViable: false,
        whyChosen: ["No capacity data available"],
        alignment: alignmentData?.alignment ?? null,
        alignmentExplanation: alignmentData?.explanation ?? [],
      };
    }

    const effectiveCapacity: EffectiveCapacitySummary = {
      weeklyCapacityHours: capacity.weeklyCapacityHours,
      contractedHoursForWindow: capacity.contractedHoursForWindow,
      availabilityFactor: capacity.availabilityFactor,
      allocatedHours: capacity.allocatedHours,
      effectiveAvailableHours: capacity.effectiveAvailableHours,
    };

    // Determine viability
    const isAvailable = capacity.availabilityFactor > 0;
    const hasCapacity = capacity.effectiveAvailableHours >= minCapacityThreshold;
    const isViable = isAvailable && hasCapacity;

    // Build whyChosen explanation
    if (!isAvailable) {
      whyChosen.push("Unavailable in window");
    } else if (!hasCapacity) {
      whyChosen.push(`Insufficient capacity (${capacity.effectiveAvailableHours.toFixed(1)}h < ${minCapacityThreshold}h threshold)`);
    } else {
      whyChosen.push(`Available with ${capacity.effectiveAvailableHours.toFixed(1)}h capacity`);
    }

    // Add alignment info
    if (alignmentData) {
      const alignmentLabel = alignmentData.alignment;
      whyChosen.push(`Alignment: ${alignmentLabel}`);
    }

    // Add proximity info
    if (candidate.proximity === "SAME_TEAM") {
      whyChosen.push("Same team");
    } else if (candidate.proximity === "SAME_DEPARTMENT") {
      whyChosen.push("Same department");
    }

    // Check seniority match if required
    if (workRequest.requiredSeniority) {
      const seniorityMatch = checkSeniorityMatch(
        candidate.seniorityLevel,
        workRequest.requiredSeniority
      );
      if (!seniorityMatch.matches) {
        whyChosen.push(seniorityMatch.reason);
      } else {
        whyChosen.push(`Seniority: ${candidate.seniorityLevel ?? "inferred"}`);
      }
    }

    return {
      ...candidate,
      effectiveCapacity,
      confidence: capacity.confidence,
      isViable,
      whyChosen,
      alignment: alignmentData?.alignment ?? null,
      alignmentExplanation: alignmentData?.explanation ?? [],
    };
  });

  // Sort candidates
  rankedCandidates.sort((a, b) => {
    // 1. Viability first (alignment does not override feasibility)
    if (a.isViable !== b.isViable) return b.isViable ? 1 : -1;

    // 2. Alignment score (ALIGNED=3, PARTIAL=2, MISALIGNED=1, UNKNOWN=0)
    const aAlignScore = a.alignment ? getAlignmentScore(a.alignment) : 0;
    const bAlignScore = b.alignment ? getAlignmentScore(b.alignment) : 0;
    if (aAlignScore !== bAlignScore) return bAlignScore - aAlignScore;

    // 3. effectiveAvailableHours descending
    const aHours = a.effectiveCapacity?.effectiveAvailableHours ?? 0;
    const bHours = b.effectiveCapacity?.effectiveAvailableHours ?? 0;
    if (aHours !== bHours) return bHours - aHours;

    // 4. Proximity (SAME_TEAM > SAME_DEPARTMENT > OTHER)
    const proximityOrder = { SAME_TEAM: 0, SAME_DEPARTMENT: 1, OTHER: 2 };
    const aProx = proximityOrder[a.proximity];
    const bProx = proximityOrder[b.proximity];
    if (aProx !== bProx) return aProx - bProx;

    // 5. Deterministic tie-breaker
    return a.personId.localeCompare(b.personId);
  });

  return rankedCandidates;
}

/**
 * Check if candidate's seniority meets requirement
 */
function checkSeniorityMatch(
  candidateSeniority: string | null,
  requiredSeniority: SeniorityLevel
): { matches: boolean; reason: string } {
  if (!candidateSeniority) {
    return { matches: false, reason: "Seniority unknown" };
  }

  const seniorityLevels: Record<string, number> = {
    JUNIOR: 1,
    MID: 2,
    SENIOR: 3,
    LEAD: 4,
    PRINCIPAL: 5,
  };

  const candidateLevel = seniorityLevels[candidateSeniority.toUpperCase()] ?? 0;
  const requiredLevel = seniorityLevels[requiredSeniority] ?? 0;

  if (candidateLevel >= requiredLevel) {
    return { matches: true, reason: `Meets ${requiredSeniority} requirement` };
  }

  return {
    matches: false,
    reason: `Below ${requiredSeniority} level (is ${candidateSeniority})`,
  };
}

/**
 * Full candidate resolution: pool selection + ranking
 * 
 * Returns candidates with poolMetrics for issue derivation.
 */
export async function resolveWorkCandidates(
  workspaceId: string,
  workRequest: WorkRequest
): Promise<CandidatePoolResult> {
  const thresholds = getWorkspaceThresholds(workspaceId);

  // Step 1: Get candidate pool
  const poolResult = await getCandidatePool({
    workspaceId,
    domainType: workRequest.domainType,
    domainId: workRequest.domainId,
    requiredRoleType: workRequest.requiredRoleType,
    requiredSeniority: workRequest.requiredSeniority,
  });

  if (poolResult.candidates.length === 0) {
    return {
      candidates: [],
      explanation: [...poolResult.explanation, "No candidates found in pool"],
      poolMetrics: poolResult.poolMetrics,
    };
  }

  // Step 2: Rank candidates
  const rankedCandidates = await rankCandidates({
    candidates: poolResult.candidates,
    workRequest,
    workspaceId,
    minCapacityThreshold: thresholds.minCapacityForCoverage,
  });

  return {
    candidates: rankedCandidates,
    explanation: poolResult.explanation,
    poolMetrics: poolResult.poolMetrics,
  };
}
