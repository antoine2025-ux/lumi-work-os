# Org → Loopbrain Consumption Contract

## Purpose

This document defines how Loopbrain consumes Org as a read-only context graph.

Org exposes facts and deterministic read models only.

---

## Consumption Principles

- **Loopbrain must treat Org as immutable during reasoning**: Read Org state, compute answers, but never mutate Org during a reasoning cycle.
- **Missing data is meaningful**: Loopbrain must not hallucinate defaults or infer missing fields.
- **Loopbrain must never write derived conclusions back into Org**: Org stores facts; Loopbrain stores reasoning separately.

---

## Core Read Models

### People

Loopbrain can read:

- `Person.id`
- `name`
- `role` / `title` (nullable)
- `team` / `teamId` (nullable)
- `managerId` (nullable)
- `availability` windows (array of `PersonAvailability`)
- `allocations` (array of `ProjectAllocation`)

**Guaranteed semantics:**

- `managerId` is structural (reporting line), not accountability
- `availability` is factual (recorded time off), not predictive
- `allocations` are commitments (factual assignments), not plans

**Example:**

```typescript
const person = {
  id: "user-123",
  name: "Alex",
  role: "Product Manager",
  teamId: "team-payments",
  managerId: "user-456",
  availability: [
    { type: "UNAVAILABLE", startDate: "2024-01-15", endDate: "2024-01-22" }
  ],
  allocations: [
    { projectId: "proj-789", fraction: 0.6, startDate: "2024-01-01" }
  ]
};
```

---

### Projects

Loopbrain can read:

- `Project.id`
- `name`
- `description`
- `ProjectAccountability`:
  - `owner` (person or role)
  - `decision` authority (person or role)
  - `escalation` (person or role)
  - `backupOwner` (v1.1, optional)
  - `backupDecision` (v1.1, optional)

**Guaranteed semantics:**

- Accountability is explicit (never inferred from hierarchy)
- Missing fields mean "not defined", not "unknown"
- Person vs role is mutually exclusive per field

**Example:**

```typescript
const project = {
  id: "proj-789",
  name: "Payments Migration",
  accountability: {
    owner: { type: "role", role: "Product Manager" },
    decision: { type: "role", role: "Engineering Manager" },
    escalation: { type: "person", personId: "user-456" },
    backupOwner: { type: "person", personId: "user-123" }
  }
};
```

---

### Roles

Loopbrain can read:

- `Role.name`
- `Role.description` (optional)
- `RoleResponsibility[]`:
  - `scope`: `OWNERSHIP` | `DECISION` | `EXECUTION`
  - `target`: free-text string

**Guaranteed semantics:**

- Responsibilities describe scope (what the role covers), not skill level
- Free-text `target` is intentional; Loopbrain must reason cautiously
- No inference from role name alone

**Example:**

```typescript
const role = {
  name: "Product Manager",
  responsibilities: [
    { scope: "OWNERSHIP", target: "Product roadmap and feature prioritization" },
    { scope: "DECISION", target: "Feature scope and tradeoffs" }
  ]
};
```

---

### Derived Read Models

Loopbrain may read deterministic projections:

- `deriveCompleteness(people)` → completeness status (reporting lines, teams, roles percentages)
- `deriveIssues(people)` → structural gaps (missing manager, team, role)
- `deriveEffectiveCapacity(availability, allocations)` → effective capacity fraction
- `deriveTeamCapacity(people, availability, allocations)` → team-level capacity rollups
- `deriveProjectAccountability(accountability)` → normalized accountability read model
- `deriveRoleProfile(role, responsibilities)` → role meaning and alignment signals (ownership, decision, execution scopes)

**Guarantee:**

- These are deterministic projections of Org state
- No ranking, scoring, or optimization baked in
- Same inputs always produce same outputs

**Example:**

```typescript
import { deriveProjectAccountability } from "@/lib/org";

const readModel = deriveProjectAccountability({
  ownerRole: "Product Manager",
  decisionRole: "Engineering Manager"
});

// Returns:
// {
//   owner: { type: "role", role: "Product Manager" },
//   decision: { type: "role", role: "Engineering Manager" },
//   escalation: { type: "unset" },
//   backupOwner: { type: "unset" },
//   backupDecision: { type: "unset" },
//   status: "complete",
//   missing: []
// }
```

---

## What Loopbrain Must Not Expect

- ❌ No "best person" ranking
- ❌ No scheduling guarantees (Org doesn't schedule)
- ❌ No enforced correctness (missing data is valid)
- ❌ No AI-generated metadata (Org stores human-entered facts only)

---

## Example Question Mapping

### Q1: "Who owns Payments Migration?"

**Org answer:**

```typescript
const project = await getProject("proj-789");
const accountability = deriveProjectAccountability(project.accountability);
// accountability.owner = { type: "role", role: "Product Manager" }
```

**Loopbrain must:**

1. Read `accountability.owner`
2. If `type === "role"`, resolve role to people (read `Role` → find people with that role)
3. If `type === "person"`, use `personId` directly
4. Never guess if `type === "unset"`

---

### Q2: "Who decides if scope changes?"

**Org answer:**

```typescript
const accountability = deriveProjectAccountability(project.accountability);
// accountability.decision = { type: "role", role: "Engineering Manager" }
// accountability.escalation = { type: "person", personId: "user-456" }
```

**Loopbrain must:**

1. Read `accountability.decision` (primary)
2. If unset, check `accountability.escalation` (fallback)
3. If both unset, answer "Not defined" (don't infer from hierarchy)

---

### Q4: "Do we have capacity?"

**Org answer:**

```typescript
import { deriveTeamCapacity } from "@/lib/org";

const teamCapacity = deriveTeamCapacity(people, allocations);
// Returns: { team, headcount, avgCapacity, unavailableCount, overallocatedCount }
```

**Loopbrain must:**

1. Read `deriveTeamCapacity` for structural capacity
2. Read `PersonAvailability` windows for time constraints
3. Combine facts; Org doesn't answer "can we fit this in?"

---

### Q5: "Who is unavailable, and when?"

**Org answer:**

```typescript
import { deriveCurrentAvailability } from "@/lib/org";

const availability = deriveCurrentAvailability(person.availability);
// Returns: { status: "unavailable", endDate: "2024-01-22" }
```

**Loopbrain must:**

1. Read `PersonAvailability` windows
2. Use `deriveCurrentAvailability` for "now" status
3. Never predict future availability beyond recorded windows

---

### Q6: "Who can cover if the owner is unavailable?"

**Org answer:**

```typescript
const accountability = deriveProjectAccountability(project.accountability);
// accountability.backupOwner = { type: "person", personId: "user-123" }
```

**Loopbrain must:**

1. Read `accountability.backupOwner` (explicit backup, v1.1)
2. If unset, may reason from role alignment or team membership (Loopbrain logic)
3. Never write backup suggestions back into Org

---

### Q8: "Is responsibility fragmented?"

**Org answer:**

```typescript
const accountability = deriveProjectAccountability(project.accountability);
// accountability.status = "complete" | "incomplete"
// accountability.missing = ["owner", "decision"]
```

**Loopbrain must:**

1. Read `accountability.status`
2. Read `accountability.missing` for specific gaps
3. Never infer fragmentation from other signals

---

## What Org Does Not Answer

Org does not answer:

- ❌ "What should we do?" (action recommendations)
- ❌ "Who should work on this?" (assignment recommendations)
- ❌ "When can this be done?" (scheduling)
- ❌ "Is this optimal?" (optimization)

These belong to Loopbrain's reasoning layer.

---

## Versioning

- **Org v1 contracts are stable**: Schema and read model semantics won't change
- **Any breaking change requires Org v2**: New version with migration path
- **Loopbrain must declare which Org version it targets**: E.g., `orgVersion: "v1"`

---

## Implementation Notes

### Reading Org Data

Loopbrain should read Org via:

1. **API endpoints** (for server-side reads):
   - `/api/org/people`
   - `/api/org/projects`
   - `/api/org/roles`

2. **Derivation functions** (for read models):
   ```typescript
   import {
     deriveCompleteness,
     deriveIssues,
     deriveEffectiveCapacity,
     deriveTeamCapacity,
     deriveProjectAccountability,
     deriveRoleProfile,
     deriveCurrentAvailability,
     activeAllocationsAt,
     sumAllocationFraction
   } from "@/lib/org";
   ```

3. **Never read UI state**: Org UI components are for humans, not APIs

### Error Handling

- Missing Org data is **not an error**; it's meaningful absence
- Loopbrain should handle `null` / `undefined` gracefully
- Never throw errors for missing accountability or incomplete people

### Performance

- Org read models are deterministic and cacheable
- Loopbrain may cache Org state during a reasoning cycle
- Org changes invalidate caches (use version/timestamp checks)

---

## Contract Stability

This contract is part of Org v1 and will not change unless Org v2 is released.

Breaking changes will be:
- Documented in migration guides
- Versioned explicitly
- Deprecated with notice periods

---

## For Loopbrain Developers

When consuming Org:

1. **Read facts only**: Don't expect Org to reason
2. **Handle missing data**: Absence is meaningful, not an error
3. **Use derivation functions**: Don't reimplement Org logic
4. **Never write back**: Org is read-only to Loopbrain
5. **Version your consumption**: Declare which Org version you target

When in doubt: Org stores facts. Loopbrain reasons about facts.

