/**
 * Project Health Answer Formatter
 *
 * Pure function: ProjectHealthSnapshotV0 → LoopbrainAnswerEnvelopeV0
 * No DB calls. Fully testable.
 *
 * @see src/lib/loopbrain/contract/projectHealth.v0.ts
 * @see src/lib/loopbrain/contract/answer-envelope.v0.ts
 */

import type {
  LoopbrainAnswerEnvelopeV0,
  EvidenceValue,
} from "../contract/answer-envelope.v0";
import type {
  ProjectHealthSnapshotV0,
} from "../contract/projectHealth.v0";
import {
  PROJECT_HEALTH_PATHS_V0,
  hasCriticalIssues,
} from "../contract/projectHealth.v0";
import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";

// =============================================================================
// Public API
// =============================================================================

/**
 * Format a ProjectHealthSnapshotV0 into a LoopbrainAnswerEnvelopeV0.
 *
 * The snapshot must have been successfully built (non-null).
 * For missing/failed snapshots, use formatProjectHealthBlockedEnvelope.
 */
export function formatProjectHealthEnvelope(
  snapshot: ProjectHealthSnapshotV0,
  questionId: string
): LoopbrainAnswerEnvelopeV0 {
  const evidence = buildEvidence(snapshot);
  const confidence = computeConfidence(snapshot);
  const summary = buildSummary(snapshot);
  const details = buildDetails(snapshot);
  const actions = buildRecommendedActions(snapshot);
  const warnings = buildWarnings(snapshot);

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
 * Format a BLOCKED envelope when project health data is unavailable.
 */
export function formatProjectHealthBlockedEnvelope(
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
        label: "Ensure project has tasks and activity data",
        deepLink: "/projects",
      },
    ],
  };
}

// =============================================================================
// Internal Helpers
// =============================================================================

function buildEvidence(
  snapshot: ProjectHealthSnapshotV0
): { path: string; value: EvidenceValue }[] {
  const evidence: { path: string; value: EvidenceValue }[] = [];

  // Summary
  evidence.push({
    path: PROJECT_HEALTH_PATHS_V0.OVERALL_HEALTH,
    value: snapshot.summary.overallHealth,
  });
  evidence.push({
    path: PROJECT_HEALTH_PATHS_V0.HEALTH_SCORE,
    value: snapshot.summary.healthScore,
  });
  evidence.push({
    path: PROJECT_HEALTH_PATHS_V0.ON_TRACK,
    value: snapshot.summary.onTrack,
  });

  // Velocity
  evidence.push({
    path: PROJECT_HEALTH_PATHS_V0.COMPLETION_RATE,
    value: snapshot.velocity.completionRate,
  });
  evidence.push({
    path: PROJECT_HEALTH_PATHS_V0.THROUGHPUT,
    value: {
      tasksPerWeek: snapshot.velocity.throughput.tasksPerWeek,
      pointsPerWeek: snapshot.velocity.throughput.pointsPerWeek,
    } as EvidenceValue,
  });

  // Progress
  evidence.push({
    path: PROJECT_HEALTH_PATHS_V0.TASK_PROGRESS,
    value: {
      total: snapshot.progress.tasks.total,
      completed: snapshot.progress.tasks.completed,
      inProgress: snapshot.progress.tasks.inProgress,
      blocked: snapshot.progress.tasks.blocked,
      todo: snapshot.progress.tasks.todo,
    } as EvidenceValue,
  });

  // Risks
  evidence.push({
    path: PROJECT_HEALTH_PATHS_V0.RISK_COUNT,
    value: snapshot.risks.length,
  });

  // Resource health
  evidence.push({
    path: PROJECT_HEALTH_PATHS_V0.UTILIZATION,
    value: snapshot.resourceHealth.utilizationPct,
  });

  // Momentum
  evidence.push({
    path: PROJECT_HEALTH_PATHS_V0.TREND_DIRECTION,
    value: snapshot.momentum.trendDirection,
  });

  // Blockers
  evidence.push({
    path: PROJECT_HEALTH_PATHS_V0.BLOCKER_COUNT,
    value: snapshot.blockers.length,
  });

  return evidence;
}

function computeConfidence(snapshot: ProjectHealthSnapshotV0): number {
  let confidence = 0.7;

  // More tasks → better data → higher confidence
  if (snapshot.progress.tasks.total >= 10) {
    confidence += 0.1;
  } else if (snapshot.progress.tasks.total >= 5) {
    confidence += 0.05;
  }

  // Velocity trend available → richer analysis
  if (snapshot.momentum.confidence > 0.5) {
    confidence += 0.05;
  }

  // Critical state is easier to be confident about
  if (hasCriticalIssues(snapshot)) {
    confidence += 0.05;
  }

  return Math.min(confidence, 0.95);
}

function buildSummary(snapshot: ProjectHealthSnapshotV0): string {
  const { projectName, summary, velocity, risks, blockers, momentum } =
    snapshot;

  const healthLabel = summary.overallHealth.toLowerCase().replace("_", " ");
  const completionPct = Math.round(velocity.completionRate * 100);
  const parts: string[] = [
    `${projectName} is ${healthLabel} (score: ${summary.healthScore.toFixed(2)}).`,
  ];

  if (risks.length > 0 || blockers.length > 0) {
    parts.push(
      `${risks.length} active risk${risks.length !== 1 ? "s" : ""} and ${blockers.length} blocker${blockers.length !== 1 ? "s" : ""}.`
    );
  }

  parts.push(
    `Completion: ${completionPct}%. Momentum: ${momentum.trendDirection.toLowerCase()}.`
  );

  return parts.join(" ");
}

function buildDetails(snapshot: ProjectHealthSnapshotV0): string[] {
  const details: string[] = [];
  const { progress, risks, resourceHealth, momentum, blockers } = snapshot;

  // Task breakdown
  const t = progress.tasks;
  details.push(
    `Tasks: ${t.completed}/${t.total} done, ${t.inProgress} in progress, ${t.blocked} blocked, ${t.todo} to do`
  );

  // Epics
  if (progress.epics.total > 0) {
    details.push(
      `Epics: ${progress.epics.completed}/${progress.epics.total} completed`
    );
  }

  // Milestones
  if (progress.milestones.total > 0) {
    const m = progress.milestones;
    details.push(
      `Milestones: ${m.completed}/${m.total} completed, ${m.overdue} overdue, ${m.upcoming} upcoming`
    );
  }

  // Top risks
  const criticalRisks = risks.filter((r) => r.severity === "CRITICAL");
  const highRisks = risks.filter((r) => r.severity === "HIGH");
  if (criticalRisks.length > 0) {
    details.push(
      `Critical risks: ${criticalRisks.map((r) => r.description).join("; ")}`
    );
  }
  if (highRisks.length > 0) {
    details.push(
      `High risks: ${highRisks.map((r) => r.description).join("; ")}`
    );
  }

  // Resource utilization
  details.push(
    `Team: ${resourceHealth.teamSize} members, ${Math.round(resourceHealth.utilizationPct * 100)}% utilized, ${resourceHealth.unassignedTaskCount} unassigned tasks`
  );

  // Bottlenecks
  if (resourceHealth.bottlenecks.length > 0) {
    details.push(
      `Bottlenecks: ${resourceHealth.bottlenecks.map((b) => `${b.personName} (${b.blockedTaskCount} blocked)`).join(", ")}`
    );
  }

  // Blockers
  if (blockers.length > 0) {
    const longestBlocked = Math.max(...blockers.map((b) => b.daysBlocked));
    details.push(
      `${blockers.length} active blocker${blockers.length !== 1 ? "s" : ""}, longest blocked ${longestBlocked} days`
    );
  }

  // Momentum
  const delta = momentum.velocityDelta;
  if (delta.percentChange !== 0) {
    const dir = delta.percentChange > 0 ? "up" : "down";
    details.push(
      `Velocity ${dir} ${Math.abs(Math.round(delta.percentChange * 100))}% vs previous period`
    );
  }

  return details;
}

function buildRecommendedActions(
  snapshot: ProjectHealthSnapshotV0
): { label: string; deepLink?: string }[] {
  const actions: { label: string; deepLink?: string }[] = [];

  if (snapshot.blockers.length > 0) {
    actions.push({
      label: `Resolve ${snapshot.blockers.length} blocker${snapshot.blockers.length !== 1 ? "s" : ""}`,
      deepLink: `/projects/${snapshot.projectId}`,
    });
  }

  const criticalRisks = snapshot.risks.filter((r) => r.severity === "CRITICAL");
  if (criticalRisks.length > 0) {
    actions.push({
      label: `Address ${criticalRisks.length} critical risk${criticalRisks.length !== 1 ? "s" : ""}`,
      deepLink: `/projects/${snapshot.projectId}`,
    });
  }

  if (snapshot.momentum.trendDirection === "DECLINING") {
    actions.push({
      label: "Investigate velocity decline",
      deepLink: `/projects/${snapshot.projectId}`,
    });
  }

  if (snapshot.resourceHealth.bottlenecks.length > 0) {
    actions.push({
      label: "Review resource bottlenecks",
      deepLink: `/projects/${snapshot.projectId}`,
    });
  }

  if (snapshot.resourceHealth.unassignedTaskCount > 0) {
    actions.push({
      label: `Assign ${snapshot.resourceHealth.unassignedTaskCount} unassigned task${snapshot.resourceHealth.unassignedTaskCount !== 1 ? "s" : ""}`,
      deepLink: `/projects/${snapshot.projectId}`,
    });
  }

  if (snapshot.progress.milestones.overdue > 0) {
    actions.push({
      label: `Review ${snapshot.progress.milestones.overdue} overdue milestone${snapshot.progress.milestones.overdue !== 1 ? "s" : ""}`,
      deepLink: `/projects/${snapshot.projectId}`,
    });
  }

  return actions.slice(0, 4);
}

function buildWarnings(snapshot: ProjectHealthSnapshotV0): string[] {
  const warnings: string[] = [];

  if (snapshot.progress.tasks.total === 0) {
    warnings.push("No tasks found — health assessment may be unreliable.");
  }

  if (snapshot.momentum.confidence < 0.3) {
    warnings.push(
      "Insufficient history for reliable momentum analysis."
    );
  }

  if (snapshot.resourceHealth.teamSize === 0) {
    warnings.push("No team members allocated to this project.");
  }

  return warnings;
}
