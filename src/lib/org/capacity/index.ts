/**
 * Capacity Module
 *
 * Phase G: Capacity contracts and effective capacity resolution.
 * Capacity v1: Status, team rollups, and graduated thresholds.
 * Capacity calc contract v1.0: Task-based commitment, weekly snapshots, AT_RISK status.
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
  computeEffectiveCapacityV2,
  hasAvailableCapacity,
  getCapacityStatusLabel,
  type EffectiveCapacity,
  type EffectiveCapacityV2,
  type EffectiveCapacityV2Input,
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
  getWorkingHoursConfig,
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
  getPersonCapacityStatusV2,
  getTeamCapacityStatus,
  getStatusUI,
  STATUS_UI_MAP,
  DEFAULT_SNAPSHOT_THRESHOLDS,
  type PersonCapacityStatus,
  type TeamCapacityStatus,
  type PersonCapacityMeta,
  type TeamCapacityRollup,
  type StatusUI,
  type StatusSeverity,
  type CapacitySnapshotStatus,
  type CapacitySnapshotThresholds,
} from "./status";

export {
  computeTeamCapacityRollup,
  computeDepartmentRollup,
  computeAllTeamRollups,
  type TeamMemberCapacity,
  type DepartmentCapacityRollup,
} from "./teamRollup";

export {
  getTaskEstimatedHours,
  getTaskHoursInWindow,
  getPersonTaskCommitmentHours,
  getPersonTaskCommitmentByProject,
  getPersonTaskCommitmentHoursBatch,
  DEFAULT_TASK_EFFORT_SETTINGS,
  type TaskForEffort,
  type TaskEffortSettings,
  type TaskEffortResult,
  type TaskCommitmentResult,
  type ProjectTaskCommitment,
} from "./task-effort";

export {
  computeWeeklySnapshot,
  computeWeeklySnapshotBatch,
  type WeeklySnapshotResult,
} from "./compute-weekly-snapshot";

export {
  classifyCalendarEvent,
  classifyEvents,
  computeMeetingHoursUnion,
  DEFAULT_WORKING_HOURS,
  type CalendarEventClassification,
  type ClassifiedEvent,
  type RawCalendarEvent,
  type WorkingHoursConfig,
} from "./calendar-classification";

export {
  getPersonMeetingHours,
  getPersonMeetingHoursBatch,
  type MeetingHoursResult,
} from "./calendar-meeting-hours";

export {
  invalidatePersonCapacity,
  invalidateProjectCapacity,
} from "./invalidation";
