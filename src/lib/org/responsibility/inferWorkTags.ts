/**
 * Phase K: Work Tag Inference
 *
 * Deterministic inference of work tags when explicit tags are absent.
 * 
 * Critical invariant: Inferred tags are NEVER auto-persisted back to WorkRequest.
 * Inferred tags are computed at resolution time only.
 */

import { prisma } from "@/lib/db";
import type { WorkRequest } from "@prisma/client";
import type { InferredWorkTags } from "./types";

// ============================================================================
// Decision Domain to Tag Mapping
// ============================================================================

/**
 * Maps decision domain keys to responsibility tags.
 * Conservative mapping - only well-known domains.
 */
const DECISION_DOMAIN_TAG_MAP: Record<string, string> = {
  SECURITY: "SECURITY_REVIEW",
  HIRING: "HIRING_INTERVIEW",
  COMPLIANCE: "COMPLIANCE_REVIEW",
  ARCHITECTURE: "ENGINEERING_ARCHITECTURE",
  BUDGET: "FINANCE_REVIEW",
};

// ============================================================================
// Main Inference Function
// ============================================================================

/**
 * Infer work tags for a WorkRequest when explicit tags are absent.
 * 
 * Inference rules (in priority order):
 * 1. If requiredRoleType set → lookup profile → use primaryTags
 * 2. If decisionDomainKey set → map to responsibility tag
 * 3. Else: no inference (UNKNOWN alignment)
 * 
 * Note: Team category inference is intentionally omitted in v1 (too aggressive).
 */
export async function inferWorkTags(
  workspaceId: string,
  workRequest: WorkRequest
): Promise<InferredWorkTags> {
  // Rule 1: Infer from requiredRoleType profile
  if (workRequest.requiredRoleType) {
    const profile = await prisma.roleResponsibilityProfile.findUnique({
      where: {
        workspaceId_roleType: {
          workspaceId,
          roleType: workRequest.requiredRoleType,
        },
      },
      include: {
        primaryTags: { select: { key: true } },
      },
    });

    if (profile && profile.primaryTags.length > 0) {
      return {
        tags: profile.primaryTags.map((t) => t.key),
        source: "ROLE_PROFILE",
        explanation: [
          `Inferred from role profile: ${workRequest.requiredRoleType}`,
          `Primary tags: ${profile.primaryTags.map((t) => t.key).join(", ")}`,
        ],
      };
    }
  }

  // Rule 2: Infer from decisionDomainKey
  if (workRequest.decisionDomainKey) {
    const mappedTag = DECISION_DOMAIN_TAG_MAP[workRequest.decisionDomainKey];
    if (mappedTag) {
      // Verify the tag exists in the workspace
      const tag = await prisma.responsibilityTag.findUnique({
        where: {
          workspaceId_key: { workspaceId, key: mappedTag },
        },
      });

      if (tag && !tag.isArchived) {
        return {
          tags: [mappedTag],
          source: "DECISION_DOMAIN",
          explanation: [
            `Inferred from decision domain: ${workRequest.decisionDomainKey}`,
            `Mapped to tag: ${mappedTag}`,
          ],
        };
      }
    }
  }

  // No inference possible
  return {
    tags: [],
    source: "NONE",
    explanation: ["No tags inferred - work request has no explicit tags and no inference rules matched"],
  };
}

/**
 * Get work tags for a WorkRequest (explicit or inferred).
 * Returns explicit tags if present, otherwise attempts inference.
 */
export async function getWorkTagsOrInfer(
  workspaceId: string,
  workRequest: WorkRequest & { workTags?: { key: string }[] }
): Promise<{
  tags: string[];
  source: "EXPLICIT" | "INFERRED";
  explanation: string[];
}> {
  // Check for explicit tags
  if (workRequest.workTags && workRequest.workTags.length > 0) {
    return {
      tags: workRequest.workTags.map((t) => t.key),
      source: "EXPLICIT",
      explanation: ["Tags explicitly set on work request"],
    };
  }

  // Attempt inference
  const inferred = await inferWorkTags(workspaceId, workRequest);
  
  if (inferred.tags.length > 0) {
    return {
      tags: inferred.tags,
      source: "INFERRED",
      explanation: inferred.explanation,
    };
  }

  return {
    tags: [],
    source: "INFERRED",
    explanation: inferred.explanation,
  };
}
