/**
 * Workload Analysis Answer Formatter
 *
 * Pure functions: WorkloadAnalysisSnapshotV0 / TeamWorkloadSnapshotV0
 * → LoopbrainAnswerEnvelopeV0
 *
 * No DB calls. Fully testable.
 *
 * @see src/lib/loopbrain/contract/workloadAnalysis.v0.ts
 * @see src/lib/loopbrain/contract/answer-envelope.v0.ts
 */

import type {
  LoopbrainAnswerEnvelopeV0,
  EvidenceValue,
} from "../contract/answer-envelope.v0";
import type {
  WorkloadAnalysisSnapshotV0,
  TeamWorkloadSnapshotV0,
} from "../contract/workloadAnalysis.v0";
import {
  WORKLOAD_ANALYSIS_PATHS_V0,
  isOverloaded,
} from "../contract/workloadAnalysis.v0";
import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";

// =============================================================================
// Public API
// =============================================================================

/**
 * Format a WorkloadAnalysisSnapshotV0 into a LoopbrainAnswerEnvelopeV0.
 */
export function formatWorkloadEnvelope(
  snapshot: WorkloadAnalysisSnapshotV0,
  questionId: string
): LoopbrainAnswerEnvelopeV0 {
  const evidence = buildPersonEvidence(snapshot);
  const confidence = computePersonConfidence(snapshot);
  const summary = buildPersonSummary(snapshot);
  const details = buildPersonDetails(snapshot);
  const actions = buildPersonActions(snapshot);
  const warnings = buildPersonWarnings(snapshot);

  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    questionId,
    answerability: "ANSWERABLE",
    answer: {
      summary,
      details: details.length > 0 ? details : undefined,
    },
    confidence,
    supportingEvidence: evidence,
    blockingFactors: [],
    recommendedNextActions: actions,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Format a TeamWorkloadSnapshotV0 into a LoopbrainAnswerEnvelopeV0.
 */
export function formatTeamWorkloadEnvelope(
  snapshot: TeamWorkloadSnapshotV0,
  questionId: string
): LoopbrainAnswerEnvelopeV0 {
  const evidence = buildTeamEvidence(snapshot);
  const confidence = computeTeamConfidence(snapshot);
  const summary = buildTeamSummary(snapshot);
  const details = buildTeamDetails(snapshot);
  const actions = buildTeamActions(snapshot);

  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    questionId,
    answerability: "ANSWERABLE",
    answer: {
      summary,
      details: details.length > 0 ? details : undefined,
    },
    confidence,
    supportingEvidence: evidence,
    blockingFactors: [],
    recommendedNextActions: actions,
  };
}

/**
 * Format a BLOCKED envelope when workload data is unavailable.
 */
export function formatWorkloadBlockedEnvelope(
  questionId: string,
  blockers: OrgReadinessBlocker[]
): LoopbrainAnswerEnvelopeV0 {
  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    questionId,
    answerability: "BLOCKED",
    answer: null,
    confidence: 0.2,
    supportingEvidence: [],
    blockingFactors: blockers,
    recommendedNextActions: [
      {
        label: "Ensure person has tasks and capacity data",
        deepLink: "/org",
      },
    ],
  };
}

// =============================================================================
// Person-level helpers
// =============================================================================

function buildPersonEvidence(
  snapshot: WorkloadAnalysisSnapshotV0
): { path: string; value: EvidenceValue }[] {
  const evidence: { path: string; value: EvidenceValue }[] = [];

  // Summary
  evidence.push({
    path: WORKLOAD_ANALYSIS_PATHS_V0.ASSESSMENT,
    value: snapshot.summary.assessment,
  });
  evidence.push({
    path: WORKLOAD_ANALYSIS_PATHS_V0.WORKLOAD_SCORE,
    value: snapshot.summary.workloadScore,
  });
  evidence.push({
    path: WORKLOAD_ANALYSIS_PATHS_V0.NEEDS_ATTENTION,
    value: snapshot.summary.needsAttention,
  });

  // Task load
  evidence.push({
    path: WORKLOAD_ANALYSIS_PATHS_V0.TASK_TOTAL,
    value: snapshot.taskLoad.totalCount,
  });

  // Capacity
  evidence.push({
    path: WORKLOAD_ANALYSIS_PATHS_V0.UTILIZATION_PCT,
    value: snapshot.capacityComparison.utilizationPct,
  });
  evidence.push({
    path: WORKLOAD_ANALYSIS_PATHS_V0.UTILIZATION_STATUS,
    value: snapshot.capacityComparison.utilizationStatus,
  });
  evidence.push({
    path: WORKLOAD_ANALYSIS_PATHS_V0.HEADROOM,
    value: snapshot.capacityComparison.headroomHours,
  });
  evidence.push({
    path: WORKLOAD_ANALYSIS_PATHS_V0.HAS_CAPACITY,
    value: snapshot.capacityComparison.hasCapacity,
  });

  // Signals
  evidence.push({
    path: WORKLOAD_ANALYSIS_PATHS_V0.SIGNAL_COUNT,
    value: snapshot.signalSummary.totalCount,
  });

  // Project count
  evidence.push({
    path: WORKLOAD_ANALYSIS_PATHS_V0.PROJECT_COUNT,
    value: snapshot.projectLoadSummary.projectCount,
  });

  return evidence;
}

function computePersonConfidence(
  snapshot: WorkloadAnalysisSnapshotV0
): number {
  let confidence = 0.7;

  // More tasks → richer data
  if (snapshot.taskLoad.totalCount >= 5) {
    confidence += 0.1;
  }

  // Capacity contract exists (non-default hours)
  if (snapshot.capacityComparison.contractedHours !== 40) {
    confidence += 0.05;
  }

  // Overloaded/critical states are easier to assess confidently
  if (isOverloaded(snapshot)) {
    confidence += 0.05;
  }

  return Math.min(confidence, 0.95);
}

function buildPersonSummary(
  snapshot: WorkloadAnalysisSnapshotV0
): string {
  const { personName, summary, capacityComparison } = snapshot;
  const utilPct = Math.round(capacityComparison.utilizationPct * 100);
  const headroom = capacityComparison.headroomHours.toFixed(1);
  const assessment = summary.assessment.toLowerCase();

  const parts: string[] = [
    `${personName}'s workload is ${assessment} at ${utilPct}% utilization with ${headroom}h weekly headroom.`,
  ];

  if (summary.primaryConcern) {
    parts.push(`Primary concern: ${summary.primaryConcern}.`);
  }

  return parts.join(" ");
}

function buildPersonDetails(
  snapshot: WorkloadAnalysisSnapshotV0
): string[] {
  const details: string[] = [];

  // Task breakdown
  const tl = snapshot.taskLoad;
  details.push(`Total tasks: ${tl.totalCount}`);

  if (tl.overdue.count > 0) {
    details.push(`Overdue: ${tl.overdue.count} task${tl.overdue.count !== 1 ? "s" : ""}`);
  }

  // Project spread
  const pl = snapshot.projectLoadSummary;
  details.push(
    `Spread across ${pl.projectCount} project${pl.projectCount !== 1 ? "s" : ""} (${Math.round(pl.totalAllocationPct * 100)}% total allocation)`
  );

  // Capacity
  const cap = snapshot.capacityComparison;
  details.push(
    `Capacity: ${cap.contractedHours}h contracted, ${cap.allocatedHours.toFixed(1)}h allocated, ${cap.estimatedHours.toFixed(1)}h estimated`
  );

  // Top signals
  const criticalSignals = snapshot.signals.filter(
    (s) => s.severity === "CRITICAL"
  );
  const highSignals = snapshot.signals.filter((s) => s.severity === "HIGH");
  if (criticalSignals.length > 0) {
    details.push(
      `Critical alerts: ${criticalSignals.map((s) => s.description).join("; ")}`
    );
  }
  if (highSignals.length > 0) {
    details.push(
      `High alerts: ${highSignals.map((s) => s.description).join("; ")}`
    );
  }

  // Todos
  if (snapshot.todoLoad.openCount > 0) {
    details.push(
      `Open todos: ${snapshot.todoLoad.openCount} (${snapshot.todoLoad.overdueCount} overdue)`
    );
  }

  return details;
}

function buildPersonActions(
  snapshot: WorkloadAnalysisSnapshotV0
): { label: string; deepLink?: string }[] {
  const actions: { label: string; deepLink?: string }[] = [];

  if (
    snapshot.summary.assessment === "OVERLOADED" ||
    snapshot.summary.assessment === "CRITICAL"
  ) {
    actions.push({
      label: `Redistribute tasks from ${snapshot.personName}`,
      deepLink: `/org`,
    });
  }

  if (
    snapshot.summary.assessment === "LIGHT" &&
    snapshot.capacityComparison.hasCapacity
  ) {
    actions.push({
      label: `${snapshot.personName} has capacity — consider assigning more work`,
      deepLink: `/org`,
    });
  }

  if (snapshot.taskLoad.overdue.count > 0) {
    actions.push({
      label: `Address ${snapshot.taskLoad.overdue.count} overdue task${snapshot.taskLoad.overdue.count !== 1 ? "s" : ""}`,
      deepLink: `/my-tasks`,
    });
  }

  if (snapshot.summary.recommendedAction) {
    actions.push({
      label: snapshot.summary.recommendedAction,
    });
  }

  return actions.slice(0, 4);
}

function buildPersonWarnings(
  snapshot: WorkloadAnalysisSnapshotV0
): string[] {
  const warnings: string[] = [];

  if (snapshot.taskLoad.totalCount === 0) {
    warnings.push("No tasks found — workload assessment based on capacity data only.");
  }

  if (snapshot.capacityComparison.contractedHours === 0) {
    warnings.push("No capacity contract found — using default 40h/week.");
  }

  return warnings;
}

// =============================================================================
// Team-level helpers
// =============================================================================

function buildTeamEvidence(
  snapshot: TeamWorkloadSnapshotV0
): { path: string; value: EvidenceValue }[] {
  return [
    {
      path: "teamMetrics.totalMembers",
      value: snapshot.teamMetrics.totalMembers,
    },
    {
      path: "teamMetrics.membersOverloaded",
      value: snapshot.teamMetrics.membersOverloaded,
    },
    {
      path: "teamMetrics.membersWithCapacity",
      value: snapshot.teamMetrics.membersWithCapacity,
    },
    {
      path: "teamMetrics.avgUtilizationPct",
      value: snapshot.teamMetrics.avgUtilizationPct,
    },
    {
      path: "teamMetrics.totalTasks",
      value: snapshot.teamMetrics.totalTasks,
    },
    {
      path: "teamMetrics.totalBlocked",
      value: snapshot.teamMetrics.totalBlocked,
    },
    {
      path: "teamMetrics.isBalanced",
      value: snapshot.teamMetrics.isBalanced,
    },
  ];
}

function computeTeamConfidence(snapshot: TeamWorkloadSnapshotV0): number {
  let confidence = 0.7;

  if (snapshot.teamMetrics.totalMembers >= 3) {
    confidence += 0.1;
  }

  if (snapshot.teamMetrics.totalTasks >= 10) {
    confidence += 0.05;
  }

  return Math.min(confidence, 0.95);
}

function buildTeamSummary(snapshot: TeamWorkloadSnapshotV0): string {
  const { teamName, teamMetrics } = snapshot;
  const avgUtil = Math.round(teamMetrics.avgUtilizationPct * 100);
  const balanced = teamMetrics.isBalanced ? "balanced" : "imbalanced";

  const parts: string[] = [
    `${teamName} workload is ${balanced} with ${avgUtil}% average utilization across ${teamMetrics.totalMembers} members.`,
  ];

  if (teamMetrics.membersOverloaded > 0) {
    parts.push(
      `${teamMetrics.membersOverloaded} member${teamMetrics.membersOverloaded !== 1 ? "s" : ""} overloaded.`
    );
  }

  if (teamMetrics.membersWithCapacity > 0) {
    parts.push(
      `${teamMetrics.membersWithCapacity} member${teamMetrics.membersWithCapacity !== 1 ? "s" : ""} with available capacity.`
    );
  }

  return parts.join(" ");
}

function buildTeamDetails(snapshot: TeamWorkloadSnapshotV0): string[] {
  const details: string[] = [];

  // Per-member breakdown
  const overloaded = snapshot.members.filter(
    (m) => m.assessment === "OVERLOADED" || m.assessment === "CRITICAL"
  );
  const underutilized = snapshot.members.filter(
    (m) => m.assessment === "LIGHT"
  );

  if (overloaded.length > 0) {
    details.push(
      `Overloaded: ${overloaded.map((m) => `${m.personName} (${Math.round(m.utilizationPct * 100)}%)`).join(", ")}`
    );
  }

  if (underutilized.length > 0) {
    details.push(
      `Available capacity: ${underutilized.map((m) => `${m.personName} (${Math.round(m.utilizationPct * 100)}%)`).join(", ")}`
    );
  }

  details.push(
    `Total: ${snapshot.teamMetrics.totalTasks} tasks, ${snapshot.teamMetrics.totalBlocked} blocked`
  );

  return details;
}

function buildTeamActions(
  snapshot: TeamWorkloadSnapshotV0
): { label: string; deepLink?: string }[] {
  const actions: { label: string; deepLink?: string }[] = [];

  if (snapshot.teamMetrics.membersOverloaded > 0) {
    actions.push({
      label: `Rebalance ${snapshot.teamMetrics.membersOverloaded} overloaded member${snapshot.teamMetrics.membersOverloaded !== 1 ? "s" : ""}`,
      deepLink: `/org`,
    });
  }

  if (!snapshot.teamMetrics.isBalanced) {
    actions.push({
      label: "Review team workload distribution",
      deepLink: `/org`,
    });
  }

  if (snapshot.teamMetrics.totalBlocked > 0) {
    actions.push({
      label: `Unblock ${snapshot.teamMetrics.totalBlocked} task${snapshot.teamMetrics.totalBlocked !== 1 ? "s" : ""}`,
      deepLink: `/org`,
    });
  }

  return actions.slice(0, 4);
}
