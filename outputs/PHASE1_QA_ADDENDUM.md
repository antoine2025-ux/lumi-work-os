# Phase 1 QA Addendum

**Date:** February 2026
**Scope:** Phase 1 Hardening — RBAC enforcement, error handling migration, dead code cleanup, E2E test coverage

This document describes what changed in Phase 1 that affects the QA plan.

---

## 1. Resolved Risk Areas

| # | Risk Area | Status | Resolution |
|---|-----------|--------|------------|
| R1 | **POST `/api/tasks/[id]/dependencies` — no access check** | **FIXED** | Added `assertAccess` (MEMBER) + `assertProjectAccess` after task lookup. Any authenticated user could previously modify any task's dependencies. |
| R2 | **POST `/api/ai/chat-sessions` — info leak** | **FIXED** | Catch blocks exposed `error.message` and `error.stack` to clients. Replaced with `handleApiError()`. Added `assertAccess` (MEMBER) and `setWorkspaceContext`. |
| R3 | **11 org routes required MEMBER instead of ADMIN** | **FIXED** | Upgraded `requireRole: ['MEMBER']` to `['ADMIN']` for all org structure management operations (see Section 3). |
| R4 | **9 routes had auth but no role check** | **FIXED** | Added `assertAccess` with appropriate role levels to AI chat, task comments, custom fields, dependencies, and assignment routes (see Section 3). |
| R5 | **128 routes used manual try/catch instead of `handleApiError`** | **FIXED** | Migrated all 128 routes to centralized `handleApiError()`. Coverage: 12% → 42%. |
| R6 | **Debug `console.log` in production routes** | **FIXED** | Removed ~26 debug/sensitive log statements from `projects/route.ts`, `wiki/pages/route.ts`, `admin/invite/route.ts`, `projects/[projectId]/route.ts`. |
| R7 | **Unguarded dev route (`/api/dev/org-qa`)** | **FIXED** | Added `NODE_ENV === 'production'` guard — returns 404 in production. |
| R8 | **Dead deprecated endpoint (`/api/workspaces/[workspaceId]/user-role`)** | **FIXED** | Deleted the route file entirely. Zero consumers. |

### Remaining Known Risks (not addressed in Phase 1)

| # | Risk Area | Status | Notes |
|---|-----------|--------|-------|
| R9 | 47 routes with `getUnifiedAuth` but no `assertAccess` | Open | Most use project-level guards (`assertProjectAccess`) or are read-own-data endpoints. Requires per-route audit. |
| R10 | Legacy `getOrgContext()` pattern in 2 routes | Open | `org/members/route.ts`, `org/people/archived/restore/route.ts` — should migrate to `assertAccess` eventually. |
| R11 | Pre-existing TypeScript errors (915) | Open | Concentrated in `read.ts`, `index.ts`, seed files. Not introduced by Phase 1. |
| R12 | Pre-existing lint errors (2013) | Open | Widespread across codebase. Not introduced by Phase 1. |

---

## 2. Updated Metrics — Before vs After

| Metric | Before Phase 1 | After Phase 1 | Delta |
|--------|---------------|---------------|-------|
| **Zod validation** | 47/427 routes (11%) | 85/427 routes (20%) | +38 routes (+81%) |
| **Auth (`getUnifiedAuth`)** | 244/427 routes (57%) | 260/427 routes (61%) | +16 routes |
| **RBAC (`assertAccess`)** | 198/427 routes (46%) | 222/427 routes (52%) | +24 routes |
| **Error handling (`handleApiError`)** | 51/427 routes (12%) | 179/427 routes (42%) | +128 routes (+251%) |
| **Workspace scoping (`setWorkspaceContext`)** | 210/427 routes (49%) | 228/427 routes (53%) | +18 routes |
| **Test files** | 37 | 56 | +19 files (+51%) |
| **Prisma models** | 150 | 150 | No change |
| **Models with `workspaceId`** | 111/150 | 111/150 | No change |

---

## 3. RBAC Changes — New Permission Matrix

### 3a. Role Upgrades: MEMBER → ADMIN (11 routes)

These routes previously allowed any MEMBER to perform org structure management. They now require ADMIN:

| # | Route File | Operation |
|---|-----------|-----------|
| 1 | `src/app/api/org/people/[personId]/archive/route.ts` | Archive a person |
| 2 | `src/app/api/org/people/[personId]/unarchive/route.ts` | Unarchive a person |
| 3 | `src/app/api/org/structure/teams/create/route.ts` | Create a team |
| 4 | `src/app/api/org/structure/departments/create/route.ts` | Create a department |
| 5 | `src/app/api/org/people/create/route.ts` | Create a person |
| 6 | `src/app/api/org/people/[personId]/manager/route.ts` | Reassign manager |
| 7 | `src/app/api/org/people/[personId]/team/route.ts` | Reassign team |
| 8 | `src/app/api/org/people/[personId]/update/route.ts` | Update person details |
| 9 | `src/app/api/org/people/[personId]/name/route.ts` | Change person name |
| 10 | `src/app/api/org/people/[personId]/title/route.ts` | Change person title |
| 11 | `src/app/api/org/people/[personId]/availability/route.ts` | Update availability |

**QA Impact:** MEMBER-role users who previously could perform these actions will now receive 403 Forbidden. Verify that:
- UI surfaces (org people pages, team management) gracefully handle 403 for MEMBER users
- ADMIN and OWNER users can still perform all actions
- Error messages are user-friendly (not raw JSON)

### 3b. Added Missing `assertAccess` (9 routes)

These routes had authentication but no workspace-level role check:

| # | Route File | Methods | Role Added |
|---|-----------|---------|-----------|
| 1 | `src/app/api/ai/chat/route.ts` | POST | MEMBER |
| 2 | `src/app/api/ai/chat/stream/route.ts` | POST | MEMBER |
| 3 | `src/app/api/ai/chat-sessions/route.ts` | GET, POST | MEMBER |
| 4 | `src/app/api/tasks/[id]/comments/route.ts` | GET: VIEWER, POST: MEMBER | VIEWER/MEMBER |
| 5 | `src/app/api/tasks/[id]/custom-fields/route.ts` | POST | MEMBER |
| 6 | `src/app/api/tasks/[id]/dependencies/route.ts` | GET: VIEWER, POST: MEMBER | VIEWER/MEMBER |
| 7 | `src/app/api/tasks/[id]/assignments/epic/route.ts` | PATCH | MEMBER |
| 8 | `src/app/api/tasks/[id]/assignments/milestone/route.ts` | PATCH | MEMBER |
| 9 | `src/app/api/tasks/[id]/assignments/points/route.ts` | PATCH | MEMBER |

**QA Impact:** These routes now enforce workspace-level role checks in addition to any project-level checks. VIEWER-role users will get 403 on write operations. Read operations (GET) allow VIEWER access.

### 3c. New Infrastructure: Manager-Scoped Access

**File:** `src/lib/auth/assertManagerAccess.ts`

Exports `assertManagerOrAdmin(userId, targetPersonId, workspaceId)`:
- If user is ADMIN+ → pass
- Else checks `OrgPosition.parentId` for manager relationship
- Throws `Error('Forbidden: ...')` on failure → `handleApiError` maps to 403

Not yet wired into any routes — infrastructure for Phase 2 (performance reviews, org intelligence manager views).

---

## 4. New Features to Test

### Onboarding Wizard (5 Steps)

| Step | URL | Purpose | API Endpoint |
|------|-----|---------|-------------|
| 1 | `/onboarding/1` | Workspace creation | `POST /api/onboarding/workspace` |
| 2 | `/onboarding/2` | Invite team members | `POST /api/onboarding/invites` |
| 3 | `/onboarding/3` | Org structure setup | `POST /api/onboarding/structure` |
| 4 | `/onboarding/4` | First wiki space | `POST /api/onboarding/space` |
| 5 | `/onboarding/5` | Ready / launch | `POST /api/onboarding/complete` |

**Key behaviors to verify:**
- `/welcome` redirects to `/onboarding/1`
- Middleware redirects first-time users (no workspace) to `/onboarding/1`
- Invalid step numbers (e.g., `/onboarding/99`) redirect to current valid step
- Completed onboarding redirects to `/home`
- Progress API (`GET /api/onboarding/progress`) returns `{ currentStep, isComplete, completedSteps[] }`
- JWT carries `isFirstTime` flag — no extra DB query per request
- Steps cannot be skipped (step 3 inaccessible until step 2 completed)

**Schemas:** `src/lib/validations/onboarding.ts`

### Goals & OKRs

| Feature | API Endpoint | Method |
|---------|-------------|--------|
| List goals | `GET /api/goals` | GET |
| Create goal | `POST /api/goals` | POST |
| Goal detail | `GET /api/goals/[goalId]` | GET |
| Update goal | `PUT /api/goals/[goalId]` | PUT |
| Delete goal | `DELETE /api/goals/[goalId]` | DELETE |
| Progress update | `POST /api/goals/[goalId]/progress` | POST |
| At-risk goals | `GET /api/goals/at-risk` | GET |
| Parent-child cascading | `parentGoalId` field on create | POST |
| Goal correlations | `GET /api/goals/correlations` | GET |
| Link to project | `POST /api/goals/[goalId]/link-project` | POST |

**UI pages:**
- `/w/[workspaceSlug]/goals` — Goals dashboard
- `/w/[workspaceSlug]/goals/[goalId]` — Goal detail
- `/w/[workspaceSlug]/goals/workflows` — Goal workflows

---

## 5. Updated Codebase Reference

### New Stable Seams (added in Phase 1)

| File | Purpose | Consumer Count |
|------|---------|---------------|
| `src/lib/auth/assertAccess.ts` | RBAC enforcement (VIEWER < MEMBER < ADMIN < OWNER) | 222 routes |
| `src/lib/api-errors.ts` | Centralized error handling (`handleApiError`) | 179 routes |
| `src/lib/validations/` | Zod schema library (common, org, wiki, tasks, onboarding) | 85 routes |
| `src/lib/auth/assertManagerAccess.ts` | Manager-scoped access helper | 0 routes (infrastructure) |

### New File Paths

| Path | Purpose |
|------|---------|
| `src/lib/auth/assertManagerAccess.ts` | `assertManagerOrAdmin()` — checks ADMIN role or OrgPosition.parentId |
| `src/lib/validations/common.ts` | Shared Zod schemas (pagination, IDs, etc.) |
| `src/lib/validations/org.ts` | Org schemas (PersonCreateSchema, etc.) |
| `src/lib/validations/wiki.ts` | Wiki page schemas |
| `src/lib/validations/tasks.ts` | Task schemas (TaskDependencySchema, etc.) |
| `src/lib/validations/onboarding.ts` | Onboarding wizard schemas (CompanySize, etc.) |
| `src/app/onboarding/[step]/page.tsx` | Onboarding wizard step page (client component) |
| `src/app/onboarding/layout.tsx` | Onboarding layout (minimal chrome) |
| `tests/e2e/helpers/page-ready.ts` | E2E helpers: `skipIfNoAuth()`, `gotoAuthenticated()`, `isAuthenticated()` |

### Role Hierarchy Reference

```
VIEWER (1) < MEMBER (2) < ADMIN (3) < OWNER (4)
```

`requireRole: ['MEMBER']` means **minimum** MEMBER level — ADMIN and OWNER also pass.

---

## 6. Automated Test Coverage

### API Integration Tests (Vitest — 6 new files)

| # | File | Tests | What It Covers |
|---|------|-------|---------------|
| 1 | `tests/api/auth-patterns.spec.ts` | 12 | Verifies `getUnifiedAuth` + `assertAccess` pattern consistency across routes |
| 2 | `tests/api/zod-validation.spec.ts` | 11 | Validates Zod schema enforcement at API boundaries |
| 3 | `tests/api/wiki-security.spec.ts` | 10 | Wiki personal page isolation, cross-user access prevention |
| 4 | `tests/api/goals-crud.spec.ts` | 12 | Goals CRUD operations, parent-child cascading, progress tracking |
| 5 | `tests/api/workspace-isolation.spec.ts` | 13 | Workspace scoping middleware, cross-workspace data leakage prevention |
| 6 | `tests/api/phase1-migrated-routes.spec.ts` | 12 | Verifies handleApiError migration didn't break response contracts |

### E2E Tests (Playwright — 5 new files)

| # | File | Tests | What It Covers |
|---|------|-------|---------------|
| 7 | `tests/e2e/critical-flows.spec.ts` | 9 | Smoke tests: create project + tasks, create wiki page, create todo, Loopbrain Q&A |
| 8 | `tests/e2e/onboarding-flow.spec.ts` | 5 | 5-step wizard flow, `/welcome` redirect, progress API, invalid step handling |
| 9 | `tests/e2e/workspace-isolation.spec.ts` | 10 | API workspace scoping, cross-workspace 404s, consistent workspace context |
| 10 | `tests/e2e/role-enforcement.spec.ts` | 11 | RBAC API verification (ADMIN-only routes, unauthenticated rejection, auth redirects) |
| 11 | `tests/e2e/goals-workflow.spec.ts` | 9 | Goals dashboard, CRUD API, cascading goals, progress updates, at-risk endpoint |

**Total new automated tests:** 114 (70 API + 44 E2E)

### E2E Auth Requirement

E2E tests require an authenticated session to run fully. Without auth, authenticated tests skip gracefully (0 failures). To enable:

**Option A — Local (manual OAuth):**
```bash
npm run dev
npx playwright codegen --save-storage=.auth/user.json http://localhost:3000/login
# Complete Google OAuth in browser, close when done
E2E_REUSE_SERVER=true npm run test:e2e
```

**Option B — CI (E2E auth endpoint):**
```bash
# Add to .env.local:
E2E_TEST_AUTH=true
E2E_TEST_PASSWORD=your-secret-password
# Restart dev server, then:
npm run test:e2e
```

### Pre-existing Test Failures (not introduced by Phase 1)

| Category | Count | Notes |
|----------|-------|-------|
| Vitest unit tests | 14 failing | Snapshot drift (9), duplication tripwire (1), other pre-existing (4) |
| E2E tests (old files) | 27 failing | All auth-related — pre-existing tests lack `skipIfNoAuth` guards |
| TypeScript errors | 915 | Concentrated in `read.ts`, `index.ts`, seed files |
| Lint errors | 2013 | Widespread pre-existing |

---

## Summary for QA

**What changed:**
- 128 routes now use centralized error handling (consistent error shapes)
- 11 org management routes now require ADMIN instead of MEMBER
- 9 task/AI routes now enforce workspace-level RBAC
- 1 security gap fixed (task dependencies POST had no access check)
- 1 info leak fixed (chat-sessions exposed error internals)
- Debug logging removed from production routes
- Dead/deprecated code removed

**What QA should focus on:**
1. **MEMBER-role regression:** Verify MEMBER users see appropriate UI feedback (not raw 403) when attempting org management actions
2. **Task dependency access:** Verify task dependency modifications require proper project membership
3. **AI chat access:** Verify AI chat/stream endpoints work for MEMBER+ users
4. **Error response consistency:** Verify all error responses follow the `{ error: string }` shape from `handleApiError`
5. **Onboarding wizard:** Full flow testing (steps 1–5, skip prevention, completion redirect)
6. **Goals CRUD:** Create, read, update, delete goals; parent-child cascading; progress tracking
