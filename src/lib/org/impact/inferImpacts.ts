/**
 * Phase J: Impact Inference Rules
 *
 * Minimal, deterministic inference when explicit impacts are absent.
 * Each rule is documented and only applied when conditions are met.
 */

import type { WorkRequest } from "@prisma/client";
import type { InferredImpact, ImpactSubjectType, ImpactType, ImpactSeverity } from "./types";
import { getSubjectMatchKey } from "./types";

// ============================================================================
// Inference Rule Definitions
// ============================================================================

type InferenceRule = {
  id: string;
  description: string;
  condition: (workRequest: WorkRequest) => boolean;
  infer: (workRequest: WorkRequest) => InferredImpact | null;
};

/**
 * Rule: domain-team
 * If domainType === TEAM AND domainId is set → that TEAM is affected
 */
const domainTeamRule: InferenceRule = {
  id: "domain-team",
  description: "domainType=TEAM → TEAM affected",
  condition: (wr) => wr.domainType === "TEAM" && wr.domainId !== null,
  infer: (wr) => ({
    subjectType: "TEAM" as ImpactSubjectType,
    subjectId: wr.domainId,
    roleType: null,
    domainKey: null,
    impactType: "DEPENDENT" as ImpactType,
    severity: "MEDIUM" as ImpactSeverity,
    explanation: `Team is the domain for this work request`,
    ruleId: "domain-team",
    ruleDescription: "domainType=TEAM → TEAM affected",
  }),
};

/**
 * Rule: domain-dept
 * If domainType === DEPARTMENT AND domainId is set → that DEPARTMENT is affected
 */
const domainDeptRule: InferenceRule = {
  id: "domain-dept",
  description: "domainType=DEPARTMENT → DEPARTMENT affected",
  condition: (wr) => wr.domainType === "DEPARTMENT" && wr.domainId !== null,
  infer: (wr) => ({
    subjectType: "DEPARTMENT" as ImpactSubjectType,
    subjectId: wr.domainId,
    roleType: null,
    domainKey: null,
    impactType: "DEPENDENT" as ImpactType,
    severity: "MEDIUM" as ImpactSeverity,
    explanation: `Department is the domain for this work request`,
    ruleId: "domain-dept",
    ruleDescription: "domainType=DEPARTMENT → DEPARTMENT affected",
  }),
};

/**
 * Rule: decision-domain
 * If decisionDomainKey is set → that DECISION_DOMAIN is affected
 */
const decisionDomainRule: InferenceRule = {
  id: "decision-domain",
  description: "decisionDomainKey set → DECISION_DOMAIN affected",
  condition: (wr) => wr.decisionDomainKey !== null,
  infer: (wr) => ({
    subjectType: "DECISION_DOMAIN" as ImpactSubjectType,
    subjectId: null,
    roleType: null,
    domainKey: wr.decisionDomainKey,
    impactType: "CONSULT" as ImpactType,
    severity: "MEDIUM" as ImpactSeverity,
    explanation: `Work request is linked to decision domain: ${wr.decisionDomainKey}`,
    ruleId: "decision-domain",
    ruleDescription: "decisionDomainKey set → DECISION_DOMAIN affected",
  }),
};

/**
 * Rule: required-role
 * If requiredRoleType is set → that ROLE is affected (informational)
 */
const requiredRoleRule: InferenceRule = {
  id: "required-role",
  description: "requiredRoleType set → ROLE affected",
  condition: (wr) => wr.requiredRoleType !== null,
  infer: (wr) => ({
    subjectType: "ROLE" as ImpactSubjectType,
    subjectId: null,
    roleType: wr.requiredRoleType,
    domainKey: null,
    impactType: "INFORM" as ImpactType,
    severity: "LOW" as ImpactSeverity,
    explanation: `Role "${wr.requiredRoleType}" is required for this work`,
    ruleId: "required-role",
    ruleDescription: "requiredRoleType set → ROLE affected",
  }),
};

// All rules in priority order
const INFERENCE_RULES: InferenceRule[] = [
  domainTeamRule,
  domainDeptRule,
  decisionDomainRule,
  requiredRoleRule,
];

/**
 * IMPORTANT: v1 inference rules do NOT create WORK_REQUEST impacts.
 * 
 * If future rules add WORK_REQUEST impacts (e.g., inferring from linked work),
 * the resolver or API layer MUST check for cycles to prevent:
 * - Self-referencing (A → A)
 * - 2-node cycles (A → B and B → A)
 * 
 * The current API layer blocks explicit cycles; inferred cycles would need
 * resolver-side filtering or rule constraints.
 */

// ============================================================================
// Main Inference Function
// ============================================================================

/**
 * Infer impacts for a work request based on its properties.
 *
 * @param workRequest - The work request to infer impacts for
 * @param explicitSubjectKeys - Set of subject match keys that have explicit impacts
 *                              (used to suppress inferred impacts for same subject)
 * @returns Array of inferred impacts and list of applied rule IDs
 */
export function inferImpacts(
  workRequest: WorkRequest,
  explicitSubjectKeys: Set<string> = new Set()
): {
  inferredImpacts: InferredImpact[];
  appliedRules: string[];
  suppressedCount: number;
} {
  const inferredImpacts: InferredImpact[] = [];
  const appliedRules: string[] = [];
  let suppressedCount = 0;

  for (const rule of INFERENCE_RULES) {
    // Check if rule condition is met
    if (!rule.condition(workRequest)) {
      continue;
    }

    // Generate the inferred impact
    const impact = rule.infer(workRequest);
    if (!impact) {
      continue;
    }

    // Check if explicit impact exists for same subject (explicit overrides inferred)
    const subjectKey = getSubjectMatchKey(impact);
    if (explicitSubjectKeys.has(subjectKey)) {
      // Suppress this inferred impact
      suppressedCount++;
      continue;
    }

    // Add the inferred impact
    inferredImpacts.push(impact);
    appliedRules.push(rule.id);
  }

  return {
    inferredImpacts,
    appliedRules,
    suppressedCount,
  };
}

/**
 * Get all available inference rule IDs (for documentation/debugging).
 */
export function getInferenceRuleIds(): string[] {
  return INFERENCE_RULES.map((r) => r.id);
}

/**
 * Get description for an inference rule.
 */
export function getInferenceRuleDescription(ruleId: string): string | null {
  const rule = INFERENCE_RULES.find((r) => r.id === ruleId);
  return rule?.description ?? null;
}
