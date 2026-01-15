# Org → Loopbrain Questions Mapping

## Purpose
This document maps Loopbrain's required questions to Org's explicit data and derived read models.
Org must answer these questions **deterministically**, or explicitly declare gaps.

---

## Question 1: Who owns this?
**Org source**
- `ProjectAccountability.owner` (person or role)

**Status**
- ✅ Fully supported

**Notes**
- Ownership is explicit.
- No inference from hierarchy.

---

## Question 2: Who decides this?
**Org source**
- `ProjectAccountability.decision`
- `ProjectAccountability.escalation`

**Status**
- ✅ Fully supported

**Notes**
- Escalation path is explicit.
- Independent from reporting lines.

---

## Question 3: Who should be working on this right now?
**Org source**
- ❌ Not directly answered by Org

**Supporting context Org provides**
- `ProjectAllocation` (factual commitments)
- `PersonAvailability` (time-based constraints)
- `RoleResponsibility` (scope boundaries)

**Decision**
- ❌ Belongs to Loopbrain reasoning layer
- Org provides constraints only

---

## Question 4: Do we have capacity to do this in the given timeframe?
**Org source**
- `PersonAvailability` (time off, partial availability)
- `ProjectAllocation` (existing commitments)
- `deriveEffectiveCapacity()` (current capacity calculation)
- Team capacity rollups (`deriveTeamCapacity()`)

**Status**
- 🟡 Partially supported

**Notes**
- Org answers "Do we have capacity at all?" (structural)
- Timeframe feasibility belongs to Loopbrain

---

## Question 5: Who is unavailable, and when do they return?
**Org source**
- `PersonAvailability` windows (type: UNAVAILABLE, startDate, endDate)

**Status**
- ✅ Fully supported

**Notes**
- Explicit time windows.
- End date null = open-ended.

---

## Question 6: Who can cover this if the primary owner is unavailable?
**Org source**
- `ProjectAccountability.backupOwner` (explicit backup owner, v1.1)
- `ProjectAccountability.backupDecision` (explicit backup decision, v1.1)
- `RoleResponsibility` (same role scope)
- Team membership (via `OrgPosition.teamId`)
- Reporting structure (via `OrgPosition.parentId`)

**Status**
- ✅ Fully supported (v1.1)

**Notes**
- Org exposes explicit backups when defined
- Org also exposes substitution candidates (same role, same team, manager)
- Selection logic belongs to Loopbrain

---

## Question 7: Is this task aligned with the person's role and responsibilities?
**Org source**
- `RoleResponsibility` (ownership/decision/execution scopes)
- Role alignment read model (to be implemented in C2)

**Status**
- 🟡 Partially supported

**Notes**
- Org detects misalignment (factual check)
- Judgment/action belongs to Loopbrain

---

## Question 8: Is responsibility clear or fragmented?
**Org source**
- `ProjectAccountability` completeness (`deriveProjectAccountability()`)
- Missing owner / decision detection (`missing` array)

**Status**
- ✅ Fully supported

**Notes**
- Explicit completeness status.
- Fragmentation = missing accountability fields.

---

## Question 9: Should we proceed, reassign, delay, or request support?
**Org source**
- ❌ Not answered by Org

**Supporting context Org provides**
- Accountability completeness
- Capacity signals
- Availability windows
- Alignment signals

**Decision**
- ❌ Explicitly Loopbrain-only

---

## Summary Table

| Question | Org Answer | Status |
|----------|-----------|--------|
| Ownership | Explicit | ✅ |
| Decision | Explicit | ✅ |
| Assignment | Context only | ❌ |
| Capacity | Partial | 🟡 |
| Availability | Explicit | ✅ |
| Coverage | Explicit backups + candidates | ✅ (v1.1) |
| Alignment | Detected | 🟡 |
| Fragmentation | Explicit | ✅ |
| Action | ❌ | ❌ |

---

## Explicit Org Non-Responsibilities
Org will NOT:
- Recommend people
- Optimize allocations
- Decide timelines
- Resolve tradeoffs

Org exposes facts and structure only.

---

## Gap Analysis

### Gaps Explicitly Left to Loopbrain
1. **Assignment recommendations** — Org provides constraints, Loopbrain reasons
2. **Timeline feasibility** — Org provides capacity, Loopbrain evaluates timeframe
3. **Coverage selection** — Org provides candidates, Loopbrain chooses
4. **Action decisions** — Org provides signals, Loopbrain decides

### Potential Org v1.1 Additions (If Needed)
- Substitution rules (explicit, not AI)
- Time-bound capacity windows per project
- Coverage roles (on-call, backup)

**Decision**: These remain outside Org v1 unless explicitly needed for factual coverage.

---

## Usage Contract

When Loopbrain queries Org:
1. Use explicit fields when available
2. Treat missing data as meaningful (not an error)
3. Do not infer from hierarchy when explicit data exists
4. Do not recommend when Org only provides constraints

Org is a **system of record**, not a recommendation engine.

