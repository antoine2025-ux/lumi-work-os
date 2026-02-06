/**
 * Loopbrain Answer Envelope Contract Tests
 *
 * A. Valid answerable envelope
 * B. Blocked envelope
 * C. Negative tests
 * D. Evidence–Question alignment
 * E. ANSWERABLE with empty recommendedNextActions
 */

import { describe, it, expect } from "vitest";

/**
 * Strict evidence-path authorization rule.
 * An evidence path is allowed iff it is authorized by at least one question evidencePath:
 * - path === evidencePath
 * - OR path.startsWith(evidencePath + ".")
 * - OR path.startsWith(evidencePath + "[")
 * Nothing else. Prevents accidental matches (e.g. evidencePath "work" must not allow path "workflow").
 */
export function isEvidencePathAllowed(evPath: string, evidencePaths: string[]): boolean {
  return evidencePaths.some(
    (p) =>
      evPath === p ||
      evPath.startsWith(p + ".") ||
      evPath.startsWith(p + "[")
  );
}
import { validateAnswerEnvelopeV0 } from "@/lib/loopbrain/contract/validateAnswerEnvelope";
import {
  LOOPBRAIN_QUESTIONS_V0,
  type LoopbrainQuestionV0,
} from "@/lib/loopbrain/contract/questions.v0";
import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";

// Valid ANSWERABLE envelope fixture
const VALID_ANSWERABLE_ENVELOPE = {
  schemaVersion: "v0",
  generatedAt: new Date().toISOString(),
  questionId: "who-decides-pricing",
  answerability: "ANSWERABLE" as const,
  answer: {
    summary: "Pricing decisions are owned by the Pricing domain.",
    details: ["Primary: configured", "Escalation: 2 steps"],
  },
  confidence: 0.8,
  supportingEvidence: [
    { path: "decisionDomains", value: { key: "pricing", name: "Pricing", hasPrimary: true, hasCoverage: true } },
  ],
  blockingFactors: [] as OrgReadinessBlocker[],
  recommendedNextActions: [{ label: "View decision domains", deepLink: "/org/settings/decision-authority" }],
};

// Valid BLOCKED envelope fixture
const VALID_BLOCKED_ENVELOPE = {
  schemaVersion: "v0",
  generatedAt: new Date().toISOString(),
  questionId: "who-decides-pricing",
  answerability: "BLOCKED" as const,
  answer: null,
  confidence: 0.2,
  supportingEvidence: [] as { path: string; value: unknown }[],
  blockingFactors: ["NO_DECISION_DOMAINS"] as OrgReadinessBlocker[],
  recommendedNextActions: [{ label: "Configure decision domains", deepLink: "/org/settings/decision-authority" }],
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

describe("Loopbrain Answer Envelope Contract", () => {
  describe("A. Valid Answerable Envelope", () => {
    it("validates answerable envelope against JSON schema", () => {
      const result = validateAnswerEnvelopeV0(VALID_ANSWERABLE_ENVELOPE);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("evidence paths exist in corresponding snapshot structure", () => {
      const snapshot = {
        decisionDomains: [{ key: "pricing", name: "Pricing", hasPrimary: true, hasCoverage: true }],
      };
      for (const ev of VALID_ANSWERABLE_ENVELOPE.supportingEvidence) {
        expect(pathExists(snapshot, ev.path)).toBe(true);
      }
    });
  });

  describe("B. Blocked Envelope", () => {
    it("validates blocked envelope against JSON schema", () => {
      const result = validateAnswerEnvelopeV0(VALID_BLOCKED_ENVELOPE);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("invariants hold: answer null, confidence <= 0.3, blockingFactors non-empty", () => {
      expect(VALID_BLOCKED_ENVELOPE.answer).toBeNull();
      expect(VALID_BLOCKED_ENVELOPE.confidence).toBeLessThanOrEqual(0.3);
      expect(VALID_BLOCKED_ENVELOPE.blockingFactors.length).toBeGreaterThan(0);
      expect(VALID_BLOCKED_ENVELOPE.supportingEvidence.length).toBe(0);
    });
  });

  describe("C. Negative Tests", () => {
    it("rejects envelope with extra unknown field at root", () => {
      const invalid = { ...VALID_ANSWERABLE_ENVELOPE, unknownField: "x" };
      const result = validateAnswerEnvelopeV0(invalid);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects ANSWERABLE with empty supportingEvidence", () => {
      const invalid = {
        ...VALID_ANSWERABLE_ENVELOPE,
        supportingEvidence: [],
      };
      const result = validateAnswerEnvelopeV0(invalid);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects BLOCKED with confidence > 0.3", () => {
      const invalid = {
        ...VALID_BLOCKED_ENVELOPE,
        confidence: 0.5,
      };
      const result = validateAnswerEnvelopeV0(invalid);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects BLOCKED with non-null answer", () => {
      const invalid = {
        ...VALID_BLOCKED_ENVELOPE,
        answer: { summary: "Partial answer" },
      };
      const result = validateAnswerEnvelopeV0(invalid);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects BLOCKED with non-null answer.details (partial answer leakage)", () => {
      const invalid = {
        ...VALID_BLOCKED_ENVELOPE,
        answer: { summary: "x", details: ["y"] },
      };
      const result = validateAnswerEnvelopeV0(invalid);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects BLOCKED with warnings present", () => {
      const invalid = {
        ...VALID_BLOCKED_ENVELOPE,
        warnings: ["Some warning"],
      };
      const result = validateAnswerEnvelopeV0(invalid);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("D. Evidence–Question Alignment", () => {
    it("every supportingEvidence.path is allowed by question evidencePaths (strict rule)", () => {
      const question = LOOPBRAIN_QUESTIONS_V0.find((q) => q.id === "who-decides-pricing")!;
      const evidencePaths = question.evidencePaths;

      for (const ev of VALID_ANSWERABLE_ENVELOPE.supportingEvidence) {
        expect(isEvidencePathAllowed(ev.path, evidencePaths)).toBe(true);
      }
    });

    it("strict rule: evidencePath 'work' does not allow path 'workflow'", () => {
      expect(isEvidencePathAllowed("workflow", ["work"])).toBe(false);
    });

    it("strict rule: exact match, dot-subpath, bracket-subpath are allowed", () => {
      const evidencePaths = ["work", "capacity"];
      expect(isEvidencePathAllowed("work", evidencePaths)).toBe(true);
      expect(isEvidencePathAllowed("work.openCount", evidencePaths)).toBe(true);
      expect(isEvidencePathAllowed("work[0]", evidencePaths)).toBe(true);
      expect(isEvidencePathAllowed("capacity.pctConfigured", evidencePaths)).toBe(true);
    });
  });

  describe("E. ANSWERABLE with Empty recommendedNextActions", () => {
    it("passes validation when recommendedNextActions is empty", () => {
      const envelope = {
        ...VALID_ANSWERABLE_ENVELOPE,
        recommendedNextActions: [],
      };
      const result = validateAnswerEnvelopeV0(envelope);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
