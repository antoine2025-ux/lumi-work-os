# Project Accountability Rules

## Purpose
Project accountability makes ownership and decision authority explicit.
It is separate from reporting hierarchy.

## Definitions
- **Owner**: accountable for correctness and outcomes.
- **Decision authority**: authorized to approve/deny key tradeoffs.
- **Escalation**: fallback when owner/decision authority is unavailable or blocked.

## Allowed targets
Each field can be set to:
- Person (by id), OR
- Role (free-text string), OR
- Not set

Person and role are mutually exclusive per field.

## Org guarantees
- Org never infers owner/decision/escalation from managers.
- Org allows missing accountability as valid state.
- Org exposes deterministic "Accountability status" derived from explicit fields only.

## Completeness semantics (v1)
- **Complete**: Owner AND Decision authority are set (person or role).
- **Incomplete**: otherwise.
- Escalation is optional but recommended.

## What Org can answer
- Who owns this project?
- Who decides for this project?
- Who does this escalate to?

Org cannot answer:
- Who should work on it
- Whether capacity exists
- Whether assignment is optimal

## Coverage (v1.1)
Projects may optionally define explicit backups:
- Backup owner
- Backup decision authority

Backups are used only as factual coverage information.
Org does not auto-route to backups.

