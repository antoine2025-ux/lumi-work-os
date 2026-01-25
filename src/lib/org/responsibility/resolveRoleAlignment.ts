/**
 * Phase K: Role Alignment Resolver
 *
 * Produces deterministic alignment judgments for work requests and candidates.
 * 
 * Matching Logic:
 * 1. Get person's effective tags = profile.primaryTags + profile.allowedTags + overrides
 * 2. Get person's forbidden tags = profile.forbiddenTags
 * 3. Get work's required tags = workRequest.workTags (or inferred)
 * 4. Compute alignment:
 *    - ALIGNED: At least one work tag in effective tags, no forbidden conflicts
 *    - PARTIAL: Some tags match, some don't (multi-tag work)
 *    - MISALIGNED: No tags match OR forbidden conflict
 *    - UNKNOWN: Work has no tags and inference failed
 * 
 * Critical invariant: Forbidden takes precedence over overrides.
 */

import type { WorkRequest } from "@prisma/client";
import {
  type AlignmentResult,
  type RoleAlignmentResolution,
  type BatchAlignmentResolution,
  type AlignmentEvidence,
  buildAlignmentConfidence,
  getResponsibilityResponseMeta,
  RESPONSIBILITY_SEMANTICS_VERSION,
} from "./types";
import { getEffectivePersonTags } from "./read";
import { getWorkTagsOrInfer } from "./inferWorkTags";
import type { ExplainabilityBlock, ExplainDependency } from "@/lib/org/explainability/types";

// ============================================================================
// Single Person Alignment
// ============================================================================

export type ResolveAlignmentInput = {
  workspaceId: string;
  workRequest: WorkRequest & { workTags?: { key: string }[] };
  personId: string;
  personName: string;
  roleType: string | null;
};

/**
 * Resolve role alignment for a single person against a work request.
 */
export async function resolveRoleAlignment(
  input: ResolveAlignmentInput
): Promise<RoleAlignmentResolution> {
  const { workspaceId, workRequest, personId, personName, roleType } = input;

  // Step 1: Get work tags (explicit or inferred)
  const workTagsResult = await getWorkTagsOrInfer(workspaceId, workRequest);
  const workTags = workTagsResult.tags;
  const workTagsSource = workTagsResult.source;

  // Step 2: Get person's effective tags
  const personTags = await getEffectivePersonTags(workspaceId, personId, roleType);
  const { effectiveTags, forbiddenTags, overrideTags, profileExists } = personTags;

  // Step 3: Compute alignment
  const { alignment, matchedTags, missingTags, forbiddenConflicts, explanation } =
    computeAlignment({
      workTags,
      effectiveTags,
      forbiddenTags,
      roleType,
      workTagsSource,
      profileExists,
    });

  // Step 4: Build confidence
  const confidence = buildAlignmentConfidence({
    workTagsExplicit: workTagsSource === "EXPLICIT",
    profileExists,
  });

  // Step 5: Build evidence
  const evidence: AlignmentEvidence = {
    personId,
    roleType,
    workRequestId: workRequest.id,
    workTags,
    workTagsSource,
    effectiveTags,
    forbiddenTags,
    overrideTags,
    derivedFrom: {
      responsibilitySemanticsVersion: RESPONSIBILITY_SEMANTICS_VERSION,
    },
  };

  // Build explainability
  const dependsOn: ExplainDependency[] = [
    { type: "DATA", label: "Work request tags", reference: workRequest.id },
    { type: "DATA", label: "Person responsibility profile", reference: personId },
  ];
  if (workTagsSource === "INFERRED") {
    dependsOn.push({ type: "RULE", label: "Tag inference rules" });
  }

  const why: string[] = [];
  if (alignment === "ALIGNED") {
    why.push(`Person has matching tags: ${matchedTags.join(", ")}`);
  } else if (alignment === "PARTIAL") {
    why.push(`Person matches some tags (${matchedTags.length}) but missing: ${missingTags.join(", ")}`);
  } else if (alignment === "MISALIGNED") {
    if (forbiddenConflicts.length > 0) {
      why.push(`Person has forbidden tags: ${forbiddenConflicts.join(", ")}`);
    } else {
      why.push(`Person has no matching tags. Work requires: ${workTags.join(", ")}`);
    }
  } else {
    why.push("Work has no tags and inference failed");
  }

  const whatChangesIt: string[] = [
    "Update work request tags",
    "Update person's responsibility profile",
    "Add responsibility overrides",
  ];

  const explainability: ExplainabilityBlock = {
    blockId: `${workRequest.id}:${personId}:alignment`,
    kind: "CAPACITY", // Using CAPACITY kind for role alignment
    why,
    dependsOn,
    whatChangesIt,
  };

  return {
    personId,
    personName,
    roleType,
    alignment,
    matchedTags,
    missingTags,
    forbiddenConflicts,
    explanation,
    confidence,
    evidence,
    responseMeta: getResponsibilityResponseMeta(),
    explainability,
  };
}

// ============================================================================
// Batch Alignment (for candidate list)
// ============================================================================

export type BatchAlignmentInput = {
  workspaceId: string;
  workRequest: WorkRequest & { workTags?: { key: string }[] };
  candidates: Array<{
    personId: string;
    personName: string;
    roleType: string | null;
  }>;
};

/**
 * Resolve role alignment for multiple candidates against a work request.
 */
export async function resolveRoleAlignmentBatch(
  input: BatchAlignmentInput
): Promise<BatchAlignmentResolution> {
  const { workspaceId, workRequest, candidates } = input;

  // Get work tags once (shared across all candidates)
  const workTagsResult = await getWorkTagsOrInfer(workspaceId, workRequest);

  // Resolve alignment for each candidate
  const alignments = await Promise.all(
    candidates.map((candidate) =>
      resolveRoleAlignment({
        workspaceId,
        workRequest: { ...workRequest, workTags: workTagsResult.tags.map((key) => ({ key })) },
        personId: candidate.personId,
        personName: candidate.personName,
        roleType: candidate.roleType,
      })
    )
  );

  // Compute summary
  const summary = {
    alignedCount: alignments.filter((a) => a.alignment === "ALIGNED").length,
    partialCount: alignments.filter((a) => a.alignment === "PARTIAL").length,
    misalignedCount: alignments.filter((a) => a.alignment === "MISALIGNED").length,
    unknownCount: alignments.filter((a) => a.alignment === "UNKNOWN").length,
  };

  return {
    workRequestId: workRequest.id,
    workRequestTitle: workRequest.title,
    workTags: workTagsResult.tags,
    workTagsSource: workTagsResult.source,
    alignments,
    summary,
    responseMeta: getResponsibilityResponseMeta(),
  };
}

// ============================================================================
// Core Alignment Logic
// ============================================================================

type ComputeAlignmentInput = {
  workTags: string[];
  effectiveTags: string[];
  forbiddenTags: string[];
  roleType: string | null;
  workTagsSource: "EXPLICIT" | "INFERRED";
  profileExists: boolean;
};

type ComputeAlignmentResult = {
  alignment: AlignmentResult;
  matchedTags: string[];
  missingTags: string[];
  forbiddenConflicts: string[];
  explanation: string[];
};

function computeAlignment(input: ComputeAlignmentInput): ComputeAlignmentResult {
  const { workTags, effectiveTags, forbiddenTags, roleType, workTagsSource, profileExists } = input;
  const explanation: string[] = [];

  // Case 1: No work tags → UNKNOWN (with detailed explanation)
  if (workTags.length === 0) {
    explanation.push("Work request has no responsibility tags (explicit or inferred)");
    explanation.push("Unable to determine alignment without work tags");
    return {
      alignment: "UNKNOWN",
      matchedTags: [],
      missingTags: [],
      forbiddenConflicts: [],
      explanation,
    };
  }

  // Case 1b: No role profile exists for the person's roleType
  if (roleType && !profileExists && effectiveTags.length === 0) {
    explanation.push(`Role profile missing for roleType=${roleType}`);
    explanation.push("Unable to determine alignment without role responsibilities defined");
    return {
      alignment: "UNKNOWN",
      matchedTags: [],
      missingTags: workTags,
      forbiddenConflicts: [],
      explanation,
    };
  }

  // Compute tag overlaps
  const matchedTags = workTags.filter((tag) => effectiveTags.includes(tag));
  const missingTags = workTags.filter((tag) => !effectiveTags.includes(tag));
  const forbiddenConflicts = workTags.filter((tag) => forbiddenTags.includes(tag));

  // Case 2: Forbidden conflict → MISALIGNED (takes precedence)
  if (forbiddenConflicts.length > 0) {
    for (const tag of forbiddenConflicts) {
      explanation.push(`Tag ${tag} is forbidden for role ${roleType ?? "unknown"}`);
    }
    return {
      alignment: "MISALIGNED",
      matchedTags,
      missingTags,
      forbiddenConflicts,
      explanation,
    };
  }

  // Case 3: No matches → MISALIGNED
  if (matchedTags.length === 0) {
    if (roleType) {
      explanation.push(`Role ${roleType} has no matching tags for this work`);
    } else {
      explanation.push("Person has no role type assigned");
    }
    explanation.push(`Work requires: ${workTags.join(", ")}`);
    explanation.push(`Person has: ${effectiveTags.length > 0 ? effectiveTags.join(", ") : "none"}`);
    return {
      alignment: "MISALIGNED",
      matchedTags,
      missingTags,
      forbiddenConflicts,
      explanation,
    };
  }

  // Case 4: Partial match → PARTIAL
  if (missingTags.length > 0) {
    explanation.push(`Partial match: ${matchedTags.length}/${workTags.length} tags`);
    explanation.push(`Matched: ${matchedTags.join(", ")}`);
    explanation.push(`Missing: ${missingTags.join(", ")}`);
    return {
      alignment: "PARTIAL",
      matchedTags,
      missingTags,
      forbiddenConflicts,
      explanation,
    };
  }

  // Case 5: Full match → ALIGNED
  explanation.push(`Fully aligned: all ${workTags.length} work tag(s) matched`);
  if (workTagsSource === "INFERRED") {
    explanation.push("Note: Work tags were inferred (not explicitly set)");
  }
  return {
    alignment: "ALIGNED",
    matchedTags,
    missingTags: [],
    forbiddenConflicts: [],
    explanation,
  };
}

// ============================================================================
// Helpers for Candidate Ranking Integration
// ============================================================================

/**
 * Get alignment score for ranking purposes.
 * Higher is better.
 */
export function getAlignmentScore(alignment: AlignmentResult): number {
  switch (alignment) {
    case "ALIGNED":
      return 3;
    case "PARTIAL":
      return 2;
    case "MISALIGNED":
      return 1;
    case "UNKNOWN":
      return 0;
  }
}
