/**
 * Loopbrain Snapshot Contract Tests
 *
 * A. Schema validity: snapshot validates against JSON Schema
 * B. Question answerability: structural answerability per question
 * C. Negative schema test: invalid snapshot must fail validation
 */

import { describe, it, expect } from "vitest";
import { validateSnapshotAgainstSchema } from "@/lib/org/snapshot/validateAgainstSchema";
import {
  LOOPBRAIN_QUESTIONS_V0,
  type LoopbrainQuestionV0,
} from "@/lib/loopbrain/contract/questions.v0";
import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";

// Minimal valid snapshot fixture (no DB required)
const MINIMAL_VALID_SNAPSHOT = {
  schemaVersion: "v0",
  generatedAt: new Date().toISOString(),
  workspaceId: "test-ws-1",
  readiness: {
    isAnswerable: true,
    blockers: [] as OrgReadinessBlocker[],
  },
  coverage: {
    ownership: { coveragePct: 100, conflictCount: 0 },
    capacity: { count: 5, total: 5, pct: 100 },
    responsibilityProfiles: { count: 3, total: 3, pct: 100 },
    decisionDomains: { count: 2, total: 2, pct: 100 },
  },
  roles: [
    { roleType: "Engineer", peopleCount: 3, hasProfile: true },
    { roleType: "Designer", peopleCount: 1, hasProfile: true },
  ],
  decisionDomains: [
    { key: "pricing", name: "Pricing", hasPrimary: true, hasCoverage: true },
    { key: "engineering", name: "Engineering", hasPrimary: true, hasCoverage: true },
  ],
  capacity: {
    configuredCount: 5,
    totalPeople: 5,
    pctConfigured: 100,
    issueCount: 0,
  },
  responsibility: {
    profileCount: 3,
    distinctRoleTypes: 3,
    pctCovered: 100,
  },
  decisions: {
    domains: [
      { key: "pricing", name: "Pricing", hasPrimary: true, hasCoverage: true },
      { key: "engineering", name: "Engineering", hasPrimary: true, hasCoverage: true },
    ],
  },
  work: {
    openCount: 2,
    byRecommendationAction: { APPROVED: 1, NOT_EVALUATED: 1 },
    unacknowledgedCount: 0,
  },
  issues: {
    total: 0,
    countsBySeverity: { error: 0, warning: 0, info: 0 },
    topIssueIds: [],
  },
};

function pathExists(obj: unknown, path: string): boolean {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return false;
    current = (current as Record<string, unknown>)[part];
  }
  return current !== undefined;
}

/** Question IDs that validate against non-org snapshot types (project health, workload, calendar, entity). */
const NON_ORG_SNAPSHOT_QUESTIONS = new Set([
  "project-health-overview",
  "project-on-track",
  "person-workload-assessment",
  "team-workload-balance",
  "calendar-availability",
  "team-availability",
  "entity-connections",
]);

/** Only org-domain questions — filters out project health and workload questions. */
const ORG_QUESTIONS = LOOPBRAIN_QUESTIONS_V0.filter(
  (q) => !NON_ORG_SNAPSHOT_QUESTIONS.has(q.id)
);

function isAnswerable(snapshot: { readiness: { blockers: string[] } }, q: LoopbrainQuestionV0): boolean {
  const blockers = new Set(snapshot.readiness.blockers);
  const blockingOn = new Set(q.blockingOn);
  const intersection = [...blockers].filter((b) => blockingOn.has(b));
  return intersection.length === 0;
}

describe("Loopbrain Snapshot Contract", () => {
  describe("A. Schema Validity", () => {
    it("validates minimal snapshot against JSON schema", () => {
      const result = validateSnapshotAgainstSchema(MINIMAL_VALID_SNAPSHOT);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("B. Question Answerability", () => {
    it("each org question has valid requiredSnapshotPaths when snapshot is answerable", () => {
      const snapshot = MINIMAL_VALID_SNAPSHOT as Record<string, unknown>;

      for (const q of ORG_QUESTIONS) {
        if (!isAnswerable(MINIMAL_VALID_SNAPSHOT, q)) continue;

        for (const path of q.requiredSnapshotPaths) {
          expect(pathExists(snapshot, path)).toBe(true);
        }
      }
    });

    it("blocked questions are not answerable when blockers intersect", () => {
      const blockedSnapshot = {
        ...MINIMAL_VALID_SNAPSHOT,
        readiness: {
          isAnswerable: false,
          blockers: ["NO_DECISION_DOMAINS"] as OrgReadinessBlocker[],
        },
      };

      const whoDecidesPricing = LOOPBRAIN_QUESTIONS_V0.find(
        (q) => q.id === "who-decides-pricing"
      )!;
      expect(isAnswerable(blockedSnapshot, whoDecidesPricing)).toBe(false);
    });

    it("each org question has valid evidencePaths when answerable", () => {
      const snapshot = MINIMAL_VALID_SNAPSHOT as Record<string, unknown>;

      for (const q of ORG_QUESTIONS) {
        if (!isAnswerable(MINIMAL_VALID_SNAPSHOT, q)) continue;

        for (const path of q.evidencePaths) {
          expect(pathExists(snapshot, path)).toBe(true);
        }
      }
    });
  });

  describe("C. Negative Schema Test", () => {
    it("rejects snapshot with pct out of bounds (120)", () => {
      const invalidSnapshot = {
        ...MINIMAL_VALID_SNAPSHOT,
        coverage: {
          ...MINIMAL_VALID_SNAPSHOT.coverage,
          ownership: {
            coveragePct: 120,
            conflictCount: 0,
          },
        },
      };

      const result = validateSnapshotAgainstSchema(invalidSnapshot);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects snapshot with extra unknown field at root", () => {
      const invalidSnapshot = {
        ...MINIMAL_VALID_SNAPSHOT,
        unknownField: "should fail",
      };

      const result = validateSnapshotAgainstSchema(invalidSnapshot);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
