/**
 * Phase H: Work Feasibility Resolution
 * 
 * Computes staffing feasibility and recommendations for a work request.
 * 
 * Recommendation Logic (deterministic):
 * - PROCEED: viableCount >= 1 AND top candidate can cover effort AND constraints met
 * - REASSIGN: viableCount >= 1 AND partial coverage AND combined capacity >= effort
 * - DELAY: viableCount == 0 AND no role/seniority mismatch (timing issue)
 * - REQUEST_SUPPORT: role mismatch OR non-splittable work exceeds capacity
 * 
 * Key invariant: capacityGapHours = Math.max(0, estimatedEffortHours - totalViableCapacity)
 */

import type { WorkRequest } from "@prisma/client";
import { resolveWorkCandidates } from "./resolveWorkCandidates";
import { getEstimatedEffortHours, getOrCreateWorkspaceEffortDefaults } from "./effortDefaults";
import { getWorkspaceThresholds, SEMANTICS_VERSION as CAPACITY_SEMANTICS_VERSION } from "@/lib/org/capacity/thresholds";
import type { CapacityConfidence } from "@/lib/org/capacity/resolveEffectiveCapacity";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { resolveDecisionAuthority } from "@/lib/org/decision/resolveDecisionAuthority";
import {
  getWorkFeasibilityResponseMeta,
  WORK_SEMANTICS_VERSION,
  type WorkFeasibilityResult,
  type WorkCandidate,
} from "./types";
import { resolveWorkImpact } from "@/lib/org/impact/resolveWorkImpact";
import { getWorkTagsOrInfer } from "@/lib/org/responsibility/inferWorkTags";
import type { ExplainabilityBlock, ExplainDependency } from "@/lib/org/explainability/types";
import { prisma } from "@/lib/db";

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve feasibility for a work request
 * 
 * Pure resolver that computes:
 * - Whether the work can be staffed
 * - Recommended action (PROCEED/REASSIGN/DELAY/REQUEST_SUPPORT)
 * - Ranked candidate list with explanations
 */
export async function resolveWorkFeasibility(
  workspaceId: string,
  workRequest: WorkRequest
): Promise<WorkFeasibilityResult> {
  const thresholds = getWorkspaceThresholds(workspaceId);
  const effortDefaults = await getOrCreateWorkspaceEffortDefaults(workspaceId);
  
  // Calculate estimated effort hours
  const estimatedEffortHours = getEstimatedEffortHours(workRequest, effortDefaults);
  
  const timeWindow = {
    start: workRequest.desiredStart.toISOString(),
    end: workRequest.desiredEnd.toISOString(),
  };

  // Get candidates
  const { candidates, explanation: poolExplanation, poolMetrics } = await resolveWorkCandidates(
    workspaceId,
    workRequest
  );

  // Compute metrics
  const viableCandidates = candidates.filter((c) => c.isViable);
  const totalViableCapacity = viableCandidates.reduce(
    (sum, c) => sum + (c.effectiveCapacity?.effectiveAvailableHours ?? 0),
    0
  );
  const capacityGapHours = Math.max(0, estimatedEffortHours - totalViableCapacity);

  // Check role/seniority constraints using poolMetrics
  // Role mismatch: role filter was applied AND there were candidates before BUT 0 matched
  const hasRoleMismatch = poolMetrics.roleFilterApplied && 
    poolMetrics.totalBeforeRoleFilter > 0 && 
    poolMetrics.matchingRoleCount === 0;
  const hasSeniorityMismatch = !!(workRequest.requiredSeniority && viableCandidates.length > 0 &&
    viableCandidates.every((c) => !matchesSeniority(c, workRequest.requiredSeniority!)));

  // Determine feasibility
  const canStaff = viableCandidates.length > 0 && capacityGapHours === 0;
  const topCandidate = viableCandidates[0];
  const topCandidateCanCover = topCandidate && 
    (topCandidate.effectiveCapacity?.effectiveAvailableHours ?? 0) >= estimatedEffortHours;

  // Phase K: Check if all viable candidates are misaligned
  const allViableMisaligned = viableCandidates.length > 0 && 
    viableCandidates.every((c) => c.alignment === "MISALIGNED");

  // Phase P: Resolve impact data for recommendation context
  let impactResolution: Awaited<ReturnType<typeof resolveWorkImpact>> | null = null;
  let recommendationContext: WorkFeasibilityResult["recommendationContext"] = undefined;
  let decisionDomainKeysFromImpacts: string[] = []; // For P5 domain selection
  
  try {
    impactResolution = await resolveWorkImpact(workspaceId, workRequest, {
      includeInferred: true,
    });

    // Extract impact signals for recommendation
    const impactSeverity = impactResolution.summary.highestSeverity as "HIGH" | "MEDIUM" | "LOW" | null;
    const hasBlockedImpacts = impactResolution.impacts.some(
      (impact) => impact.impactType === "BLOCKED"
    ) ?? false;

    // Phase P: Extract DECISION_DOMAIN keys from impacts for escalation
    // For DECISION_DOMAIN impacts, domainKey is in the impactKey format: ${workRequestId}:DECISION_DOMAIN:${domainKey}:${impactType}
    const decisionDomainImpacts = impactResolution.impacts.filter(
      (impact) => impact.subjectType === "DECISION_DOMAIN"
    );
    // Extract domainKey from impactKey (format: ${workRequestId}:DECISION_DOMAIN:${domainKey}:${impactType})
    // Note: impactKey format is workRequestId:subjectType:subjectIdentity:impactType
    // For DECISION_DOMAIN, subjectIdentity is the domainKey
    decisionDomainKeysFromImpacts = decisionDomainImpacts
      .map((impact) => {
        const parts = impact.impactKey.split(":");
        // Format: workRequestId:DECISION_DOMAIN:domainKey:impactType
        // Example: "wr123:DECISION_DOMAIN:engineering:CONSULT"
        if (parts.length >= 4 && parts[1] === "DECISION_DOMAIN") {
          return parts[2]; // domainKey is the third part (subjectIdentity)
        }
        return null;
      })
      .filter((key): key is string => key !== null && key !== "unknown");

    recommendationContext = {
      impactSeverity,
      hasBlockedImpacts: hasBlockedImpacts ?? false,
      requiresEscalation: false, // Will be set by P5 if needed
    };
  } catch (err: unknown) {
    // Non-blocking: log error but continue without impact context
    console.warn("[resolveWorkFeasibility] Failed to resolve impact:", err);
  }

  // Compute recommendation (with impact signals if available)
  const recommendation = computeRecommendation({
    viableCount: viableCandidates.length,
    candidateCount: candidates.length,
    topCandidateCanCover,
    totalViableCapacity,
    estimatedEffortHours,
    hasRoleMismatch,
    hasSeniorityMismatch,
    requiredRoleType: workRequest.requiredRoleType,
    requiredSeniority: workRequest.requiredSeniority,
    allViableMisaligned,
    impactSeverity: recommendationContext?.impactSeverity,
    hasBlockedImpacts: recommendationContext?.hasBlockedImpacts,
    requiresEscalation: recommendationContext?.requiresEscalation,
  });

  // Build feasibility explanation
  const feasibilityExplanation: string[] = [...poolExplanation];
  if (viableCandidates.length === 0) {
    feasibilityExplanation.push("No viable candidates found in the requested time window");
  } else {
    feasibilityExplanation.push(
      `${viableCandidates.length} viable candidate(s) with ${totalViableCapacity.toFixed(1)}h total capacity`
    );
  }
  if (capacityGapHours > 0) {
    feasibilityExplanation.push(
      `Capacity gap: ${capacityGapHours.toFixed(1)}h (need ${estimatedEffortHours}h, have ${totalViableCapacity.toFixed(1)}h)`
    );
  }

  // Build confidence
  const confidence = computeFeasibilityConfidence(candidates, viableCandidates);

  // Collect blocking issues
  const blockingIssues: OrgIssueMetadata[] = [];
  // Note: Issue derivation would be called separately; this is a placeholder
  // for issues that would be derived from the feasibility result

  // Build explainability block
  const dependsOn: ExplainDependency[] = [
    { type: "DATA", label: "Work effort estimate", reference: workRequest.id },
    { type: "DATA", label: "People allocations" },
    { type: "CONFIG", label: "Capacity thresholds" },
    { type: "TIME_WINDOW", label: "Next 7 days", reference: `${timeWindow.start}/${timeWindow.end}` },
  ];

  // Phase P: Add impact signals to dependencies if available
  if (impactResolution) {
    dependsOn.push({ type: "DATA", label: "Work impact resolution", reference: workRequest.id });
  }

  const why: string[] = [];
  if (viableCandidates.length === 0) {
    why.push("No viable candidates found in the requested time window");
  } else if (capacityGapHours > 0) {
    why.push(`This work requires ${estimatedEffortHours.toFixed(1)}h but only ${totalViableCapacity.toFixed(1)}h is available`);
  } else {
    why.push(`${viableCandidates.length} viable candidate(s) with sufficient capacity`);
  }

  // Phase P: Add impact-driven reasoning when impact affects recommendation
  if (recommendationContext?.hasBlockedImpacts) {
    why.push("This work has BLOCKED impacts that prevent completion");
  }
  if (recommendationContext?.impactSeverity === "HIGH" && recommendation.action !== "PROCEED") {
    why.push("High-impact work detected - recommendation adjusted to reduce risk");
  }
  if (recommendationContext?.requiresEscalation) {
    why.push("Decision authority escalation required before proceeding");
  }

  const whatChangesIt: string[] = [];
  if (capacityGapHours > 0) {
    whatChangesIt.push("Reduce required effort");
    whatChangesIt.push("Add capacity");
  }
  whatChangesIt.push("Extend the work window");

  // Phase P: Add impact-driven changes
  if (recommendationContext?.hasBlockedImpacts) {
    whatChangesIt.push("Resolve blocked impacts");
  }
  if (recommendationContext?.impactSeverity === "HIGH") {
    whatChangesIt.push("Split work across multiple assignees to reduce risk");
  }
  if (recommendationContext?.requiresEscalation) {
    whatChangesIt.push("Escalate to decision authority");
  }

  const explainability: ExplainabilityBlock = {
    blockId: `${workRequest.id}:feasibility`,
    kind: "FEASIBILITY",
    why,
    dependsOn,
    whatChangesIt,
  };

  // Phase P: Resolve escalation contacts if REQUEST_SUPPORT and escalation is needed
  // Escalation is needed if:
  // 1. Recommendation is REQUEST_SUPPORT AND decisionDomainKey is set, OR
  // 2. Impact-based escalation is required (BLOCKED impacts or HIGH severity)
  let escalationContacts: WorkFeasibilityResult["escalationContacts"] = null;
  let requiresEscalation = false;

  // Phase P: Deterministic domain selection for impact-based escalation
  let selectedDomainKey: string | null = null;
  
  if (recommendationContext?.hasBlockedImpacts || recommendationContext?.impactSeverity === "HIGH") {
    // Rule 1: If WorkRequest.decisionDomainKey exists → use it
    if (workRequest.decisionDomainKey) {
      selectedDomainKey = workRequest.decisionDomainKey;
      requiresEscalation = true;
    }
    // Rule 2: Else if impact includes DECISION_DOMAIN subjects → pick sorted(domainKey)[0]
    else if (decisionDomainKeysFromImpacts.length > 0) {
      // Sort domainKeys alphabetically and pick first
      const sortedDomainKeys = [...decisionDomainKeysFromImpacts].sort();
      selectedDomainKey = sortedDomainKeys[0]; // First alphabetically
      requiresEscalation = true;
    }
    // Rule 3: Else → no decision authority context (skip escalation)
  }

  // Also check if REQUEST_SUPPORT and decisionDomainKey is set (existing logic)
  const needsEscalation = 
    recommendation.action === "REQUEST_SUPPORT" &&
    (workRequest.decisionDomainKey || selectedDomainKey);

  if (needsEscalation) {
    const domainKeyToUse = workRequest.decisionDomainKey || selectedDomainKey;
    if (domainKeyToUse) {
      const authorityResolution = await resolveDecisionAuthority({
        workspaceId,
        domainKey: domainKeyToUse,
        timeWindow: {
          start: workRequest.desiredStart,
          end: workRequest.desiredEnd,
        },
      });

    if (authorityResolution.primary || authorityResolution.escalation.length > 0) {
      const whyTheseContacts: string[] = [];

      if (authorityResolution.primary) {
        whyTheseContacts.push(
          `Primary decider for ${workRequest.decisionDomainKey}: ${authorityResolution.primary.personName}`
        );
      }

      if (authorityResolution.escalation.length > 0) {
        whyTheseContacts.push(
          `${authorityResolution.escalation.length} escalation contact(s) configured`
        );
      }

      if (authorityResolution.firstAvailable) {
        whyTheseContacts.push(
          `First available: ${authorityResolution.firstAvailable.personName} (${
            authorityResolution.firstAvailable.whyChosen[0] ?? "based on availability"
          })`
        );
      }

      escalationContacts = {
        domainKey: domainKeyToUse,
        primary: authorityResolution.primary
          ? {
              personId: authorityResolution.primary.personId,
              personName: authorityResolution.primary.personName,
            }
          : null,
        escalation: authorityResolution.escalation.map((step) => ({
          personId: step.personId,
          personName: step.personName,
        })),
        firstAvailable: authorityResolution.firstAvailable
          ? {
              personId: authorityResolution.firstAvailable.personId,
              personName: authorityResolution.firstAvailable.personName,
            }
          : null,
        whyTheseContacts,
      };

      // Phase P: Update recommendationContext with escalation requirement
      if (requiresEscalation) {
        recommendationContext = {
          ...recommendationContext,
          requiresEscalation: true,
        };
      }
    }
    }
  }

  // Format candidates for response
  const formattedCandidates = candidates.map((c, index) => ({
    personId: c.personId,
    personName: c.personName,
    rank: index + 1,
    whyChosen: c.whyChosen,
    effectiveCapacitySummary: c.effectiveCapacity ?? {
      weeklyCapacityHours: 0,
      contractedHoursForWindow: 0,
      availabilityFactor: 0,
      allocatedHours: 0,
      effectiveAvailableHours: 0,
    },
    confidence: c.confidence ?? {
      score: 0,
      factors: { completeness: 0, consistency: 0, freshness: 0 },
      explanation: ["No capacity data"],
    },
  }));

  // Phase J: Compute impact summary (using already-resolved impact data)
  let impactSummary: WorkFeasibilityResult["impactSummary"] = null;
  if (impactResolution) {
    impactSummary = {
      affectedCount: impactResolution.summary.totalCount,
      highestImpactSeverity: impactResolution.summary.highestSeverity as "LOW" | "MEDIUM" | "HIGH" | null,
      hasDecisionDomainImpact: impactResolution.summary.affectedDecisionDomainCount > 0,
    };
  }

  // Phase K: Compute alignment summary from candidate data
  let alignmentSummary: WorkFeasibilityResult["alignmentSummary"] = null;
  try {
    const workTagsResult = await getWorkTagsOrInfer(workspaceId, workRequest);
    const alignedCount = candidates.filter((c) => c.alignment === "ALIGNED").length;
    const partialCount = candidates.filter((c) => c.alignment === "PARTIAL").length;
    const misalignedCount = candidates.filter((c) => c.alignment === "MISALIGNED").length;
    const unknownCount = candidates.filter((c) => c.alignment === "UNKNOWN" || c.alignment === null).length;

    alignmentSummary = {
      alignedCount,
      partialCount,
      misalignedCount,
      unknownCount,
      allMisaligned: viableCandidates.length > 0 && viableCandidates.every((c) => c.alignment === "MISALIGNED"),
      workTags: workTagsResult.tags,
      workTagsSource: workTagsResult.source,
    };
  } catch (err: unknown) {
    // Non-blocking: log error but continue with null alignmentSummary
    console.warn("[resolveWorkFeasibility] Failed to compute alignment summary:", err);
  }

  // O1: Compute missing requirements (only for non-PROCEED recommendations)
  let missingRequirements: WorkFeasibilityResult["missingRequirements"] = undefined;
  if (recommendation.action !== "PROCEED") {
    missingRequirements = await computeMissingRequirements(
      workspaceId,
      workRequest,
      candidates,
    );
  }

  return {
    workRequestId: workRequest.id,
    timeWindow,
    estimatedEffortHours,
    thresholdsUsed: {
      minCapacityForWork: thresholds.minCapacityForCoverage,
      overallocationThreshold: thresholds.overallocationThreshold,
    },
    feasibility: {
      canStaff,
      capacityGapHours,
      explanation: feasibilityExplanation,
      confidence,
    },
    recommendation,
    recommendationContext,
    candidates: formattedCandidates,
    evidence: {
      candidateCount: candidates.length,
      viableCount: viableCandidates.length,
      blockingIssues,
      poolMetrics,
      derivedFrom: {
        capacitySemanticsVersion: CAPACITY_SEMANTICS_VERSION,
        workSemanticsVersion: WORK_SEMANTICS_VERSION,
      },
    },
    escalationContacts,
    impactSummary,
    alignmentSummary,
    missingRequirements,
    responseMeta: getWorkFeasibilityResponseMeta(),
    explainability,
  };
}

// ============================================================================
// O1: Missing Requirements Computation
// ============================================================================

/**
 * Compute structural gaps that prevent the system from answering the work question.
 *
 * These are *structural* (no data configured), NOT *transient* (data exists but capacity
 * is full / zero availability). All checks are scoped to workspaceId.
 *
 * IMPORTANT CONTRACT — confidence.factors.completeness === 0:
 *   This MUST mean "no CapacityContract AND no PersonAvailability exist" (structural
 *   absence). It does NOT mean "capacity data exists but effective hours are 0" (that
 *   is transient overload). If the completeness factor semantics ever change in
 *   resolveEffectiveCapacity, this logic MUST be updated in tandem to avoid instructing
 *   users to "set capacity" when the real issue is overload.
 *
 * Performance: the RoleResponsibilityProfile query only fires when requiredRoleType is
 * set. In-function cache avoids duplicate DB round-trips if called twice for the same
 * roleType within one feasibility evaluation.
 */
const _profileCountCache = new Map<string, number>();

async function computeMissingRequirements(
  workspaceId: string,
  workRequest: WorkRequest,
  candidates: WorkCandidate[],
): Promise<WorkFeasibilityResult["missingRequirements"]> {
  const missing: NonNullable<WorkFeasibilityResult["missingRequirements"]> = {};

  // 1. Decision domain: structurally missing if workRequest.decisionDomainKey is null
  if (!workRequest.decisionDomainKey) {
    missing.decisionDomain = true;
  }

  // 2. Capacity: missing only if NO candidate has any capacity data at all.
  //    See contract note above re: completeness === 0.
  if (candidates.length > 0 && workRequest.requiredRoleType) {
    const allLackCapacityData = candidates.every(
      (c) => c.confidence && c.confidence.factors.completeness === 0
    );
    if (allLackCapacityData) {
      missing.capacityForRoles = [workRequest.requiredRoleType];
    }
  } else if (candidates.length === 0 && workRequest.requiredRoleType) {
    // No candidates at all — capacity is structurally absent for this role
    missing.capacityForRoles = [workRequest.requiredRoleType];
  }

  // 3. Responsibility profiles: missing only if RoleResponsibilityProfile
  //    truly does not exist for the roleType in this workspace.
  //    Uses in-function cache to avoid duplicate DB hits within one eval cycle.
  if (workRequest.requiredRoleType) {
    const cacheKey = `${workspaceId}:${workRequest.requiredRoleType}`;
    let profileCount = _profileCountCache.get(cacheKey);
    if (profileCount === undefined) {
      profileCount = await prisma.roleResponsibilityProfile.count({
        where: { workspaceId, roleType: workRequest.requiredRoleType },
      });
      _profileCountCache.set(cacheKey, profileCount);
      // Evict cache after brief window (avoids stale data across requests)
      setTimeout(() => _profileCountCache.delete(cacheKey), 5_000);
    }
    if (profileCount === 0) {
      missing.responsibilityProfiles = [workRequest.requiredRoleType];
    }
  }

  return Object.keys(missing).length > 0 ? missing : undefined;
}

// ============================================================================
// Recommendation Logic
// ============================================================================

type RecommendationInput = {
  viableCount: number;
  candidateCount: number;
  topCandidateCanCover: boolean;
  totalViableCapacity: number;
  estimatedEffortHours: number;
  hasRoleMismatch: boolean;
  hasSeniorityMismatch: boolean;
  requiredRoleType: string | null;
  requiredSeniority: string | null;
  // Phase K: Alignment data
  allViableMisaligned?: boolean;
  // Phase P: Impact signals
  impactSeverity?: "HIGH" | "MEDIUM" | "LOW" | null;
  hasBlockedImpacts?: boolean;
  requiresEscalation?: boolean;
};

function computeRecommendation(input: RecommendationInput): {
  action: "PROCEED" | "REASSIGN" | "DELAY" | "REQUEST_SUPPORT";
  explanation: string[];
} {
  const {
    viableCount,
    candidateCount,
    topCandidateCanCover,
    totalViableCapacity,
    estimatedEffortHours,
    hasRoleMismatch,
    hasSeniorityMismatch,
    requiredRoleType,
    requiredSeniority,
  } = input;

  // Evaluation flow: First, feasibility produces a baseline capacity-driven recommendation (existing logic).
  // Then, impact rules are evaluated and can override that baseline.

  // Step 1: Compute baseline capacity-driven recommendation
  const baselineExplanation: string[] = [];
  let baselineAction: "PROCEED" | "REASSIGN" | "DELAY" | "REQUEST_SUPPORT";

  // PROCEED: All conditions met
  if (viableCount >= 1 && topCandidateCanCover && !hasRoleMismatch && !hasSeniorityMismatch) {
    baselineExplanation.push("Top candidate can fully cover the estimated effort");
    if (viableCount > 1) {
      baselineExplanation.push(`${viableCount - 1} additional viable candidate(s) available as backup`);
    }
    baselineAction = "PROCEED";
  }
  // REASSIGN: Partial coverage but combined capacity sufficient
  else if (viableCount >= 1 && !topCandidateCanCover && totalViableCapacity >= estimatedEffortHours) {
    baselineExplanation.push("No single candidate can cover the full effort");
    baselineExplanation.push(
      `Combined capacity of ${viableCount} candidates (${totalViableCapacity.toFixed(1)}h) can cover ${estimatedEffortHours}h`
    );
    baselineExplanation.push("Consider splitting work across multiple assignees");
    baselineAction = "REASSIGN";
  }
  // REQUEST_SUPPORT: Role/seniority mismatch
  else if (hasRoleMismatch || hasSeniorityMismatch) {
    if (hasRoleMismatch) {
      baselineExplanation.push(`No candidates match required role: ${requiredRoleType}`);
    }
    if (hasSeniorityMismatch) {
      baselineExplanation.push(`No viable candidates meet seniority requirement: ${requiredSeniority}`);
    }
    baselineExplanation.push("Consider hiring, training, or adjusting requirements");
    baselineAction = "REQUEST_SUPPORT";
  }
  // Phase K: REQUEST_SUPPORT when all viable candidates are misaligned
  else if (input.allViableMisaligned && viableCount > 0) {
    baselineExplanation.push("All viable candidates have role misalignment");
    baselineExplanation.push("No aligned candidates exist for this work type");
    baselineExplanation.push("Consider capability development or role adjustments");
    baselineAction = "REQUEST_SUPPORT";
  }
  // REQUEST_SUPPORT: Not enough capacity even combined
  else if (viableCount > 0 && totalViableCapacity < estimatedEffortHours) {
    baselineExplanation.push(
      `Total viable capacity (${totalViableCapacity.toFixed(1)}h) is less than required (${estimatedEffortHours}h)`
    );
    baselineExplanation.push("Consider requesting additional resources or extending the timeline");
    baselineAction = "REQUEST_SUPPORT";
  }
  // DELAY: No viable candidates but no constraint mismatch (timing issue)
  else if (viableCount === 0 && candidateCount > 0 && !hasRoleMismatch) {
    baselineExplanation.push("Candidates exist but none are available in the requested time window");
    baselineExplanation.push("Consider adjusting the timeline to when candidates become available");
    baselineAction = "DELAY";
  }
  // DELAY: No candidates at all (possibly scope issue)
  else if (candidateCount === 0) {
    baselineExplanation.push("No candidates found matching the domain criteria");
    baselineExplanation.push("Consider broadening the search scope or adjusting the timeline");
    baselineAction = "DELAY";
  }
  // Fallback: REQUEST_SUPPORT
  else {
    baselineExplanation.push("Unable to staff with current constraints");
    baselineAction = "REQUEST_SUPPORT";
  }

  // Step 2: Apply impact rules (override baseline if applicable)
  const explanation: string[] = [...baselineExplanation];

  // Rule 1: BLOCKED impacts rule (highest priority, overrides baseline)
  // BLOCKED means work cannot complete unless subject acts/changes, so reassigning doesn't remove blockage.
  // This wins even if capacity says PROCEED.
  if (input.hasBlockedImpacts === true) {
    explanation.unshift("This work has BLOCKED impacts that prevent completion");
    explanation.push("Work cannot proceed until blocked impacts are resolved");
    return { action: "REQUEST_SUPPORT", explanation };
  }

  // Rule 2: HIGH impact bias (overrides baseline if applicable)
  // If impactSeverity === "HIGH" AND baseline would be PROCEED → downgrade to REASSIGN
  // (or REQUEST_SUPPORT if no split possible)
  if (input.impactSeverity === "HIGH" && baselineAction === "PROCEED") {
    explanation.unshift("High-impact work detected");
    explanation.push("High-impact work should be split across multiple assignees to reduce risk");
    // If we can split (REASSIGN is possible), downgrade to REASSIGN
    if (viableCount >= 1 && totalViableCapacity >= estimatedEffortHours) {
      return { action: "REASSIGN", explanation };
    }
    // Otherwise, request support
    return { action: "REQUEST_SUPPORT", explanation };
  }

  // Rule 3: Decision domain escalation (overrides baseline)
  if (input.requiresEscalation === true) {
    explanation.unshift("Decision authority escalation required");
    explanation.push("This work requires escalation to decision authority before proceeding");
    return { action: "REQUEST_SUPPORT", explanation };
  }

  // Step 3: Return baseline (no impact rules applied)
  return { action: baselineAction, explanation };
}

// ============================================================================
// Helper Functions
// ============================================================================


function matchesSeniority(candidate: WorkCandidate, requiredSeniority: string): boolean {
  if (!candidate.seniorityLevel) return false;
  
  const seniorityLevels: Record<string, number> = {
    JUNIOR: 1,
    MID: 2,
    SENIOR: 3,
    LEAD: 4,
    PRINCIPAL: 5,
  };

  const candidateLevel = seniorityLevels[candidate.seniorityLevel.toUpperCase()] ?? 0;
  const requiredLevel = seniorityLevels[requiredSeniority.toUpperCase()] ?? 0;

  return candidateLevel >= requiredLevel;
}

function computeFeasibilityConfidence(
  allCandidates: WorkCandidate[],
  viableCandidates: WorkCandidate[]
): CapacityConfidence {
  if (allCandidates.length === 0) {
    return {
      score: 0,
      factors: { completeness: 0, consistency: 1, freshness: 1 },
      explanation: ["No candidates found; confidence is low"],
    };
  }

  // Average confidence from all candidates with capacity data
  const candidatesWithData = allCandidates.filter((c) => c.confidence);
  if (candidatesWithData.length === 0) {
    return {
      score: 0.5,
      factors: { completeness: 0.5, consistency: 1, freshness: 1 },
      explanation: ["Limited capacity data available for candidates"],
    };
  }

  const avgScore = candidatesWithData.reduce(
    (sum, c) => sum + (c.confidence?.score ?? 0),
    0
  ) / candidatesWithData.length;

  const avgCompleteness = candidatesWithData.reduce(
    (sum, c) => sum + (c.confidence?.factors.completeness ?? 0),
    0
  ) / candidatesWithData.length;

  const avgConsistency = candidatesWithData.reduce(
    (sum, c) => sum + (c.confidence?.factors.consistency ?? 0),
    0
  ) / candidatesWithData.length;

  const avgFreshness = candidatesWithData.reduce(
    (sum, c) => sum + (c.confidence?.factors.freshness ?? 0),
    0
  ) / candidatesWithData.length;

  const explanation: string[] = [];
  if (viableCandidates.length > 0) {
    explanation.push(`Based on capacity data from ${candidatesWithData.length} candidate(s)`);
  } else {
    explanation.push("No viable candidates; recommendation based on available data");
  }

  if (avgCompleteness < 0.7) {
    explanation.push("Some candidates have incomplete capacity data");
  }

  return {
    score: avgScore,
    factors: {
      completeness: avgCompleteness,
      consistency: avgConsistency,
      freshness: avgFreshness,
    },
    explanation,
  };
}
