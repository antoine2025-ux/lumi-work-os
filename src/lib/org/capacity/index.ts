/**
 * Capacity Module
 * 
 * Phase G: Capacity contracts and effective capacity resolution.
 */

export {
  getCapacityContracts,
  getCapacityContractsBatch,
  resolveActiveContract,
  resolveContractForWindow,
  resolveActiveContractBatch,
  getContractedHoursForWindow,
  detectContractOverlaps,
  DEFAULT_WEEKLY_CAPACITY_HOURS,
  type CapacityContract,
  type ContractResolution,
} from "./read";

export {
  resolveEffectiveCapacity,
  resolveEffectiveCapacityBatch,
  computeEffectiveCapacity,
  hasAvailableCapacity,
  getCapacityStatusLabel,
  type EffectiveCapacity,
  type CapacityConfidence,
  type EffectiveCapacityInput,
} from "./resolveEffectiveCapacity";

export {
  DEFAULT_CAPACITY_THRESHOLDS,
  DEFAULT_ISSUE_WINDOW_DAYS,
  EVIDENCE_VERSION,
  SEMANTICS_VERSION,
  CAPACITY_DATA_ASSUMPTIONS,
  COVERAGE_DATA_ASSUMPTIONS,
  getWorkspaceThresholds,
  formatThresholdExplanation,
  getDefaultIssueWindow,
  serializeIssueWindow,
  getCapacityResponseMeta,
  getCoverageResponseMeta,
  type CapacityThresholds,
  type IssueWindow,
  type ResponseMeta,
} from "./thresholds";
