# orgId → workspaceId Migration Map

**Date:** 2026-02-28
**Branch:** phase2/aleks-integrations-infra
**Auditor:** Claude Code (Explore agent)
**Status:** Read-only audit — no files changed

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total API route files with `orgId` references | 63 |
| Classification A — Safe (simple alias) | 47 |
| Classification B — Dual-query (fallback logic) | 12 |
| Classification C — Schema-blocked | 4 |
| Classification D — Complex | 0 |
| Prisma models with `orgId` field (not `workspaceId`) | 28 |
| `logOrgAudit` call sites passing `orgId:` param | 12+ |

**Key finding:** The scoping middleware (`scopingMiddleware.ts`) only handles `workspaceId`. Routes that query by `orgId` bypass automatic workspace isolation until the schema is renamed.

---

## Part 1 — Prisma Models Still Using `orgId` Field

The following 28 models have a literal field named `orgId` (not `workspaceId`). Schema rename is prerequisite for most API route migrations.

| Model | Line (schema.prisma) |
|-------|---------------------|
| `SavedView` | ~2193 |
| `OrgPersonIssue` | ~2212 |
| `OrgDuplicateCandidate` | ~2263 |
| `OrgPersonMergeLog` | ~2280 |
| `OrgSuggestionRun` | ~2297 |
| `OrgLoopBrainConfig` | ~2312 |
| `LoopBrainFeedback` | ~2338 |
| `LoopBrainOutcome` | ~2355 |
| `OrgLoopBrainRollout` | ~2369 |
| `OrgHealthSnapshot` | ~2551 |
| `OrgHealthSignal` | ~2569 |
| `OrgFixEvent` | ~2632 |
| `SavedOrgView` | ~2646 |
| `OrgDefaultView` | ~2662 |
| `OrgHealthDigest` | ~2673 |
| `AuditLogEntry` | ~2687 |
| `OrgMembership` | ~2703 |
| `Role` | ~2802 |
| `PersonCapacity` | ~2836 |
| `CapacityAllocation` | ~2858 |
| `PersonRoleAssignment` | ~3010 |
| `Domain` | ~3064 |
| `SystemEntity` | ~3077 |
| `ManagerProfile` | ~3115 |
| `OrgRoleTaxonomy` | ~3130 |
| `OrgSkillTaxonomy` | ~3141 |

**Already migrated (Phase 1 — reference):**
- `PersonAvailabilityHealth` — comment: "Phase 1: migrated from orgId"
- `OwnerAssignment` — comment: "Phase 1: migrated from orgId"
- `PersonManagerLink` — comment: "Phase 1: migrated from orgId"

---

## Part 2 — Scoping Middleware

**File:** `src/lib/prisma/scopingMiddleware.ts`

**Finding:** Only handles `workspaceId`. No `orgId` injection or filtering. This is correct by design, but it means any route still querying by `orgId` is **not** automatically workspace-scoped by the middleware — a security gap until the schema is updated.

---

## Part 3 — `logOrgAudit` Function

**File:** `src/lib/orgAudit.ts` (line ~36)

The function still expects `orgId: string` as a parameter name (passed to `AuditLogEntry.orgId`). All 12+ call sites pass `orgId: workspaceId`. Once `AuditLogEntry.orgId` is renamed to `workspaceId` in the schema, this function signature must also change.

---

## Part 4 — Full File Classification

### Classification A — SAFE (47 files)
Simple alias: `where: { orgId: workspaceId }` or `data: { orgId: workspaceId }`. After schema rename these become `where: { workspaceId }` — safe batch update.

| File | Lines | Notes |
|------|-------|-------|
| `src/app/api/org/systems/route.ts` | 24, 55 | SystemEntity |
| `src/app/api/org/members/route.ts` | 25, 59, 63 | OrgMembership |
| `src/app/api/org/duplicates/route.ts` | 22 | OrgDuplicateCandidate |
| `src/app/api/org/issues/sync/route.ts` | 33, 35, 40, 47, 56, 64 | OrgPersonIssue |
| `src/app/api/org/loopbrain/rollout/route.ts` | 20, 45 | OrgLoopBrainRollout |
| `src/app/api/org/merges/route.ts` | various | OrgPersonMergeLog |
| `src/app/api/org/loopbrain/feedback/route.ts` | various | LoopBrainFeedback |
| `src/app/api/org/loopbrain/engines/route.ts` | various | OrgLoopBrainConfig |
| `src/app/api/org/loopbrain/metrics/route.ts` | various | OrgHealthSnapshot |
| `src/app/api/org/health/signals/[id]/route.ts` | various | OrgHealthSignal |
| `src/app/api/org/digest/config/route.ts` | various | OrgHealthDigest |
| `src/app/api/org/people/update-profile/route.ts` | various | ManagerProfile |
| `src/app/api/org/people/export/route.ts` | various | OrgMembership |
| `src/app/api/org/people/availability/route.ts` | various | PersonCapacity |
| `src/app/api/org/people/archived/restore/route.ts` | various | OrgMembership |
| `src/app/api/org/people/structure/validate/route.ts` | various | OrgMembership |
| `src/app/api/org/people/structure/route.ts` | various | PersonRoleAssignment |
| `src/app/api/org/people/structure/detail/route.ts` | various | PersonRoleAssignment |
| `src/app/api/org/people/manager/route.ts` | various | ManagerProfile |
| `src/app/api/org/people/manager/edge/route.ts` | various | ManagerProfile |
| `src/app/api/org/people/bulk/route.ts` | various | OrgMembership |
| `src/app/api/org/duplicates/undo/route.ts` | various | OrgDuplicateCandidate |
| `src/app/api/org/duplicates/sync/route.ts` | various | OrgDuplicateCandidate |
| `src/app/api/org/duplicates/merge/route.ts` | various | OrgDuplicateCandidate |
| `src/app/api/org/data-quality/resolve-manager-conflicts/route.ts` | various | ManagerProfile |
| `src/app/api/org/data-quality/refresh-availability/route.ts` | various | PersonCapacity |
| `src/app/api/org/data-quality/adjust-allocation/route.ts` | various | CapacityAllocation |
| `src/app/api/org/taxonomy/upsert/route.ts` | various | OrgRoleTaxonomy / OrgSkillTaxonomy |
| `src/app/api/org/taxonomy/roles/route.ts` | various | OrgRoleTaxonomy |
| `src/app/api/org/taxonomy/skills/route.ts` | various | OrgSkillTaxonomy |
| `src/app/api/org/ownership/bulk-assign/route.ts` | various | OwnerAssignment |
| `src/app/api/org/roles/assign/route.ts` | various | PersonRoleAssignment |
| `src/app/api/org/invitations/resend/route.ts` | various | OrgMembership |
| `src/app/api/org/import/apply/route.ts` | various | OrgMembership |
| `src/app/api/loopbrain/q2/route.ts` | various | LoopBrainFeedback |
| `src/app/api/loopbrain/q6/route.ts` | various | OrgHealthSnapshot |
| `src/app/api/loopbrain/q7/route.ts` | various | OrgHealthSnapshot |
| `src/app/api/loopbrain/q8/route.ts` | various | OrgHealthSignal |
| `src/app/api/loopbrain/q9/route.ts` | various | OrgHealthDigest |
| `src/app/api/loopbrain/org/q4/route.ts` | various | OrgLoopBrainConfig |
| `src/app/api/internal/loopbrain/run/route.ts` | various | OrgLoopBrainConfig |
| `src/app/api/internal/loopbrain/people-issues/run/route.ts` | various | OrgPersonIssue |
| `src/app/api/org/issues/preview/route.ts` | various | OrgPersonIssue |
| `src/app/api/org/issues/apply/route.ts` | various | OrgPersonIssue |
| `src/app/api/org/insights/overview/route.ts` | various | OrgHealthSnapshot / logOrgAudit |
| `src/app/api/org/views/route.ts` | 57 | SavedView (context check) |
| `src/app/api/org/people/health/route.ts` | various | PersonAvailabilityHealth |

---

### Classification B — DUAL-QUERY (12 files)
Has fallback `OR` clauses, comparison logic using `orgId`, or `logOrgAudit({ orgId: ... })` calls. Requires targeted edits.

| File | Lines | Issue | Required Change |
|------|-------|-------|-----------------|
| `src/app/api/org/projects/route.ts` | 27–28, 79, 148 | `OR: [{ orgId: workspaceId }, { workspaceId }]` fallback | Remove OR, keep `{ workspaceId }` |
| `src/app/api/loopbrain/q1/route.ts` | 51, 87 | `OR: [{ orgId: workspaceId }, { workspaceId }]` fallback | Remove OR, keep `{ workspaceId }` |
| `src/app/api/org/views/pin/route.ts` | 20 | `if (view.orgId !== workspaceId)` comparison | Change to `view.workspaceId` post-schema |
| `src/app/api/org/views/default/route.ts` | 20, 23 | `orgId` comparison + `updateMany({ where: { orgId } })` | Update both comparison and where clause |
| `src/app/api/org/teams/route.ts` | 133 | `logOrgAudit({ orgId: workspaceId, ... })` | Rename param after `logOrgAudit` sig change |
| `src/app/api/org/departments/route.ts` | 94 | `logOrgAudit({ orgId: workspaceId, ... })` | Rename param |
| `src/app/api/org/invitations/route.ts` | 31, 60, 94 | `orgId` in create + `logOrgAudit` | Post-schema rename + param rename |
| `src/app/api/org/loopbrain/rollout/route.ts` | 20, 45, 62 | `logOrgAudit` + `OrgLoopBrainRollout.orgId` | Post-schema + param rename |
| `src/app/api/org/people/update/route.ts` | 97 | `logOrgAudit({ orgId: auth.workspaceId, ... })` | Rename param |
| `src/app/api/org/roles/[id]/route.ts` | various | Role model + possible logOrgAudit | Post-schema rename |
| `src/app/api/org/people/bulk/route.ts` | various | Bulk ops with logOrgAudit | Rename param |
| `src/app/api/org/people/health/route.ts` | 28, 32 | `ctx.orgId` context access | Change to `ctx.workspaceId` |

---

### Classification C — SCHEMA-BLOCKED (4 files)
Directly reference model fields that are still named `orgId`. Will convert to Class A automatically after schema rename.

| File | Lines | Blocked Model |
|------|-------|--------------|
| `src/app/api/org/systems/route.ts` | 24, 55 | `SystemEntity.orgId` |
| `src/app/api/org/domains/route.ts` | 18, 43 | `Domain.orgId` |
| `src/app/api/org/roles/route.ts` | 22, 77 | `Role.orgId` |
| `src/app/api/org/fix-events/route.ts` | 45, 57, 83, 99, 149, 169 | `OrgFixEvent.orgId` |

---

## Recommended Migration Order

### Phase 1 — Schema Rename (prerequisite)
1. Rename `orgId` → `workspaceId` on all 28 Prisma models in `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name rename_orgid_to_workspaceid`
3. Update `logOrgAudit()` in `src/lib/orgAudit.ts`: rename param `orgId` → `workspaceId`, update `AuditLogEntry` create
4. Verify no new models need adding to `WORKSPACE_SCOPED_MODELS` (all 28 are org-scoped and likely already present)

### Phase 2 — Batch A: Safe files (47 files)
After schema rename, all Class A files will have broken TypeScript (`orgId` no longer a valid field). Batch update with targeted sed or manual edits:
- `where: { orgId: workspaceId }` → `where: { workspaceId }`
- `data: { orgId: workspaceId }` → `data: { workspaceId }`
- `select: { orgId: true }` → `select: { workspaceId: true }`

Run `npm run typecheck` after batch to catch stragglers.

### Phase 3 — Batch B: Dual-query files (12 files)
Targeted edits per file:
- Remove `OR: [{ orgId }, { workspaceId }]` — collapse to `{ workspaceId }`
- Update `logOrgAudit` call sites: `orgId: workspaceId` → `workspaceId`
- Update `ctx.orgId` → `ctx.workspaceId` (check context object shape)

### Phase 4 — Validation
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

---

## Risk Assessment

| Risk | Level | Notes |
|------|-------|-------|
| Schema rename (28 models) | Medium | Coordinated migration; must run cleanly in dev + prod |
| Batch A replacements (47 files) | Low | Mechanical, consistent pattern |
| Dual-query collapse (12 files) | Medium | OR fallback removal must be tested; validates only workspaceId |
| `logOrgAudit` sig change | Low | 12+ call sites, all pass `workspaceId` value already |
| Scoping bypass during migration | High | Routes using `orgId` in where clauses are NOT auto-scoped; fix promptly |

**No Classification D (Complex) files found — migration is lower risk than anticipated.**
