/**
 * Phase I: Decision Authority Module
 * 
 * Re-exports for decision authority resolution.
 */

export {
  DECISION_EVIDENCE_VERSION,
  DECISION_SEMANTICS_VERSION,
  DECISION_DATA_ASSUMPTIONS,
  getDecisionResponseMeta,
  buildDecisionEvidence,
  computeDecisionConfidence,
  type DecisionResponseMeta,
  type AvailabilityStatus,
  type ResolvedPerson,
  type ResolvedEscalationStep,
  type FirstAvailable,
  type UnresolvableRole,
  type DecisionAuthorityEvidence,
  type DecisionAuthorityResolution,
} from "./types";

export { resolveDecisionAuthority } from "./resolveDecisionAuthority";
