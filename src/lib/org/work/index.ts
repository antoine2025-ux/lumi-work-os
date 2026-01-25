/**
 * Phase H: Work Intake Module
 * 
 * Re-exports for work request handling and feasibility resolution.
 */

export {
  getWorkspaceEffortDefaults,
  getOrCreateWorkspaceEffortDefaults,
  updateWorkspaceEffortDefaults,
  getEstimatedEffortHours,
  tshirtToHours,
  getTShirtToHoursMapping,
  serializeEffortDefaults,
  DEFAULT_EFFORT_HOURS,
} from "./effortDefaults";

export {
  WORK_EVIDENCE_VERSION,
  WORK_SEMANTICS_VERSION,
  WORK_REQUEST_DATA_ASSUMPTIONS,
  WORK_FEASIBILITY_DATA_ASSUMPTIONS,
  getWorkRequestResponseMeta,
  getWorkFeasibilityResponseMeta,
  type WorkResponseMeta,
  type EffectiveCapacitySummary,
  type WorkFeasibilityResult,
  type WorkCandidate,
  type CandidatePoolResult,
} from "./types";

export {
  getCandidatePool,
  rankCandidates,
  resolveWorkCandidates,
} from "./resolveWorkCandidates";

export {
  resolveWorkFeasibility,
} from "./resolveWorkFeasibility";
