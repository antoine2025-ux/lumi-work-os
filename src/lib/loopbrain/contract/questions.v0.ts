/**
 * Canonical Loopbrain Question Set v0
 *
 * Each question defines:
 * - requiredSnapshotPaths: gates availability (data must exist)
 * - evidencePaths: what must be cited in answers (grounds reasoning, prevents hallucination)
 * - blockingOn: which blockers prevent an answer
 *
 * This file is the coverage oracle for Org completeness.
 */

import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";

export type LoopbrainQuestionV0 = {
  id: string;
  question: string;
  /** Gates whether question is answerable (data exists) */
  requiredSnapshotPaths: string[];
  /** Snapshot paths that must be cited in answers (grounds reasoning) */
  evidencePaths: string[];
  /** Blockers that prevent an answer */
  blockingOn: OrgReadinessBlocker[];
  /** Guidance for envelope builders / prompts. Not content. */
  answerTemplate?: {
    summaryHint: string;
    detailHints?: string[];
  };
};

export const LOOPBRAIN_QUESTIONS_V0: LoopbrainQuestionV0[] = [
  {
    id: "can-we-take-on-new-work",
    question: "Can we take on new backend work next month?",
    answerTemplate: {
      summaryHint: "Compare capacity.pctConfigured and work.openCount with roles to assess headroom.",
      detailHints: ["Mention capacity utilization", "Call out work by recommendation action"],
    },
    requiredSnapshotPaths: ["capacity", "work", "roles"],
    evidencePaths: [
      "capacity.pctConfigured",
      "capacity.issueCount",
      "work.openCount",
      "work.byRecommendationAction",
      "roles",
    ],
    blockingOn: [
      "NO_ACTIVE_PEOPLE",
      "CAPACITY_COVERAGE_BELOW_MIN",
      "WORK_CANNOT_EVALUATE_BASELINE",
    ],
  },
  {
    id: "who-decides-pricing",
    question: "Who decides pricing changes?",
    requiredSnapshotPaths: ["decisionDomains"],
    evidencePaths: ["decisionDomains"],
    blockingOn: ["NO_DECISION_DOMAINS", "NO_ACTIVE_PEOPLE"],
  },
  {
    id: "where-structurally-overloaded",
    question: "Where are we structurally overloaded?",
    requiredSnapshotPaths: ["capacity", "issues"],
    evidencePaths: [
      "capacity",
      "issues.countsBySeverity",
      "issues.topIssueIds",
    ],
    blockingOn: ["NO_ACTIVE_PEOPLE", "CAPACITY_COVERAGE_BELOW_MIN"],
  },
  {
    id: "ownership-clean",
    question: "Is ownership clean across teams and departments?",
    answerTemplate: {
      summaryHint: "Cite coverage.ownership.coveragePct and conflictCount.",
      detailHints: ["State coverage percentage", "Call out any conflicts"],
    },
    requiredSnapshotPaths: ["coverage.ownership", "readiness.blockers"],
    evidencePaths: ["coverage.ownership.coveragePct", "coverage.ownership.conflictCount"],
    blockingOn: ["NO_TEAMS", "OWNERSHIP_INCOMPLETE"],
  },
  {
    id: "responsibility-profiles-complete",
    question: "Are role responsibility profiles complete?",
    requiredSnapshotPaths: ["responsibility", "roles"],
    evidencePaths: ["responsibility.pctCovered", "responsibility.profileCount", "roles"],
    blockingOn: ["NO_ACTIVE_PEOPLE", "RESPONSIBILITY_PROFILES_MISSING"],
  },
  {
    id: "work-baseline-established",
    question: "Do we have a stable work baseline for reasoning?",
    requiredSnapshotPaths: ["work"],
    evidencePaths: ["work.openCount", "work.byRecommendationAction"],
    blockingOn: ["WORK_CANNOT_EVALUATE_BASELINE"],
  },

  // --- Project Health questions (Phase 2) ---
  {
    id: "project-health-overview",
    question: "How healthy is this project?",
    answerTemplate: {
      summaryHint:
        "State overall health, completion rate, risk count, and momentum.",
      detailHints: [
        "Break down task progress",
        "List top risks by severity",
        "Describe velocity trend",
        "Note resource utilization",
      ],
    },
    requiredSnapshotPaths: ["summary", "velocity", "progress"],
    evidencePaths: [
      "summary.overallHealth",
      "summary.healthScore",
      "summary.onTrack",
      "velocity.completionRate",
      "velocity.throughput",
      "progress.tasks",
      "risks",
      "momentum.trendDirection",
      "resourceHealth.utilizationPct",
      "blockers",
    ],
    blockingOn: ["NO_PROJECT_DATA", "NO_TASKS"],
  },
  {
    id: "project-on-track",
    question: "Is the project on track for its deadline?",
    answerTemplate: {
      summaryHint:
        "State whether project is on track, citing milestones and velocity.",
    },
    requiredSnapshotPaths: ["summary.onTrack", "progress.milestones"],
    evidencePaths: [
      "summary.onTrack",
      "progress.milestones",
      "velocity.completionRate",
      "momentum.trendDirection",
    ],
    blockingOn: ["NO_PROJECT_DATA", "NO_TASKS"],
  },

  // --- Workload Analysis questions (Phase 2) ---
  {
    id: "person-workload-assessment",
    question: "What is this person's workload like?",
    answerTemplate: {
      summaryHint:
        "State assessment, utilization percentage, and whether person has capacity.",
      detailHints: [
        "Task breakdown by status",
        "Signal alerts",
        "Project spread",
      ],
    },
    requiredSnapshotPaths: ["summary", "taskLoad", "capacityComparison"],
    evidencePaths: [
      "summary.assessment",
      "summary.workloadScore",
      "summary.needsAttention",
      "taskLoad.totalCount",
      "capacityComparison.utilizationPct",
      "capacityComparison.utilizationStatus",
      "capacityComparison.headroomHours",
      "capacityComparison.hasCapacity",
      "signalSummary.totalCount",
      "projectLoadSummary.projectCount",
    ],
    blockingOn: ["NO_PERSON_DATA", "NO_TASK_DATA"],
  },
  {
    id: "team-workload-balance",
    question: "Is the team workload balanced?",
    answerTemplate: {
      summaryHint:
        "State whether team is balanced, citing overloaded/underutilized members.",
    },
    requiredSnapshotPaths: ["teamMetrics", "members"],
    evidencePaths: [
      "teamMetrics.totalMembers",
      "teamMetrics.membersOverloaded",
      "teamMetrics.membersWithCapacity",
      "teamMetrics.avgUtilizationPct",
      "teamMetrics.isBalanced",
      "members",
    ],
    blockingOn: ["NO_ACTIVE_PEOPLE", "NO_TEAMS"],
  },

  // --- Calendar Availability questions (Phase 2) ---
  {
    id: "calendar-availability",
    question: "When is this person available?",
    answerTemplate: {
      summaryHint:
        "State availability assessment, next available slot, and focus hours.",
      detailHints: [
        "Weekly meeting pattern",
        "Upcoming absences",
        "Capacity impact",
        "Scheduling conflicts",
      ],
    },
    requiredSnapshotPaths: ["summary", "forecast", "capacityImpact"],
    evidencePaths: [
      "summary.assessment",
      "summary.availabilityScore",
      "summary.isCurrentlyAvailable",
      "forecast.totalAvailableHours",
      "forecast.nextAvailableSlot",
      "forecast.upcomingAbsences",
      "capacityImpact.effectiveCapacityPct",
      "capacityImpact.focusHoursThisWeek",
      "conflictSummary.totalCount",
    ],
    blockingOn: ["NO_AVAILABILITY_DATA"],
  },
  {
    id: "team-availability",
    question: "Is the team available this week?",
    answerTemplate: {
      summaryHint:
        "State team availability percentage and who is on leave.",
    },
    requiredSnapshotPaths: ["teamMetrics", "members"],
    evidencePaths: [
      "teamMetrics.totalMembers",
      "teamMetrics.availableCount",
      "teamMetrics.onLeaveCount",
      "teamMetrics.teamAvailabilityPct",
      "teamMetrics.isAtRisk",
      "members",
    ],
    blockingOn: ["NO_ACTIVE_PEOPLE", "NO_TEAMS"],
  },

  // --- Entity Connections question (Phase 2) ---
  {
    id: "entity-connections",
    question: "What are this entity's connections?",
    answerTemplate: {
      summaryHint:
        "State the entity, its type, and how many connections it has.",
    },
    requiredSnapshotPaths: ["summary", "nodes", "links"],
    evidencePaths: [
      "summary.nodeCount",
      "summary.linkCount",
      "links.byType",
      "maps.expertise",
      "maps.capacity",
    ],
    blockingOn: ["NO_ACTIVE_PEOPLE"],
  },
];
