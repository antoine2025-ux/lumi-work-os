/**
 * Capacity Module
 * 
 * Phase G: Capacity contracts and effective capacity resolution.
 * Capacity v1: Status, team rollups, and graduated thresholds.
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

export {
  getPersonCapacityStatus,
  getTeamCapacityStatus,
  getStatusUI,
  STATUS_UI_MAP,
  type PersonCapacityStatus,
  type TeamCapacityStatus,
  type PersonCapacityMeta,
  type TeamCapacityRollup,
  type StatusUI,
  type StatusSeverity,
} from "./status";

export {
  computeTeamCapacityRollup,
  computeDepartmentRollup,
  computeAllTeamRollups,
  type TeamMemberCapacity,
  type DepartmentCapacityRollup,
} from "./teamRollup";
