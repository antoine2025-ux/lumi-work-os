# Loopbrain Ingestion Contract (Org) — v1

## Purpose
This contract defines the **stable, structured Org context** that Loopbrain consumes.
Org guarantees:
- Tenant scoping via workspaceId (implicit; never passed from client)
- Deterministic derived signals (no opaque scoring)
- Backwards-compatible evolution via explicit versioning

## Canonical Endpoint
- GET `/api/org/loopbrain/context`
- **Default version**: v1 (returned when no version is specified)
- **Request v2**: Header `X-Loopbrain-Context-Version: v2` or query `?version=v2`

### Auth & Scoping (Non-negotiable)
- `workspaceId` is obtained only via `getUnifiedAuth(request)`
- `assertAccess(scope: "workspace", requireRole: ["MEMBER"])` is enforced
- `setWorkspaceContext(workspaceId)` is called before any Prisma query
- `orgId` does not exist

## Response Envelope
```json
{
  "context": { ...LoopbrainOrgContextV1 }
}
```

## LoopbrainOrgContextV1 Shape

### Root Fields
- `generatedAt`: ISO string (ISO 8601 timestamp)
- `version`: `"v1"` (literal string)

### readiness
- `ready`: boolean (deterministic; true only if all checklist items are complete)
- `items`: Array of deterministic checklist statuses

#### Checklist Item Keys (v1)
- `people_added`
- `structure_defined`
- `ownership_assigned`
- `reporting_defined`
- `availability_set`

Each item shape:
- `key`: string (one of the keys above)
- `complete`: boolean
- `meta`: object (numbers only; no prose strings)

### orgCounts
All fields are non-negative integers:
- `people`: number (count of active positions with userId)
- `teams`: number (count of active teams)
- `departments`: number (count of active departments)
- `unownedEntities`: number (teams + departments without owners)
- `missingManagers`: number (positions without parentId, only if peopleCount > 1)
- `availabilityUnknown`: number (people without availability status)
- `availabilityStale`: number (people with stale availability data)

### intelligence
- `snapshot`: `null` | `{ id: string, createdAt: ISO string, source: string, findingCount: number }`
- `rollups`: `null` | `{ totals: { findings: number }, bySignal: Record<string, number>, bySeverity: Record<string, number> }`
- `topFindings`: array (stored snapshot finding objects; max 25)

### recommendations
- `snapshot`: `null` | `{ id: string, createdAt: ISO string }`
- `topActions`: array (recommendations derived from latest snapshot findings; max 25)

## Invariants (v1)
- If `orgCounts.people == 0` → `readiness.ready` MUST be `false`
- `orgCounts.missingManagers` MUST be `<= orgCounts.people`
- `topFindings` and `topActions` MUST always be arrays (possibly empty)
- Contract must remain workspace-scoped; never accept `workspaceId` as input
- All counts are non-negative integers
- `readiness.ready` is `true` if and only if all `readiness.items[].complete` are `true`

## Backwards Compatibility Rules

### Allowed Changes (do NOT bump version)
- Add new fields (optional) anywhere in v1 objects
- Add new checklist items (as additional entries), but do not rename existing keys
- Add new signal types to intelligence rollups, as long as existing types remain unchanged
- Increase `topFindings`/`topActions` array size limits

### Breaking Changes (require version bump to v2)
- Renaming/removing any existing field
- Changing field types (number → string, array → object, etc.)
- Removing or altering existing checklist key semantics
- Changing the endpoint path or response envelope
- Making optional fields required
- Changing the meaning of existing numeric fields (e.g., changing what "people" counts)

## Versioning Policy
- `v1` is stable.
- When a breaking change is required, introduce:
  - `version: "v2"`
  - new doc: `LOOPBRAIN_INGESTION_CONTRACT_V2.md`
  - maintain v1 endpoint behavior for a deprecation window if needed.
- Non-breaking additions can be made to v1 without version bump.

## Ownership
- This document is authoritative for Org ↔ Loopbrain integration.
- Any PR touching `/api/org/loopbrain/context` or `buildLoopbrainOrgContext()` must update this doc if contract changes.
- Contract changes require review from Loopbrain integration owners.

## Related Documentation
- Examples: `LOOPBRAIN_INGESTION_EXAMPLES_V1.md`
- Pre-merge checklist: `PRE_MERGE_CHECKLIST.md`

