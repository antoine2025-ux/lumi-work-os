/**
 * Loopbrain Answer Envelope v0 — Output Contract
 *
 * Machine-enforced output shape for Loopbrain answers.
 * UI renders only; never reinterprets or enriches.
 *
 * Invariants:
 * - answer === null iff answerability === "BLOCKED"
 * - supportingEvidence.length > 0 iff answerability === "ANSWERABLE"
 * - confidence ≤ 0.3 when BLOCKED; ≥ 0.4 when ANSWERABLE
 * - blockingFactors sorted by BLOCKER_PRIORITY_V0 (blockerPriority.v0.ts)
 */

import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";
import { BLOCKER_PRIORITY_V0 } from "./blockerPriority.v0";

/** Shallow JSON-serializable primitives or flat objects. Object keys: snake_case/camelCase ASCII. */
export type EvidenceValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | Record<string, string | number | boolean | null>;

export type LoopbrainAnswerEnvelopeV0 = {
  schemaVersion: "v0";
  generatedAt: string; // ISO timestamp
  questionId: string;
  answerability: "ANSWERABLE" | "BLOCKED";
  answer: {
    summary: string; // 1–3 sentences, no hedging
    details?: string[]; // Optional bullet expansions
  } | null;
  confidence: number; // 0.0–1.0; ≤ 0.3 when BLOCKED, ≥ 0.4 when ANSWERABLE
  supportingEvidence: { path: string; value: EvidenceValue }[];
  blockingFactors: OrgReadinessBlocker[];
  recommendedNextActions: { label: string; deepLink?: string }[];
  warnings?: string[];
  snapshotHash?: string;
};

/** Canonical blocker priority. Re-export for backward compat. Use BLOCKER_PRIORITY_V0 from blockerPriority.v0.ts. */
export const BLOCKER_PRIORITY = BLOCKER_PRIORITY_V0;
