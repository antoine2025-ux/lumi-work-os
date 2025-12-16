# Org Read Model

## Purpose

Org is a canonical, human-maintained model of organizational structure.

It exposes facts, relationships, and derived properties.

It does not reason, predict, or optimize.

---

## Entities

Org exposes the following core entities:

### Person

- `id`
- `name`
- `role` / `title` (nullable)
- `team` / `teamId` (nullable)
- `managerId` (nullable)
- `createdAt`
- `updatedAt`

**Guarantees:**

- A Person may exist with missing fields.
- Missing data is intentional and meaningful.
- No field is auto-filled by Org.

---

## Relationships

- Reporting lines are represented via `managerId`.
- Cycles are not allowed (enforced elsewhere).
- Absence of `managerId` means "top-level or unmodeled".

Org does not infer hierarchy beyond explicit relationships.

---

## Derived Properties (Guaranteed Stable)

Org guarantees the following *derived but deterministic* properties:

- Reporting completeness
- Team assignment completeness
- Role assignment completeness
- Manager vs individual contributor classification
- Direct report count

These are always:

- Computed from base data
- Never stored
- Recomputable at any time

---

## Views (Read Models)

Org exposes multiple projections of the same data:

- People list
- Issues (derived gaps)
- Org health metrics
- Recent changes (audit-style)

All views must be derivable from the same underlying Org state.

---

## Change History (Optional but Supported)

Org may expose:

- Timestamped change events
- Before/after snapshots of explicit user edits

Org does NOT:

- Interpret changes
- Judge correctness
- Attribute intent

---

## Explicit Non-Responsibilities

Org will NOT:

- Rank priorities for users
- Learn from user behavior
- Store feedback signals
- Generate recommendations
- Make predictions
- Optimize structures

Any system reading Org must treat it as factual context only.

---

## Consumption Expectations

Consumers (e.g. LoopBrain) may:

- Read Org state
- Compute their own interpretations
- Ask questions based on structure and gaps

Consumers must NOT:

- Expect Org to be "complete"
- Assume missing data is an error
- Write intelligence artifacts back into Org

Org is read-only to intelligence layers.

---

## Guardrails

Org maintains strict boundaries to remain a stable context substrate:

- **Derived properties must remain deterministic**: Same inputs always produce same outputs
- **No inference from hierarchy**: Org never guesses missing data from relationships
- **No learning, scoring, or recommendation logic**: Org stores facts only
- **Missing data is valid**: Absence of a field is meaningful, not an error
- **Intelligence layers read Org; they do not write reasoning back**: Org is read-only to AI systems

These guardrails ensure Org remains trustworthy and stable for downstream consumers.

---

## Org v1 is Frozen

Org v1 schema and semantics are frozen. Changes require explicit justification.

### What changes are allowed:
- Bug fixes (incorrect behavior)
- UI polish (visual improvements, accessibility)
- Performance optimizations (without changing semantics)
- Documentation improvements

### What changes require a new version:
- Schema changes (new models, new required fields)
- Semantics changes (meaning of existing fields)
- New derived properties that change existing behavior
- Breaking changes to read model contracts

Future improvements should be explicitly versioned (Org v1.1, v2, etc.) with clear migration paths.

---

## Version

This contract applies to Org v1 and all future versions unless explicitly superseded.

