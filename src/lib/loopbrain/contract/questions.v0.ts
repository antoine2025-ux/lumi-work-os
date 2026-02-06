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
];
