/**
 * Project Health Contract Tests
 *
 * A. ANSWERABLE envelope validates against JSON schema
 * B. BLOCKED envelope validates against JSON schema
 * C. Evidence paths align with PROJECT_HEALTH_PATHS_V0
 * D. Confidence invariants hold
 * E. Summary text includes project name and health status
 * F. Recommended actions generated for risky projects
 */

import { describe, it, expect } from "vitest";
import {
  formatProjectHealthEnvelope,
  formatProjectHealthBlockedEnvelope,
} from "@/lib/loopbrain/reasoning/projectHealthAnswer";
import { validateAnswerEnvelopeV0 } from "@/lib/loopbrain/contract/validateAnswerEnvelope";
import { PROJECT_HEALTH_PATHS_V0 } from "@/lib/loopbrain/contract/projectHealth.v0";
import type { ProjectHealthSnapshotV0 } from "@/lib/loopbrain/contract/projectHealth.v0";
import { isEvidencePathAllowed } from "./answer-envelope.contract.test";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeHealthySnapshot(
  overrides: Partial<ProjectHealthSnapshotV0> = {}
): ProjectHealthSnapshotV0 {
  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    workspaceId: "ws-1",
    projectId: "proj-1",
    projectName: "Platform Rebuild",
    projectStatus: "ACTIVE",
    velocity: {
      completionRate: 0.75,
      throughput: { tasksPerWeek: 12, pointsPerWeek: 34 },
      cycleTime: { avgDays: 3.2, p50Days: 2.5, p90Days: 7.0 },
    },
    progress: {
      tasks: { total: 100, completed: 75, inProgress: 15, blocked: 5, todo: 5 },
      epics: { total: 5, completed: 3, inProgress: 2 },
      milestones: { total: 3, completed: 1, upcoming: 2, overdue: 0 },
    },
    risks: [
      {
        id: "risk-1",
        riskType: "BLOCKED_TASKS",
        severity: "MEDIUM",
        description: "5 tasks are blocked",
        affectedEntityIds: ["t1", "t2", "t3", "t4", "t5"],
        detectedAt: new Date().toISOString(),
      },
    ],
    resourceHealth: {
      teamSize: 4,
      utilizationPct: 0.72,
      memberAllocations: [
        {
          personId: "p1",
          personName: "Alice",
          allocationPct: 0.8,
          assignedTaskCount: 25,
          completedTaskCount: 20,
        },
      ],
      bottlenecks: [],
      unassignedTaskCount: 2,
    },
    momentum: {
      trendDirection: "IMPROVING",
      velocityDelta: {
        tasksPerWeekDelta: 2,
        pointsPerWeekDelta: 5,
        percentChange: 0.15,
      },
      streakWeeks: 3,
      confidence: 0.8,
    },
    blockers: [],
    summary: {
      overallHealth: "GOOD",
      healthScore: 0.78,
      activeRiskCount: 1,
      activeBlockerCount: 0,
      daysToNextMilestone: 14,
      onTrack: true,
    },
    ...overrides,
  };
}

function makeCriticalSnapshot(): ProjectHealthSnapshotV0 {
  return makeHealthySnapshot({
    projectName: "Failing Project",
    risks: [
      {
        id: "risk-1",
        riskType: "DEADLINE_AT_RISK",
        severity: "CRITICAL",
        description: "Deadline will be missed",
        affectedEntityIds: [],
        detectedAt: new Date().toISOString(),
      },
      {
        id: "risk-2",
        riskType: "RESOURCE_SHORTAGE",
        severity: "HIGH",
        description: "Team understaffed",
        affectedEntityIds: [],
        detectedAt: new Date().toISOString(),
      },
    ],
    blockers: [
      {
        id: "blocker-1",
        blockerType: "DEPENDENCY",
        description: "Waiting on API team",
        blockedTaskIds: ["t1", "t2"],
        daysBlocked: 5,
        estimatedImpactDays: 10,
      },
    ],
    momentum: {
      trendDirection: "DECLINING",
      velocityDelta: {
        tasksPerWeekDelta: -3,
        pointsPerWeekDelta: -8,
        percentChange: -0.25,
      },
      streakWeeks: 2,
      confidence: 0.7,
    },
    summary: {
      overallHealth: "CRITICAL",
      healthScore: 0.3,
      activeRiskCount: 2,
      activeBlockerCount: 1,
      daysToNextMilestone: 3,
      onTrack: false,
    },
  });
}

// ---------------------------------------------------------------------------
// A. Valid ANSWERABLE Envelope
// ---------------------------------------------------------------------------

describe("Project Health — ANSWERABLE Envelope", () => {
  const snapshot = makeHealthySnapshot();
  const envelope = formatProjectHealthEnvelope(snapshot, "project-health-overview");

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

describe("Project Health — BLOCKED Envelope", () => {
  const envelope = formatProjectHealthBlockedEnvelope(
    "project-health-overview",
    ["NO_PROJECT_DATA"]
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

describe("Project Health — Evidence Path Alignment", () => {
  const snapshot = makeHealthySnapshot();
  const envelope = formatProjectHealthEnvelope(snapshot, "project-health-overview");
  const allowedPaths = Object.values(PROJECT_HEALTH_PATHS_V0);

  it("every evidence path is allowed by PROJECT_HEALTH_PATHS_V0", () => {
    for (const ev of envelope.supportingEvidence) {
      const allowed = isEvidencePathAllowed(ev.path, allowedPaths);
      expect(allowed).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// D. Confidence Invariants
// ---------------------------------------------------------------------------

describe("Project Health — Confidence", () => {
  it("healthy project with many tasks has confidence > 0.7", () => {
    const snapshot = makeHealthySnapshot();
    const envelope = formatProjectHealthEnvelope(snapshot, "project-health-overview");
    expect(envelope.confidence).toBeGreaterThan(0.7);
  });

  it("project with few tasks has lower but valid confidence", () => {
    const snapshot = makeHealthySnapshot({
      progress: {
        tasks: { total: 3, completed: 1, inProgress: 1, blocked: 0, todo: 1 },
        epics: { total: 0, completed: 0, inProgress: 0 },
        milestones: { total: 0, completed: 0, upcoming: 0, overdue: 0 },
      },
    });
    const envelope = formatProjectHealthEnvelope(snapshot, "project-health-overview");
    expect(envelope.confidence).toBeGreaterThanOrEqual(0.4);
    expect(envelope.confidence).toBeLessThanOrEqual(0.95);
  });
});

// ---------------------------------------------------------------------------
// E. Summary Content
// ---------------------------------------------------------------------------

describe("Project Health — Summary Content", () => {
  it("summary includes project name", () => {
    const snapshot = makeHealthySnapshot();
    const envelope = formatProjectHealthEnvelope(snapshot, "project-health-overview");
    expect(envelope.answer!.summary).toContain("Platform Rebuild");
  });

  it("summary includes health status", () => {
    const snapshot = makeHealthySnapshot();
    const envelope = formatProjectHealthEnvelope(snapshot, "project-health-overview");
    expect(envelope.answer!.summary.toLowerCase()).toContain("good");
  });

  it("critical project summary reflects critical status", () => {
    const snapshot = makeCriticalSnapshot();
    const envelope = formatProjectHealthEnvelope(snapshot, "project-health-overview");
    expect(envelope.answer!.summary.toLowerCase()).toContain("critical");
  });
});

// ---------------------------------------------------------------------------
// F. Recommended Actions
// ---------------------------------------------------------------------------

describe("Project Health — Recommended Actions", () => {
  it("generates actions for project with blockers", () => {
    const snapshot = makeCriticalSnapshot();
    const envelope = formatProjectHealthEnvelope(snapshot, "project-health-overview");
    const labels = envelope.recommendedNextActions.map((a) => a.label.toLowerCase());
    expect(labels.some((l) => l.includes("blocker"))).toBe(true);
  });

  it("generates actions for project with critical risks", () => {
    const snapshot = makeCriticalSnapshot();
    const envelope = formatProjectHealthEnvelope(snapshot, "project-health-overview");
    const labels = envelope.recommendedNextActions.map((a) => a.label.toLowerCase());
    expect(labels.some((l) => l.includes("risk"))).toBe(true);
  });

  it("generates actions for declining velocity", () => {
    const snapshot = makeCriticalSnapshot();
    const envelope = formatProjectHealthEnvelope(snapshot, "project-health-overview");
    const labels = envelope.recommendedNextActions.map((a) => a.label.toLowerCase());
    expect(labels.some((l) => l.includes("velocity"))).toBe(true);
  });

  it("all actions have deepLink starting with /", () => {
    const snapshot = makeCriticalSnapshot();
    const envelope = formatProjectHealthEnvelope(snapshot, "project-health-overview");
    for (const action of envelope.recommendedNextActions) {
      if (action.deepLink) {
        expect(action.deepLink.startsWith("/")).toBe(true);
      }
    }
  });
});
