# Loopbrain Ingest Contract v0

Formal machine contract between Org and Loopbrain. This document defines what Loopbrain is allowed to read, what it may assume, how answerability is determined, and how semantic drift is prevented.

## Foundational Rules

- Loopbrain may reason only over `/api/org/snapshot`.
- Absence of data means absence of knowledge — no inference.
- OrgSemanticSnapshot is authoritative and versioned.
- Any change requires an explicit version bump.

---

## A. Scope

- **Loopbrain input** = `/api/org/snapshot` response only.
- No UI context.
- No secondary endpoints.

---

## B. Allowed Reasoning

**Loopbrain MAY:**

- Aggregate
- Compare
- Rank
- Detect blockers

**Loopbrain MUST NOT:**

- Invent entities
- Assume defaults
- Infer coverage when `pct < 100`
- Infer intent from missing data
- Use historical snapshots unless explicitly provided

---

## C. Required Output Shape (Conceptual)

Loopbrain responses must include (contract-level, not code):

- `answer`
- `confidence` (0–1)
- `supportingEvidence`: array of `{ path, value }`
- `blockingFactors`: OrgReadinessBlocker[]
- `recommendedNextActions`: `{ label, deepLink? }[]`

---

## D. Failure Mode

If `readiness.isAnswerable === false`:

- Loopbrain must decline a definitive answer.
- Blockers must be surfaced explicitly.
- Response `confidence` must be ≤ 0.3.

---

## E. Validation Precedence

If schema validation fails:

- Snapshot is invalid for Loopbrain ingestion.
- `validateSnapshotV0` result MUST be ignored.
- Schema is authoritative.

---

## F. Blocking Monotonicity

A question that was previously blocked MAY become answerable only if the corresponding blockers are removed from the snapshot.

Loopbrain MUST NOT override blockers based on confidence or heuristics.

---

## G. Answer Envelope

Loopbrain output must conform to `LoopbrainAnswerEnvelopeV0` (see `src/lib/loopbrain/contract/answer-envelope.v0.ts` and `schema/loopbrain-answer-envelope.v0.schema.json`).

- UI renders only; never reinterprets or enriches.
- **Readiness override:** Loopbrain must never emit an ANSWERABLE envelope if `readiness.isAnswerable === false`, even if some evidence exists.
- **snapshotHash consistency:** If snapshotHash is present, all supportingEvidence MUST originate from that snapshot version. If absent, Loopbrain must treat the answer as non-cacheable.
- **Evidence pass-through:** Loopbrain must not derive or transform evidence values; they must be passed through verbatim from the snapshot.
- **Evidence object keys:** Evidence object keys are identifiers, not prose (snake_case/camelCase ASCII).
- **Evidence-path alignment:** Every `supportingEvidence.path` must be authorized by the question's `evidencePaths`. A path is allowed iff:
  - `path === evidencePath`, or
  - `path.startsWith(evidencePath + ".")`, or
  - `path.startsWith(evidencePath + "[")`
  - Nothing else. (Example: evidencePath `work` must not allow path `workflow`.)

---

## H. Refusal Language Canon

Blocked answers must use Refusal Language Canon v0. See [refusal-language-canon.v0.md](refusal-language-canon.v0.md).

- BLOCKED envelopes do **not** contain natural language answers. Refusal language is derived from `blockingFactors` only.
- **Explicit prohibition:** UI must NOT read snapshot directly, issues, or coverage metrics when rendering a blocked state. Only input allowed: `blockingFactors: OrgReadinessBlocker[]`. This is critical for Loopbrain safety.
- **UI truncation:** The UI may render at most N blockers, but must NOT alter the underlying `blockingFactors` array. Truncation is presentation-only.
- **BlockedAnswerNotice non-interactive:** No tooltips, expandable explanations, hover clarifications, or "Why?" links. Only CTA links allowed.
- **Empty blockers:** Rendering a blocked notice with zero blockers is a contract violation. Component must render nothing or throw in dev.

---

## Dry-Run Endpoints

The following endpoints (when present) are for development debugging only:

- `/api/org/loopbrain/dryrun` — returns snapshot + answerable/blocked questions
- `/api/org/loopbrain/answer-dryrun?questionId=...` — returns snapshot + answerability + envelope scaffold for a given question

**These endpoints MUST NOT be used by production Loopbrain ingestion or inference.**
