# Refusal Language Canon v0

Canonical spec for refusal language when Loopbrain answers are BLOCKED. Contract enforcement only; no product features.

---

## A. What a Refusal Is

A refusal is a blocked state due to missing structural prerequisites.

- It is **not** uncertainty about facts.
- It is **absence** of admissible evidence.
- The org lacks the required structure (people, teams, decision domains, capacity, etc.) to answer the question.

---

## B. Forbidden Language

Explicitly ban these phrases in refusal copy and action labels:

- "Probably", "likely", "it seems", "I think"
- "Based on typical orgs…"
- "In general, you should…"
- "I can't access X but…"
- "Based on the data we have…"
- "From what I can see…"
- "This usually means…"
- "Once you fix X, you should be able to…"
- "The system expects…"
- "A typical next step would be…"
- "You should…"
- "Try …" (when used as hedging)
- "You may want…"

**Invariant:** Present tense only. No modal verbs: may, might, could, would.

---

## C. Required Structure (UI Copy)

When blocked, the UI must render:

1. **Title:** "Can't answer yet" (static)
2. **Subtitle:** "Your org is missing required structure to answer this question." (static; no synthesis)
3. **Blockers list (up to 3 rendered):** Each blocker as its own bullet, derived directly from the enum. No summarization or merging into prose.
4. **Next actions list:** Only actions that remove at least one listed blocker. Max 3 rendered.
5. **Confidence note (optional, non-numeric):** "Confidence is low because required inputs are missing."

**Rules:**

- Subtitle must be static. No blocker-specific subtitle.
- UI must NOT summarize or merge blockers into prose.
- **Forbidden example:** "Several structural elements are missing…"
- **Max blockers rendered vs preserved:** All blockers must still be preserved in the envelope. UI may render at most N blockers, but must NOT alter the underlying `blockingFactors` array. Truncation is presentation-only.

---

## D. Blocker-to-Copy Map (Canonical)

| OrgReadinessBlocker             | Label / Description                                                  |
| ------------------------------- | -------------------------------------------------------------------- |
| NO_ACTIVE_PEOPLE                | No active people are set up yet.                                     |
| NO_TEAMS                        | No teams exist yet.                                                  |
| OWNERSHIP_INCOMPLETE            | Some teams or departments are missing an owner.                      |
| NO_DECISION_DOMAINS             | No decision domains are defined yet.                                 |
| CAPACITY_COVERAGE_BELOW_MIN     | Capacity is not configured for enough people.                        |
| RESPONSIBILITY_PROFILES_MISSING | Role responsibility profiles are missing.                            |
| WORK_CANNOT_EVALUATE_BASELINE   | No non-provisional work request has been evaluated yet.              |

**Invariant:** Present tense only; no modal verbs (may, might, could, would).

---

## E. Blocker Ordering

Must match `BLOCKER_PRIORITY_V0` from `src/lib/loopbrain/contract/blockerPriority.v0.ts` (single canonical source).

Order:

1. NO_ACTIVE_PEOPLE
2. NO_TEAMS
3. OWNERSHIP_INCOMPLETE
4. NO_DECISION_DOMAINS
5. CAPACITY_COVERAGE_BELOW_MIN
6. RESPONSIBILITY_PROFILES_MISSING
7. WORK_CANNOT_EVALUATE_BASELINE

The order of `BLOCKER_PRIORITY_V0` must exactly match the order used in `buildOrgSemanticSnapshotV0` when populating `readiness.blockers`. Any divergence is a contract violation.

---

## F. Next Action Phrasing Rules

- Use imperative labels: "Add people", "Assign owners", "Define decision domains"
- Never suggest unrelated actions
- No "workarounds"
- Each action must map to at least one blocker

---

## G. Examples

### Example 1: Single blocker (NO_ACTIVE_PEOPLE)

**Title:** Can't answer yet

**Subtitle:** Your org is missing required structure to answer this question.

**Blockers:**

- No active people are set up yet.

**Next actions:**

- Add people → /org/people

---

### Example 2: Two blockers (NO_TEAMS, NO_DECISION_DOMAINS)

**Title:** Can't answer yet

**Subtitle:** Your org is missing required structure to answer this question.

**Blockers:**

- No teams exist yet.
- No decision domains are defined yet.

**Next actions:**

- Add teams → /org/structure
- Define decision domains → /org/settings/decision-authority

---

### Example 3: Three blockers (NO_ACTIVE_PEOPLE, OWNERSHIP_INCOMPLETE, CAPACITY_COVERAGE_BELOW_MIN)

**Title:** Can't answer yet

**Subtitle:** Your org is missing required structure to answer this question.

**Blockers:**

- No active people are set up yet.
- Some teams or departments are missing an owner.
- Capacity is not configured for enough people.

**Next actions:**

- Add people → /org/people
- Resolve ownership issues → /org/issues?types=UNOWNED_TEAM,UNOWNED_DEPARTMENT,OWNERSHIP_CONFLICT
- Configure capacity → /org/issues?types=OVERALLOCATED_PERSON,LOW_EFFECTIVE_CAPACITY,CAPACITY_CONTRACT_CONFLICT

---

### Example 4: Four+ blockers (truncation)

**Title:** Can't answer yet

**Subtitle:** Your org is missing required structure to answer this question.

**Blockers (up to 3 rendered):**

- No active people are set up yet.
- No teams exist yet.
- Some teams or departments are missing an owner.

*(Additional blockers remain in the envelope; truncation is presentation-only.)*

**Next actions (max 3 rendered):**

- Add people → /org/people
- Add teams → /org/structure
- Resolve ownership issues → /org/issues?types=...
