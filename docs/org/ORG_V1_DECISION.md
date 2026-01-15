# Org v1 Decision Point

## Decision: **Freeze Org v1**

Org v1 is sufficient as a context layer for Loopbrain. Remaining questions are explicitly Loopbrain territory.

---

## Rationale

### What Org v1 Provides
- ✅ **Explicit ownership** (ProjectAccountability.owner)
- ✅ **Explicit decision authority** (ProjectAccountability.decision, escalation)
- ✅ **Explicit availability** (PersonAvailability windows)
- ✅ **Explicit fragmentation detection** (Accountability completeness)
- 🟡 **Structural capacity** (availability + allocations, team rollups)
- 🟡 **Coverage candidates** (role, team, reporting structure)
- 🟡 **Alignment detection** (role responsibility scopes)

### What Remains Loopbrain Territory
- ❌ **Assignment recommendations** — Org provides constraints, Loopbrain reasons
- ❌ **Timeline feasibility** — Org provides capacity, Loopbrain evaluates timeframe
- ❌ **Coverage selection** — Org provides candidates, Loopbrain chooses
- ❌ **Action decisions** — Org provides signals, Loopbrain decides

### Gap Analysis

**Gaps explicitly left to Loopbrain:**
1. Assignment recommendations — Org provides constraints (availability, allocations, role scope), Loopbrain reasons about fit
2. Timeline feasibility — Org provides structural capacity, Loopbrain evaluates timeframe constraints
3. Coverage selection — Org provides candidates (same role, team, manager), Loopbrain selects
4. Action decisions — Org provides signals (completeness, capacity, alignment), Loopbrain decides

**Potential Org v1.1 additions (NOT needed):**
- Substitution rules (explicit, not AI) — **Decision: Not needed** — Loopbrain can reason from role/team/reporting structure
- Time-bound capacity windows per project — **Decision: Not needed** — ProjectAllocation already provides this
- Coverage roles (on-call, backup) — **Decision: Not needed** — Can be modeled as RoleResponsibility scopes

---

## Org v1 Boundaries

Org v1 will NOT:
- Recommend people
- Optimize allocations
- Decide timelines
- Resolve tradeoffs
- Learn from patterns
- Score or rank by importance

Org v1 exposes facts and structure only.

---

## Usage Contract

When Loopbrain queries Org:
1. Use explicit fields when available
2. Treat missing data as meaningful (not an error)
3. Do not infer from hierarchy when explicit data exists
4. Do not recommend when Org only provides constraints

Org is a **system of record**, not a recommendation engine.

---

## Conclusion

**Org v1 is frozen.** It provides sufficient factual substrate for Loopbrain to reason safely without guessing.

Future changes require explicit justification and must not introduce intelligence, learning, or recommendation logic.

