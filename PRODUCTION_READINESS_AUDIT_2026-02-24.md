# Production Readiness Audit — Loopwell
**Date:** 2026-02-24
**Branch:** integration/merge-stabilized
**Auditor:** Claude Code (automated static analysis + test run)

---

## Executive Summary

| Dimension | Status | Score |
|-----------|--------|-------|
| TypeScript health | ⚠️ 77 errors, all traceable to 4 root causes | 6/10 |
| Test suite | ⚠️ 19/795 failing, 4 are CRITICAL wiki/isolation failures | 7/10 |
| Performance | ✅ Dashboard guarded, org data cached, indexes mostly present | 8/10 |
| Error handling | ⚠️ 44% routes lack handleApiError; 20 CRITICAL routes unguarded | 5/10 |
| Data integrity | ✅ 238 cascade rules, minor gaps | 8/10 |
| Auth / RBAC | 🔴 20 org routes missing auth entirely; 20+ missing assertAccess | 4/10 |
| UI completeness | ⚠️ 121 TODO/FIXME; 4 known incomplete flows | 7/10 |

**Overall: NOT production-ready in current state.** Two blocking categories: auth gaps on sensitive org routes, and SQL injection in `simple-auth.ts`.

---

## 1. TypeScript Error Analysis

**Total errors: 77** (up from baseline of 61 — +16 new errors from Framer Motion upgrade)

### Root Cause Breakdown

#### Root Cause 1: NextAuth v4 → v5 Type Breakage (~45 errors) — CRITICAL
The project imports removed v4 exports. Runtime still works (JSDoc casts), but type safety is gone.

| Error | Files | Count |
|-------|-------|-------|
| `'getServerSession' not exported` | 15 API routes + simple-auth + auth-utils + google-calendar | ~18 |
| `'NextAuthOptions' not exported` | server/authOptions.ts | 1 |
| `'User' not exported` | loopbrain/executor.ts, pm/guards.ts | 2 |
| `'getToken'/'encode' not exported` | middleware.ts, e2e-auth/route.ts | 2 |
| `.user` not on `{}` session type | unified-auth.ts (×6), auth-helpers.ts (×2), user-status-provider.tsx (×5), invite/page.tsx (×2), create-project-dialog.tsx (×1) | 16 |

**CRITICAL FILES:**
- `src/lib/unified-auth.ts:127,142,165,166,213,215` — backbone for 326 routes
- `src/middleware.ts:3` — route protection logic
- `src/server/authOptions.ts:61,136,173,326` — JWT callback implicitly typed `any`

**Fix:** Add `next-auth.d.ts` type augmentation for session/user, or migrate to v5 typed API.

#### Root Cause 2: Framer Motion `ease` type mismatch (12 errors) — MEDIUM
Using `ease: number[]` (valid cubic-bezier runtime) but Framer Motion's strict `Easing` type doesn't accept untyped `number[]`.

| File | Lines |
|------|-------|
| `src/app/page.tsx` | 296, 318, 340, 362, 384, 409, 424, 436, 448, 469 |
| `src/components/landing/ArchitectureMockup.tsx` | 128, 196, 244 |

**Fix:** Cast arrays as `[number, number, number, number]` or use named easing strings (`"easeInOut"`).

#### Root Cause 3: OpenAI SDK message type (1 error) — HIGH
`src/app/api/assistant/generate-draft/route.ts:230` — `{ role: string, content: string }` not assignable to `ChatCompletionMessageParam` (needs discriminated union with `role` as literal type).

**Fix:** Cast role: `role: 'user' as const`.

#### Root Cause 4: computeOrgIntelligence (4 errors) — HIGH
`src/lib/org/intelligence/computeOrgIntelligence.ts:359` — `deriveTeamSkillSummary` not found; lines 385, 395, 398 have implicit `any` on lambda `g` parameter.

**Fix Priority Order:**
1. `unified-auth.ts` + `middleware.ts` (auth backbone) — 1-2h
2. `generate-draft/route.ts` — 15min
3. `computeOrgIntelligence.ts` — 1h
4. Framer Motion casts — 30min

---

## 2. Test Failure Analysis

**Results: 8 files failed | 19 tests failed | 775 passed | 1 skipped (52 test files)**

### CRITICAL Failures (blocking production)

#### 1. Wiki Isolation: 500 Instead of 200 (2 failures)
**File:** `tests/api/workspace-isolation.spec.ts`
- `Cross-workspace wiki isolation > should not return workspace-2 wiki pages for workspace-1 user` → 500
- `Personal space isolation > should not return workspace-2 personal wiki pages` → 500

**Root cause:** Wiki list route is throwing an unhandled 500. The NextAuth type errors in `unified-auth.ts` may cause runtime breakage in test mocking contexts. Or a DB operation is failing silently.
**Customer impact: CRITICAL** — data isolation is a core security guarantee.

#### 2. Wiki Security: Personal Pages 500 (2 failures)
**File:** `tests/api/wiki-security.spec.ts`
- `should exclude other users personal pages from GET /api/wiki/pages` → 500
- `should include current users personal pages in GET /api/wiki/pages` → 500

**Root cause:** Same as above — wiki route throwing 500 in test environment.
**Customer impact: CRITICAL** — personal page isolation broken in tests.

### HIGH Failures

#### 3. Duplication Tripwire (1 failure)
**File:** `src/lib/org/intelligence/__tests__/duplication-tripwire.test.ts`
- 8 `OwnerAssignment` queries bypassing the intelligence layer
- Affected: `server/org/completeness/check.ts`, `server/org/health/compute-minimal.ts`, `server/org/health/ownership/scan.ts`, `server/org/health/setup/completeness.ts`, `server/org/setup/status.ts`, `lib/org/snapshot/buildOrgSemanticSnapshotV0.ts` (×3)
- **Impact:** Duplicated logic diverges over time; org intelligence gives stale answers.

#### 4. EntityGraph Determinism (1 failure)
**File:** `tests/loopbrain/entity-graph.test.ts`
- Nodes not sorted by ID: `['person_alice', 'person_bob', ...]` vs expected `['department_engineering', ...]`
- **Impact:** Loopbrain answers may be non-deterministic across requests.

#### 5. Reasoning Engine Determinism (1 failure, FLAKY)
**File:** `src/lib/org/reasoning/__tests__/engine.test.ts`
- `computedAt` differs by 1ms — race condition in test timing
- **Impact:** Flaky CI, not a production bug. Fix: exclude `computedAt` from deep equality.

#### 6. Loopbrain Snapshot Drift (9 failures)
**File:** `src/lib/loopbrain/__tests__/loopbrain.snapshots.test.ts`
- 9 snapshots failed + 1 obsolete
- **Impact:** Either intentional (snapshots need update after feature changes) or regression. Update snapshots after confirming output quality.

### Tests That MUST Pass Before Shipping
1. `tests/api/workspace-isolation.spec.ts` — all 13 tests
2. `tests/api/wiki-security.spec.ts` — all 10 tests
3. `tests/loopbrain/entity-graph.test.ts` — determinism for Loopbrain consistency
4. `src/lib/org/intelligence/__tests__/duplication-tripwire.test.ts` — architectural correctness

---

## 3. Performance Analysis

**API route count: 436**

### Dashboard Bootstrap (`/api/dashboard/bootstrap/route.ts`) — ✅ WELL-GUARDED
- Explicit constants: MAX_PROJECTS=10, MAX_WIKI_PAGES=4, MAX_TODOS=50, MAX_DRAFTS=6
- `Promise.all` parallel execution of 8 queries
- `select: {}` with minimal field projection (no `include`, no `body/content` fields)
- **No action needed.**

### Org Data Loading (`src/lib/org/data.server.ts`) — ✅ CACHED WITH MINOR N+1 RISK
- TTL caches: 1-5 min across 5 loader functions
- Parallelized with `Promise.all` throughout
- **N+1 risk at line 533:** `$queryRawUnsafe` in a `departmentIds.map()` loop for owner resolution — could fire multiple DB queries if cache misses
- Sequential queries at lines 508→512 (ownerAssignment after departments load) — acceptable

### Routes with findMany + Loops (potential N+1)
The following routes combine `await prisma.*` with `for`/`forEach` — audit each:
- `src/app/api/assistant/message/route.ts`
- `src/app/api/assistant/publish/route.ts`
- `src/app/api/assistant/sessions/route.ts`
- `src/app/api/assistant/sessions/[id]/route.ts`
- `src/app/api/role-cards/route.ts`
- `src/app/api/migrations/blog/route.ts` (migration script, not critical)

### Database Index Coverage
- **348 `@@index` definitions** across 162 models — excellent overall
- **443 `workspaceId` column occurrences** vs **348 indexes** — gap exists
- **12 models with `workspaceId` but missing `@@index([workspaceId])`:**
  - `Workspace`, `OrgCustomRole`, `WikiChunk`, `OnboardingTemplate`, `OnboardingPlan`
  - `Workflow`, `ProjectTemplate`, `Epic`, `Milestone`
  - `OrgIntelligenceSettings`, `OrgCapacitySettings`, `WorkEffortDefaults`
- **Recommendation:** Add `@@index([workspaceId])` to these models — query performance will degrade as workspaces scale.

---

## 4. Error Handling Gaps

**handleApiError coverage: 247/436 routes (57%)**

### High-Risk Routes Without Try-Catch OR handleApiError (20 routes)
These routes can return raw 500 errors to clients with stack traces:

**Org management (sensitive data mutations):**
- `src/app/api/org/delete/route.ts` — workspace deletion, no error handling
- `src/app/api/org/ownership/transfer/route.ts` — ownership transfer
- `src/app/api/org/members/remove/route.ts`
- `src/app/api/org/members/update-role/route.ts`
- `src/app/api/org/members/leave/route.ts`
- `src/app/api/org/invitations/cancel/route.ts`
- `src/app/api/org/invitations/accept/route.ts`
- `src/app/api/org/invitations/create/route.ts`
- `src/app/api/org/issues/apply/route.ts`
- `src/app/api/org/issues/preview/route.ts`
- `src/app/api/org/issues/sync/route.ts`
- `src/app/api/org/views/pin/route.ts`
- `src/app/api/org/views/default/route.ts`

**Other:**
- `src/app/api/socketio/route.ts`, `src/app/api/socket/route.ts`
- `src/app/api/debug/env/route.ts`, `src/app/api/debug/prisma-models/route.ts`
- `src/app/api/dev/org-telemetry/route.ts`, `src/app/api/dev/org-debug/route.ts`

### JSON.parse Without Try-Catch (8 high-risk locations)
Uncaught SyntaxError will bubble to 500:

| File | Line | Risk |
|------|------|------|
| `src/app/api/integrations/slack/webhook/route.ts:136` | Parses external payload | **HIGH** — external data |
| `src/app/api/integrations/slack/callback/route.ts:54` | OAuth state decode | **HIGH** |
| `src/app/api/ai/chat/route.ts:38,46` | AI response parsing | MEDIUM |
| `src/app/api/onboarding/generate/route.ts:170` | AI plan parsing | MEDIUM |
| `src/app/api/cron/insights/route.ts:105` | Cron webhook body | MEDIUM |
| `src/app/api/tasks/[id]/custom-fields/route.ts:130` | DB field options | LOW |

### Zod `.parse()` Instead of `.safeParse()` (15+ routes)
These throw `ZodError` uncaught if not inside `try-catch`. Routes inside `try-catch` are safe; confirm all 15 are wrapped:
- Tasks routes (7 occurrences)
- Calendar events route (3 occurrences)
- Goals routes (3 occurrences)

### Missing setWorkspaceContext (68 routes)
Routes with Prisma access but no workspace context injection — data may leak across workspaces in production (when `PRISMA_WORKSPACE_SCOPING_ENABLED=true`).

---

## 5. Data Integrity Concerns

### Schema: 238 onDelete Cascades — ✅ MOSTLY GOOD
The bulk of core relations are protected. Relations listed "without onDelete" in the grep output are backreference arrays on the `User` model (e.g., `ownedProjects`, `assignedTasks`) — these are the "many" side of FK relations where cascade is defined on the owning model. Not a concern.

### Nullable workspaceId — ⚠️ 1 Model
`prisma/schema.prisma:2041` — one model has `workspaceId String?` (nullable). All other workspace-scoped models use `workspaceId String` (required). This model could create orphaned records.
- **Action:** Identify the model at line 2041, assess if nullable is intentional, and add `NOT NULL` constraint if not.

### Missing workspaceId Indexes — 12 Models
(See Section 3 — Performance Analysis)

### Missing Unique Constraints
- Slug fields exist on models where `@@unique([workspaceId, slug])` may be missing — potential duplicate slug collisions. `WikiPage` already has `@@unique([workspaceId, slug])`.

---

## 6. Auth / Permissions Edge Cases

### CRITICAL: 20+ Org Routes Missing getUnifiedAuth
These routes process sensitive org mutations with **zero authentication**:

| Route | Data Sensitivity | Risk |
|-------|-----------------|------|
| `org/delete/route.ts` | Workspace deletion | 🔴 CRITICAL |
| `org/ownership/transfer/route.ts` | Ownership change | 🔴 CRITICAL |
| `org/departments/route.ts` | Dept structure | 🔴 HIGH |
| `org/roles/route.ts` + `[id]/route.ts` | Role management | 🔴 HIGH |
| `org/custom-roles/route.ts` | Custom RBAC | 🔴 HIGH |
| `org/management/link/route.ts` | Manager links | HIGH |
| `org/taxonomy/upsert/route.ts` + `roles/route.ts` + `skills/route.ts` | Taxonomy | HIGH |
| `org/people/update-profile/route.ts` | Person data | HIGH |
| `org/insights/overview/route.ts` | Intelligence data | MEDIUM |
| `org/role-cards/[id]/position/route.ts` | Role assignments | MEDIUM |
| `calendar/events/route.ts` | Calendar events | MEDIUM |
| `assistant/session/route.ts` | AI sessions | MEDIUM |
| `org/projects/route.ts` | Org project list | MEDIUM |
| `migrations/blog/route.ts` + `import/route.ts` | Data migration | LOW (dev only) |

### HIGH: 20+ Routes with Auth but No assertAccess
These authenticate the user but don't enforce minimum role requirements:
- `assistant/stream`, `assistant/message`, `assistant/sessions`, `assistant/history`, `assistant/generate-draft`
- `my-tasks/route.ts`
- `org/intelligence/route.ts`, `org/readiness/route.ts`
- `org/departments/[id]/route.ts`, `org/views/[viewId]/route.ts`, `org/views/route.ts`
- `org/invitations/respond/route.ts`
- `loopbrain/index-health/route.ts`
- `projects/[projectId]/documentation/route.ts` + `[docId]/route.ts`
- `projects/[projectId]/tasks/route.ts`, `projects/[projectId]/assignees/route.ts`
- `projects/[projectId]/daily-summaries/route.ts`

### SQL Injection Risk — 15 Locations
`$queryRawUnsafe` / `$executeRawUnsafe` with potential string interpolation (previously flagged as P0 for some; expanded here):

| File | Lines | Status |
|------|-------|--------|
| `src/lib/simple-auth.ts` | 254, 362, 427 | 🔴 P0 — unparameterized auth queries |
| `src/server/org/people/write.ts` | 80, 142 | 🔴 P0 — person create/update |
| `src/app/api/org/structure/departments/[departmentId]/owner/route.ts` | 134, 150, 170 | HIGH — dept owner assignment |
| `src/server/org/structure/read.ts` | 94 | HIGH — structure reads |
| `src/server/org/structure/write.ts` | 66 | HIGH — structure writes |
| `src/lib/org/data.server.ts` | 533 | MEDIUM — owner resolution (in TTL cache path) |
| `src/app/api/migrations/blog/route.ts` | 47, 61, 74, 102 | LOW — migration script |

**Fix:** Replace all with `prisma.$queryRaw(Prisma.sql\`...\`)` or parameterized `$queryRaw` tagged templates. `Prisma.sql` sanitizes interpolated values automatically.

### prismaUnscoped Misuse
Only `src/app/api/debug/db/route.ts` — debug endpoint, acceptable. No production misuse found.

### Workspace Scoping Status
- `PRISMA_WORKSPACE_SCOPING_ENABLED` = false in current environment (tests confirm)
- 68 routes access prisma without `setWorkspaceContext` — these will silently return cross-workspace data if scoping is ever enabled in production
- **Current WORKSPACE_SCOPED_MODELS count: 97** (as of today's batch additions)

---

## 7. UI/UX Incomplete Flows

**Total TODO/FIXME in src/: 121**
(Most are `'TODO'` task status string literals — not incomplete code markers. True code TODOs estimated ~15-20.)

### Real Incomplete Flows

#### 1. Project Views Not Wired (P1 — known)
`src/app/(dashboard)/projects/[id]/page.tsx:672`
```
// TODO: Handle epics, timeline, files views
```
Epic, timeline, and files tabs render empty. Customer sees broken navigation for 3 of 5 project sub-views.

#### 2. OrgChart Context Unpopulated (P1 — known)
`src/app/org/chart/OrgChartClient.tsx:74-79`
```typescript
reportsToName: undefined, // TODO: Populate from department hierarchy
isHiring: false,          // TODO: Determine from recent job postings
recentChangeSummary: undefined, // TODO: Calculate from recent changes
isReorg: false,           // TODO: Determine from recent structural changes
```
OrgChart department nodes show no context, hiring status, or recent changes.

#### 3. People Filters Incomplete (P1 — known)
`src/app/org/people/PeoplePageClient.tsx:385`
```
// TODO: T2.5 — requires OrgAuditLog change history tracking
```
"Recently Changed" people filter returns empty. "Leaders" and "New" filters also incomplete.

#### 4. Stale Redirect Files (LOW)
- `src/app/(dashboard)/settings/page.tsx:6` — redirect shim, leave until links updated
- `src/app/(dashboard)/ask/page.tsx:6` — same
- `src/app/(dashboard)/projects/page.tsx:6` — same

### Console Errors vs User Feedback
- `src/app/(dashboard)/wiki/[slug]/wiki-page-client.tsx:264` — catches response errors in a variable but renders fallback instead of surfacing to user
- Several server components use server-side `console.error` (appropriate) but client components should show toast/error UI

---

## 8. Production Readiness Summary

### BLOCKING ISSUES (Fix before any customer sees the product)

1. **SQL injection in simple-auth.ts** — File: `src/lib/simple-auth.ts:254,362,427` — Unparameterized `$queryRawUnsafe` in authentication critical path. An attacker who can control username/email fields could exfiltrate or corrupt workspace data. — **Effort: 2-4h**

2. **20+ Org routes with zero authentication** — Files: `org/delete`, `org/ownership/transfer`, `org/departments`, `org/roles`, `org/custom-roles`, etc. — Any unauthenticated user can delete workspaces, transfer ownership, modify org structure. — **Effort: 4-6h** (add `getUnifiedAuth` + `assertAccess` pattern to each)

3. **Wiki isolation tests returning 500** — Files: `tests/api/workspace-isolation.spec.ts`, `tests/api/wiki-security.spec.ts` — 4 CRITICAL test failures suggest wiki routes throw unhandled errors in certain contexts. Investigate root cause before shipping. — **Effort: 2-4h**

4. **SQL injection in people write + dept owner routes** — Files: `src/server/org/people/write.ts:80,142`, `org/structure/departments/[departmentId]/owner/route.ts:134,150,170` — Same class as #1 but in people mutation and department ownership endpoints. — **Effort: 2-3h**

5. **NextAuth type augmentation broken** — Files: `src/lib/unified-auth.ts`, `src/middleware.ts` — Auth backbone has 6 `Property 'user' does not exist` errors. Runtime works via `any` casts but type safety is gone — bugs could slip through unnoticed. — **Effort: 2-4h**

---

### HIGH PRIORITY (Fix before scaling to 10+ customers)

1. **20+ routes with auth but no assertAccess** — Impact: Authenticated users of any role (VIEWER) can call MEMBER/ADMIN endpoints. AI endpoints, org intelligence, project mutations unguarded. — **Effort: 1-2 days**

2. **68 routes missing setWorkspaceContext** — Impact: When workspace scoping is enabled in production, these routes will return empty results or cross-workspace data — silent data loss. — **Effort: 2-3 days**

3. **20 org routes without error handling** — Impact: Any DB error in org/delete, org/members/*, org/invitations/* surfaces raw stack traces to clients. — **Effort: 4-6h**

4. **JSON.parse without try-catch in Slack webhook** — File: `src/app/api/integrations/slack/webhook/route.ts:136` — Malformed Slack payload crashes the webhook handler with 500. — **Effort: 30min**

5. **12 models missing workspaceId index** — Impact: Query performance degrades O(n) for Epic, Milestone, WikiChunk, Workflow, and 8 others as workspace data grows. — **Effort: 2h** (Prisma migration)

6. **Duplication tripwire: 8 ownership logic copies** — Impact: org intelligence ownership data may diverge from 5 other modules that directly query OwnerAssignment. — **Effort: 1 day**

7. **EntityGraph non-determinism** — Impact: Loopbrain may return different answers for the same question across requests. — **Effort: 2-4h**

---

### MEDIUM PRIORITY (Fix before Series A / growth phase)

1. **Framer Motion type errors (12)** — Landing page animations have wrong types; runtime works but upgrade could break animations silently. — **Effort: 1h**

2. **computeOrgIntelligence: `deriveTeamSkillSummary` missing (4 errors)** — Org intelligence module has dead function reference — team skill summaries may silently return empty. — **Effort: 2-4h**

3. **Project views epics/timeline/files not wired** — 3 of 5 project sub-views render empty. High customer friction for project-heavy teams. — **Effort: 1-2 sprints** (needs API wiring + components)

4. **OrgChart context unpopulated** — 4 department context fields always empty. — **Effort: 1-2 days**

5. **People filters incomplete** — "Leaders", "New", "Recently Changed" filters don't work. — **Effort: 2-3 days**

6. **Nullable workspaceId on schema line 2041** — One model allows NULL workspace — potential orphaned records. — **Effort: 30min** (identify + migration)

7. **Loopbrain snapshot drift (9)** — Update or delete stale snapshots; confirm Q-pipeline outputs are still correct. — **Effort: 1-2h**

8. **Reasoning engine determinism test (flaky)** — 1ms timestamp comparison race — fix by excluding `computedAt` from test comparison. — **Effort: 30min**

9. **`orgId` fallback pattern in 138 API route occurrences** — Migrate to clean `workspaceId` (previously P1, still open). — **Effort: 1 week**

10. **43 models still missing from WORKSPACE_SCOPED_MODELS** — Ongoing middleware sync gap. — **Effort: Ongoing**

---

## Recommended Execution Sequence

### Phase 1 — Sprint 1 (3-5 days): Security & Stability Blocking Issues
1. **Day 1:** Parameterize all 15 `$queryRawUnsafe` / `$executeRawUnsafe` calls → use `Prisma.sql` tagged templates
2. **Day 2-3:** Add `getUnifiedAuth` + `assertAccess` to 20 unprotected org routes
3. **Day 3-4:** Investigate and fix wiki 500 failures (workspace-isolation + wiki-security tests)
4. **Day 4-5:** Fix NextAuth type augmentation in `next-auth.d.ts`

### Phase 2 — Sprint 2 (1 week): Reliability & Coverage
1. Add `handleApiError` try-catch to 20 org routes missing error handling
2. Add `setWorkspaceContext` to 68 routes missing it (or enable scoping enforcement gradually)
3. Add `assertAccess` to 20 routes that authenticate but don't authorize
4. Fix JSON.parse in Slack webhook and other 7 locations
5. Add `@@index([workspaceId])` to 12 models via migration
6. Fix EntityGraph sort determinism

### Phase 3 — Ongoing (Sprint 3+)
- Wire project epics/timeline/files views
- Complete OrgChart context population
- Fix people filters (Recently Changed requires OrgAuditLog integration)
- Resolve ownership logic duplication (refactor to intelligence layer)
- Update Loopbrain snapshots
- Continue WORKSPACE_SCOPED_MODELS batch additions
- Migrate 138 `orgId` fallback occurrences to `workspaceId`

---

## Metrics Snapshot (Feb 24, 2026)

| Metric | Value |
|--------|-------|
| API routes | 436 |
| TypeScript errors | 77 (4 root causes) |
| Test files | 52 (43 pass, 8 fail, 1 skip) |
| Tests passing | 775/795 (97.5%) |
| getUnifiedAuth coverage | ~326/439 (74%) |
| assertAccess coverage | ~290/439 (66%) |
| setWorkspaceContext coverage | ~368/436 (68%, estimated after today's fixes) |
| handleApiError coverage | 247/436 (57%) |
| WORKSPACE_SCOPED_MODELS | 97 models |
| $queryRawUnsafe instances | 15 |
| Routes without auth | ~20 (org-critical) |
| TODO/FIXME in src/ | 121 |
| Missing workspaceId indexes | 12 models |

---

## Addendum: Additional Findings (Static Analysis Pass)

### CRITICAL: Debug/E2E Routes Exposed Without Auth

**`/api/debug/env/route.ts`** — No auth guard, returns `GOOGLE_CLIENT_ID` in plain text in response body. Must be deleted or gated before production.

**`/api/debug/db/route.ts`** — No auth guard, uses `prismaUnscoped` to query raw DB metadata. Exposes DB structure info.

**`/api/e2e-auth/route.ts`** — Authentication bypass backdoor for E2E testing. Guards on `E2E_TEST_AUTH` env var — if accidentally set in production, any caller can obtain an authenticated session. Recommend removing from production build via environment gating.

### HIGH: assertManagerOrAdmin Implemented but Never Called
`src/lib/auth/assertManagerAccess.ts` is fully implemented but has **zero call sites** in any API route. Routes for performance reviews, 1:1s, and direct-report management fall back to ADMIN-only or no authorization. Manager-scoped access is silently not enforced.

### HIGH: Unbounded findMany Queries (20+ instances)
Routes executing `findMany` with no `take:` limit:
- `assistant/sessions/route.ts:68`, `assistant/history/route.ts:16`
- `role-cards/route.ts:24`, `tasks/route.ts:73`, `my-tasks/route.ts:77`
- `tasks/[id]/comments/route.ts:67`, `tasks/[id]/dependencies/route.ts:65,81,207,228`
- `goals/[goalId]/comments:53`, `check-ins:59`, `recommendations`, `stakeholders`, `approvals`, `analytics`

These will return all records as data grows — potential memory/timeout issues at scale.

### HIGH: loadStructureData — 4 Sequential Awaits (No Promise.all)
`src/lib/org/data.server.ts` `loadStructureData` function fires 4 sequential Prisma awaits:
1. `prisma.orgDepartment.findMany()` (line 490)
2. `prisma.ownerAssignment.findMany()` (line 508) — depends on dept IDs
3. `prisma.orgTeam.findMany()` (line 562)
4. `prisma.orgPosition.findMany()` (line 604)

Steps 3 and 4 could be parallelized with `Promise.all`. Step 2 depends on step 1 result — that pair is correct. The 3→4 sequential gap adds unnecessary latency on every structure page load.

### MEDIUM: Unawaited Prisma Calls (7 locations)
Fire-and-forget Prisma operations — writes that may silently fail:
- `org/data-quality/refresh-availability/route.ts:33` — unawaited upsert (highest risk)
- `org/data-quality/adjust-allocation/route.ts:42` — unawaited update
- `org/capacity/people/[personId]/route.ts:58,69` — unawaited count queries
- `org/capacity/people/route.ts:100,113` — unawaited groupBy queries
- `org/management/link/route.ts:21,25` — optional-chained unawaited calls

### MEDIUM: Zod safeParse Adoption Only 7.8%
Of ~102 routes using Zod, only 8 use `safeParse` (safe, returns `{ success, error }`). The remaining ~94 use throwing `.parse()`. If these are inside `handleApiError` try-catch blocks they are safe — but given 43% of routes lack handleApiError, many Zod validation failures will bubble as raw 500s instead of clean 400s.

### LOW: Slug Fields Without Database Unique Constraint
`prisma/schema.prisma:410` and `:523` — two slug fields are application-unique but lack `@unique` or `@@unique([workspaceId, slug])` DB constraints. Race conditions under concurrent writes could create duplicate slugs.
