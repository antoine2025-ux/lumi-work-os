/**
 * Workload Analysis Contract Tests
 *
 * A. ANSWERABLE envelope validates against JSON schema (person)
 * B. BLOCKED envelope validates against JSON schema
 * C. Evidence paths align with WORKLOAD_ANALYSIS_PATHS_V0
 * D. Team workload envelope validates
 * E. Confidence invariants hold
 * F. Assessment values in summary
 */

import { describe, it, expect } from "vitest";
import {
  formatWorkloadEnvelope,
  formatTeamWorkloadEnvelope,
  formatWorkloadBlockedEnvelope,
} from "@/lib/loopbrain/reasoning/workloadAnswer";
import { validateAnswerEnvelopeV0 } from "@/lib/loopbrain/contract/validateAnswerEnvelope";
import { WORKLOAD_ANALYSIS_PATHS_V0 } from "@/lib/loopbrain/contract/workloadAnalysis.v0";
import type {
  WorkloadAnalysisSnapshotV0,
  TeamWorkloadSnapshotV0,
} from "@/lib/loopbrain/contract/workloadAnalysis.v0";
import { isEvidencePathAllowed } from "./answer-envelope.contract.test";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBalancedWorkload(
  overrides: Partial<WorkloadAnalysisSnapshotV0> = {}
): WorkloadAnalysisSnapshotV0 {
  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    workspaceId: "ws-1",
    personId: "user-1",
    personName: "Alice Smith",
    taskLoad: {
      totalCount: 12,
      totalPoints: 24,
      totalEstimatedHours: 48,
      byStatus: {
        TODO: { count: 3, points: 6, estimatedHours: 12 },
        IN_PROGRESS: { count: 5, points: 10, estimatedHours: 20 },
        IN_REVIEW: { count: 2, points: 4, estimatedHours: 8 },
        DONE: { count: 2, points: 4, estimatedHours: 8 },
      },
      byPriority: {
        HIGH: { count: 3, points: 6, estimatedHours: 12 },
        MEDIUM: { count: 7, points: 14, estimatedHours: 28 },
        LOW: { count: 2, points: 4, estimatedHours: 8 },
      },
      overdue: {
        count: 0,
        totalDaysOverdue: 0,
        maxDaysOverdue: 0,
        taskIds: [],
      },
      dueThisWeek: 3,
      dueToday: 1,
    },
    projectLoad: [
      {
        projectId: "proj-1",
        projectName: "Platform Rebuild",
        allocationPct: 0.6,
        taskCount: 8,
        inProgressCount: 3,
        blockedCount: 0,
        estimatedHours: 32,
      },
      {
        projectId: "proj-2",
        projectName: "Bug Fixes",
        allocationPct: 0.2,
        taskCount: 4,
        inProgressCount: 2,
        blockedCount: 0,
        estimatedHours: 16,
      },
    ],
    projectLoadSummary: {
      projectCount: 2,
      totalAllocationPct: 0.8,
      isOverSpread: false,
      primaryProjectId: "proj-1",
    },
    todoLoad: {
      totalCount: 5,
      openCount: 3,
      doneCount: 2,
      byPriority: { HIGH: 1, MEDIUM: 2 },
      dueToday: 0,
      dueThisWeek: 1,
      overdueCount: 0,
    },
    workRequestLoad: null,
    capacityComparison: {
      contractedHours: 40,
      allocatedHours: 32,
      estimatedHours: 28,
      allocatedPct: 0.8,
      utilizationPct: 0.7,
      utilizationStatus: "HEALTHY",
      headroomHours: 12,
      hasCapacity: true,
    },
    temporalDistribution: {
      currentWeek: {
        weekStart: "2026-02-16",
        weekEnd: "2026-02-22",
        days: [],
        totalEstimatedHours: 28,
        peakDay: null,
        isBalanced: true,
      },
      nextWeek: null,
      deadlineClusters: [],
    },
    signals: [],
    signalSummary: {
      totalCount: 0,
      byType: {},
      bySeverity: { info: 0, warning: 0, high: 0, critical: 0 },
      mostSevere: null,
    },
    summary: {
      assessment: "BALANCED",
      workloadScore: 0.5,
      primaryConcern: null,
      recommendedAction: null,
      needsAttention: false,
    },
    ...overrides,
  };
}

function makeOverloadedWorkload(): WorkloadAnalysisSnapshotV0 {
  return makeBalancedWorkload({
    personName: "Bob Jones",
    personId: "user-2",
    capacityComparison: {
      contractedHours: 40,
      allocatedHours: 50,
      estimatedHours: 52,
      allocatedPct: 1.25,
      utilizationPct: 1.3,
      utilizationStatus: "OVERLOADED",
      headroomHours: -12,
      hasCapacity: false,
    },
    taskLoad: {
      totalCount: 25,
      totalPoints: 50,
      totalEstimatedHours: 100,
      byStatus: {
        TODO: { count: 8, points: 16, estimatedHours: 32 },
        IN_PROGRESS: { count: 10, points: 20, estimatedHours: 40 },
        BLOCKED: { count: 3, points: 6, estimatedHours: 12 },
        DONE: { count: 4, points: 8, estimatedHours: 16 },
      },
      byPriority: {
        URGENT: { count: 2, points: 4, estimatedHours: 8 },
        HIGH: { count: 8, points: 16, estimatedHours: 32 },
        MEDIUM: { count: 10, points: 20, estimatedHours: 40 },
        LOW: { count: 5, points: 10, estimatedHours: 20 },
      },
      overdue: {
        count: 3,
        totalDaysOverdue: 12,
        maxDaysOverdue: 7,
        taskIds: ["t1", "t2", "t3"],
      },
      dueThisWeek: 8,
      dueToday: 3,
    },
    signals: [
      {
        id: "sig-1",
        signalType: "OVERLOAD",
        severity: "HIGH",
        description: "Utilization exceeds 100%",
        affectedEntityIds: [],
        value: 1.3,
        threshold: 1.0,
        detectedAt: new Date().toISOString(),
      },
    ],
    signalSummary: {
      totalCount: 1,
      byType: { OVERLOAD: 1 },
      bySeverity: { info: 0, warning: 0, high: 1, critical: 0 },
      mostSevere: {
        id: "sig-1",
        signalType: "OVERLOAD",
        severity: "HIGH",
        description: "Utilization exceeds 100%",
        affectedEntityIds: [],
        value: 1.3,
        threshold: 1.0,
        detectedAt: new Date().toISOString(),
      },
    },
    summary: {
      assessment: "OVERLOADED",
      workloadScore: 0.85,
      primaryConcern: "Utilization at 130% of capacity",
      recommendedAction: "Redistribute 3 tasks to team members with capacity",
      needsAttention: true,
    },
  });
}

function makeTeamSnapshot(
  overrides: Partial<TeamWorkloadSnapshotV0> = {}
): TeamWorkloadSnapshotV0 {
  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    workspaceId: "ws-1",
    teamId: "team-1",
    teamName: "Engineering",
    members: [
      {
        personId: "user-1",
        personName: "Alice",
        assessment: "BALANCED",
        utilizationPct: 0.7,
        taskCount: 12,
        blockedCount: 0,
        hasCapacity: true,
      },
      {
        personId: "user-2",
        personName: "Bob",
        assessment: "OVERLOADED",
        utilizationPct: 1.3,
        taskCount: 25,
        blockedCount: 3,
        hasCapacity: false,
      },
      {
        personId: "user-3",
        personName: "Charlie",
        assessment: "LIGHT",
        utilizationPct: 0.3,
        taskCount: 4,
        blockedCount: 0,
        hasCapacity: true,
      },
    ],
    teamMetrics: {
      totalMembers: 3,
      membersWithCapacity: 2,
      membersOverloaded: 1,
      avgUtilizationPct: 0.77,
      totalTasks: 41,
      totalBlocked: 3,
      isBalanced: false,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// A. Valid ANSWERABLE Envelope (Person)
// ---------------------------------------------------------------------------

describe("Workload Analysis — ANSWERABLE Envelope (Person)", () => {
  const snapshot = makeBalancedWorkload();
  const envelope = formatWorkloadEnvelope(snapshot, "person-workload-assessment");

  it("validates against JSON schema", () => {
    const result = validateAnswerEnvelopeV0(envelope);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.errors).toHaveLength(0);
  });

  it("has answerability ANSWERABLE", () => {
    expect(envelope.answerability).toBe("ANSWERABLE");
  });

  it("has non-null answer with summary", () => {
    expect(envelope.answer).not.toBeNull();
    expect(envelope.answer!.summary.length).toBeGreaterThan(0);
  });

  it("has confidence >= 0.4", () => {
    expect(envelope.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it("has non-empty supportingEvidence", () => {
    expect(envelope.supportingEvidence.length).toBeGreaterThan(0);
  });

  it("has empty blockingFactors", () => {
    expect(envelope.blockingFactors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// B. Valid BLOCKED Envelope
// ---------------------------------------------------------------------------

describe("Workload Analysis — BLOCKED Envelope", () => {
  const envelope = formatWorkloadBlockedEnvelope(
    "person-workload-assessment",
    ["NO_PERSON_DATA"]
  );

  it("validates against JSON schema", () => {
    const result = validateAnswerEnvelopeV0(envelope);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.errors).toHaveLength(0);
  });

  it("has answerability BLOCKED", () => {
    expect(envelope.answerability).toBe("BLOCKED");
  });

  it("has null answer", () => {
    expect(envelope.answer).toBeNull();
  });

  it("has confidence <= 0.3", () => {
    expect(envelope.confidence).toBeLessThanOrEqual(0.3);
  });

  it("has empty supportingEvidence", () => {
    expect(envelope.supportingEvidence).toHaveLength(0);
  });

  it("has non-empty blockingFactors", () => {
    expect(envelope.blockingFactors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// C. Evidence Path Alignment
// ---------------------------------------------------------------------------

describe("Workload Analysis — Evidence Path Alignment", () => {
  const snapshot = makeBalancedWorkload();
  const envelope = formatWorkloadEnvelope(snapshot, "person-workload-assessment");
  const allowedPaths = Object.values(WORKLOAD_ANALYSIS_PATHS_V0);

  it("every evidence path is allowed by WORKLOAD_ANALYSIS_PATHS_V0", () => {
    for (const ev of envelope.supportingEvidence) {
      const allowed = isEvidencePathAllowed(ev.path, allowedPaths);
      expect(allowed).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// D. Team Workload Envelope
// ---------------------------------------------------------------------------

describe("Workload Analysis — Team Envelope", () => {
  const snapshot = makeTeamSnapshot();
  const envelope = formatTeamWorkloadEnvelope(snapshot, "team-workload-balance");

  it("validates against JSON schema", () => {
    const result = validateAnswerEnvelopeV0(envelope);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.errors).toHaveLength(0);
  });

  it("has ANSWERABLE with non-null answer", () => {
    expect(envelope.answerability).toBe("ANSWERABLE");
    expect(envelope.answer).not.toBeNull();
  });

  it("summary mentions team name", () => {
    expect(envelope.answer!.summary).toContain("Engineering");
  });

  it("summary mentions imbalance when team is imbalanced", () => {
    expect(envelope.answer!.summary.toLowerCase()).toContain("imbalanced");
  });
});

// ---------------------------------------------------------------------------
// E. Confidence Invariants
// ---------------------------------------------------------------------------

describe("Workload Analysis — Confidence", () => {
  it("balanced workload with many tasks has confidence > 0.7", () => {
    const snapshot = makeBalancedWorkload();
    const envelope = formatWorkloadEnvelope(snapshot, "person-workload-assessment");
    expect(envelope.confidence).toBeGreaterThan(0.7);
  });

  it("overloaded person gets higher confidence", () => {
    const snapshot = makeOverloadedWorkload();
    const envelope = formatWorkloadEnvelope(snapshot, "person-workload-assessment");
    expect(envelope.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("confidence is between 0.4 and 0.95", () => {
    const snapshot = makeBalancedWorkload();
    const envelope = formatWorkloadEnvelope(snapshot, "person-workload-assessment");
    expect(envelope.confidence).toBeGreaterThanOrEqual(0.4);
    expect(envelope.confidence).toBeLessThanOrEqual(0.95);
  });
});

// ---------------------------------------------------------------------------
// F. Assessment in Summary
// ---------------------------------------------------------------------------

describe("Workload Analysis — Summary Content", () => {
  it("balanced workload summary includes person name", () => {
    const snapshot = makeBalancedWorkload();
    const envelope = formatWorkloadEnvelope(snapshot, "person-workload-assessment");
    expect(envelope.answer!.summary).toContain("Alice Smith");
  });

  it("overloaded summary includes overloaded assessment", () => {
    const snapshot = makeOverloadedWorkload();
    const envelope = formatWorkloadEnvelope(snapshot, "person-workload-assessment");
    expect(envelope.answer!.summary.toLowerCase()).toContain("overloaded");
  });

  it("overloaded person generates redistribute action", () => {
    const snapshot = makeOverloadedWorkload();
    const envelope = formatWorkloadEnvelope(snapshot, "person-workload-assessment");
    const labels = envelope.recommendedNextActions.map((a) => a.label.toLowerCase());
    expect(labels.some((l) => l.includes("redistribute"))).toBe(true);
  });

  it("person with overdue tasks generates address-overdue action", () => {
    const snapshot = makeOverloadedWorkload();
    const envelope = formatWorkloadEnvelope(snapshot, "person-workload-assessment");
    const labels = envelope.recommendedNextActions.map((a) => a.label.toLowerCase());
    expect(labels.some((l) => l.includes("overdue"))).toBe(true);
  });
});
