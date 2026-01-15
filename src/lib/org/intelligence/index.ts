/**
 * Org Intelligence Module
 * 
 * Phase 5: Central exports for org intelligence computation and integration
 */

export {
  computeOrgIntelligence,
  saveIntelligenceSnapshot,
  getLatestIntelligenceSnapshot,
  type OrgIntelligenceResult,
  type OrgIntelligenceSummary,
  type IntelligenceThresholds,
} from "./computeOrgIntelligence";

export {
  getOrgIntelligenceContext,
  buildIntelligencePromptSection,
  enrichOrgContextWithIntelligence,
  getSignalsForEntity,
  getSignalsByType,
  hasCriticalIssues,
  getActionableSummary,
  type OrgIntelligenceContext,
} from "./orgIntelligenceContext";

