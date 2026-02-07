# Loopbrain: Audit & Activity Signals (Unify for Loopbrain)

This doc records the current state of audit/activity data and the decision for a single stream Loopbrain can consume.

## Current state

### Activity (generic entity/action)

- **Schema:** `Activity` in `prisma/schema.prisma` — `id`, `actorId`, **`workspaceId`** (added to schema to match DB; migration `20251210110313_add_workspace_to_activity` already added it in DB), `entity`, `entityId`, `action`, `meta`, `createdAt`.
- **Scope:** Workspace-scoped. Used for recent-activity context in Loopbrain (`getActivityContext`) and in AI chat context.
- **Writers:** Application code that records user actions (e.g. project/task/wiki updates). All new Activity rows must set `workspaceId` for tenant safety.

### OrgAuditLog (org/workspace events)

- **Schema:** `OrgAuditLog` — workspaceId, userId, actorUserId?, targetUserId?, action, entityType, entityId, oldValues, newValues, event (OrgAuditEventType?).
- **Writers:** Two implementations — `src/lib/orgAudit.ts` and `src/server/audit/orgAudit.ts` — for different event sets (invites, teams, departments, custom roles; org created/deleted, member add/remove/role, ownership transfer).
- **Gap:** Many org mutations do **not** write to OrgAuditLog (e.g. position create/update/archive, profile overrides, capacity, work requests, issue resolutions).

### Loopbrain-specific logs

- **OrgQnaLog,** **OrgLoopbrainQueryLog,** **OrgLoopbrainQuery** — workspace-scoped; used for Org Q&A and query analytics only, not a general audit stream.

## Decision: single stream for Loopbrain

**Option A — Extend OrgAuditLog:** Add events for all org mutations (position, profile, capacity, work, issue resolution) and have Loopbrain read OrgAuditLog + Activity (two streams, but OrgAuditLog becomes the single org-event stream).

**Option B — Single action log:** Introduce a new table (e.g. `UserActionLog` or `UnifiedAuditLog`) with a common shape (workspaceId, userId, action, entityType, entityId, meta, createdAt) and have both “activity” and “org audit” writers write there; deprecate or mirror from Activity/OrgAuditLog over time.

**Option C — Keep two streams, align schema:** Keep Activity and OrgAuditLog as-is; ensure Activity has workspaceId everywhere (done in schema); document that Loopbrain “recent context” uses Activity (workspace-scoped), and that “org change history” uses OrgAuditLog where available, with the known gap (many org mutations not logged).

**Recommendation (short term):** **Option C** — Schema is now aligned (Activity.workspaceId in Prisma). No new migration required. Document the gap and, when adding new org mutation handlers, add OrgAuditLog (or Activity) writes so Loopbrain can gradually get better coverage. Revisit Option A or B when product requires a single “everything a user did” API for Loopbrain.

## References

- `prisma/schema.prisma` — Activity (workspaceId), OrgAuditLog.
- `docs/ORG_FEATURE_CURRENT_STATE_AUDIT.md` — Step 6 (Audit Trail / Activity), Step 9 (Loopbrain context and audit).
