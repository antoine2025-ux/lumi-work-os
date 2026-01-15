# Org

**Org v1 is shipped and frozen.** See [`docs/org/ORG_V1_DECLARATION.md`](../../../../docs/org/ORG_V1_DECLARATION.md) for scope and guardrails.

**Loopbrain consumption contract:** See [`docs/org/ORG_LOOPBRAIN_CONSUMPTION.md`](../../../../docs/org/ORG_LOOPBRAIN_CONSUMPTION.md) for how Loopbrain reads Org as a read-only context source.

---

Org is a system of record for organizational structure.

## Org Boundaries

Org is a system of record.

All intelligence, recommendations, and reasoning live outside Org.

If a feature requires prediction, learning, or ranking by "importance" — it does not belong here.

Org exposes facts, relationships, and derived properties. It does not reason, predict, or optimize.

See [`docs/org/ORG_READ_MODEL.md`](../../../../docs/org/ORG_READ_MODEL.md) for the complete read model contract.

## Org v1 Status

Org v1 is frozen as a system of record.

Changes require explicit justification and must not introduce intelligence, learning, or recommendation logic.

### Org Readiness for Loopbrain

Org v1 provides deterministic answers to ownership, decision authority, availability, capacity (structural), and role alignment.

**What Org Answers:**
- ✅ Who owns this? (explicit ownership)
- ✅ Who decides this? (explicit decision authority)
- ✅ Who is unavailable, and when? (explicit availability windows)
- ✅ Do we have capacity at all? (structural capacity via allocations)
- ✅ Is responsibility clear or fragmented? (accountability completeness)

**What Org Provides as Context:**
- 🟡 Capacity constraints (availability + allocations)
- 🟡 Role alignment signals (responsibility scopes)
- ✅ Coverage facts (explicit backup owner/decision on projects, v1.1)

**What Org Does NOT Answer:**
- ❌ Who should work on this? (assignment recommendations)
- ❌ Should we proceed, reassign, delay? (action decisions)
- ❌ Optimal allocation strategies (optimization)

Loopbrain must not guess when Org data is missing; missing data is meaningful.

See [`docs/org/ORG_LOOPBRAIN_QUESTIONS_MAP.md`](../../../../docs/org/ORG_LOOPBRAIN_QUESTIONS_MAP.md) for the complete mapping.

---

## Loopbrain Integration

**Important:** Org UI is not an API. Loopbrain must read Org data and read models via:

- **API endpoints** (`/api/org/people`, `/api/org/projects`, `/api/org/roles`) for server-side reads
- **Derivation functions** (`@/lib/org`) for deterministic read models
- **Never read UI state** — Org UI components are for humans, not machine consumption

See [`docs/org/ORG_LOOPBRAIN_CONSUMPTION.md`](../../../../docs/org/ORG_LOOPBRAIN_CONSUMPTION.md) for the complete consumption contract.

