# Org v1 Declaration

## What Org is

Org is the canonical model of people, structure, accountability, capacity facts, and role semantics.

Org provides stable, explicit context that downstream systems can read deterministically.

## What Org is not

Org is not a planner, recommender, optimizer, or learning system.

## Why this matters

If Org drifts toward intelligence, it becomes unstable and untrustworthy.

By keeping Org factual and explicit, Loopbrain can reason safely without guessing.

---

## Org v1 scope (shipped)

### People modeling
- Person records with name, role/title, team, reporting line
- Optional fields are valid (missing data is meaningful)
- No auto-filling or inference

### Project accountability
- Owner (person or role)
- Decision authority (person or role)
- Escalation (person or role)
- Optional backups (v1.1): backup owner, backup decision authority

### Capacity facts
- Availability windows (unavailable, partial)
- Project allocations (fraction of capacity)
- Deterministic effective capacity calculation

### Role catalog
- Role definitions with responsibilities
- Responsibility scopes (ownership, decision, execution)
- Alignment signals (derived, not stored)

### Deterministic derived views
- Completeness status (complete/incomplete)
- Issues (missing fields, gaps)
- Capacity rollups (team-level, org-level)
- Accountability status

---

## Out of scope

- Recommendations ("who should do this")
- Scheduling or calendar integration
- Learning/feedback hooks
- Auto-corrections
- Optimization algorithms
- Priority ranking
- Predictive modeling

---

## Maintenance

Schema and semantics are frozen. Changes require explicit justification.

See [`ORG_READ_MODEL.md`](./ORG_READ_MODEL.md) for guardrails and change policy.

---

## For contributors

When adding features to Org:

1. **Ask**: Does this store facts, or does it reason?
2. **Ask**: Does this infer missing data?
3. **Ask**: Does this recommend or optimize?

If yes to any, it belongs in Loopbrain, not Org.

Org is the foundation. Keep it stable.

