# Loopwell Codebase Audit — Current State
**Generated:** 2026-02-24
**Branch:** integration/merge-stabilized

---

## 1. WORKSPACE_SCOPED_MODELS Audit

**Current models in `WORKSPACE_SCOPED_MODELS` (scopingMiddleware.ts): 79**

<details>
<summary>Full list (79 models)</summary>

Project, Task, Epic, Milestone, WikiPage, WikiChunk, ChatSession, FeatureFlag, Integration, Migration, Workflow, WorkflowInstance, OnboardingTemplate, OnboardingPlan, OrgPosition, ProjectTemplate, TaskTemplate, Activity, ContextItem, ContextEmbedding, ContextSummary, Goal, GoalTemplate, PerformanceReview, PerformanceCycle, ReviewQuestion, ReviewResponse, OneOnOneTemplate, OneOnOneMeeting, OneOnOneSeries, OneOnOneTalkingPoint, OneOnOneActionItem, GoalWorkflowRule, Subtask, TaskComment, TaskHistory, CustomFieldVal, ProjectMember, ProjectWatcher, ProjectAssignee, ProjectPersonLink, ProjectDocumentation, ProjectAccountability, ProjectDailySummary, CustomFieldDef, WikiVersion, WikiComment, WikiEmbed, WikiAttachment, WikiPagePermission, WikiFavorite, wiki_ai_interactions, wiki_page_views, Objective, GoalComment, GoalUpdate, ProjectGoalLink, GoalStakeholder, GoalApproval, GoalProgressUpdate, GoalAnalytics, GoalRecommendation, GoalCheckIn, KeyResult, KeyResultUpdate, ChatMessage, OnboardingTask, onboarding_task_assignments, TaskTemplateItem, WorkflowAssignment, RoleCardSkill, RoleCard, Skill, PersonSkill, DecisionAuthority, DecisionEscalationStep, ProjectAllocation, Space, SpaceMember

</details>

### Still Missing (all 43 from Feb 24 remain unresolved)

**CRITICAL — Missing (10/10 still open):**
- ❌ OrgDepartment
- ❌ OrgTeam
- ❌ OrgCustomRole
- ❌ OrgInvitation
- ❌ Todo
- ❌ LeaveRequest
- ❌ PersonAvailability
- ❌ PersonManagerLink
- ❌ DecisionDomain
- ❌ CapacityContract

**HIGH — Missing (8/8 still open):**
- ❌ OrgIntelligenceSnapshot
- ❌ OrgIntelligenceSettings
- ❌ OrgAuditLog
- ❌ OrgCapacitySettings
- ❌ LoopbrainPendingAction
- ❌ LoopbrainUserProfile
- ❌ ProactiveInsight
- ❌ ProjectSpace

**MEDIUM — Missing (11/11 still open):**
- ❌ OrgLoopbrainQuery
- ❌ OrgLoopbrainQueryLog
- ❌ OrgQnaLog
- ❌ OrgActivityExport
- ❌ PersonActivityMetric
- ❌ PersonAvailabilityHealth
- ❌ PersonRelationship
- ❌ PersonResponsibilityOverride
- ❌ OwnerAssignment
- ❌ TeamCapacityPlan
- ❌ OnboardingProgress

**LOW — Missing (14/14 still open):**
- ❌ OrgSavedView
- ❌ OrgUiPreference
- ❌ OrgIssueResolution
- ❌ ResponsibilityTag
- ❌ RoleCoverage
- ❌ RoleResponsibilityProfile
- ❌ WorkAllocation
- ❌ WorkEffortDefaults
- ❌ WorkImpact
- ❌ WorkRecommendationLog
- ❌ WorkRequest
- ❌ LoopbrainOpenLoop
- ❌ LoopbrainChatFeedback
- ❌ OrgPersonProfileOverride

**✅ Fixed since Feb 24:** None (all 43 remain unaddressed)

> **Note:** Before adding to `WORKSPACE_SCOPED_MODELS`, verify each model has a direct `workspaceId` column in the database schema. Some models (e.g., OwnerAssignment) use `workspace_id` (snake_case) as the legacy column name — confirm correct casing.

---

## 2. SQL Injection Risk Audit

**Total `$queryRawUnsafe`/`$executeRawUnsafe` calls: 13**

| File | Line(s) | Pattern | Status |
|------|---------|---------|--------|
| src/lib/simple-auth.ts | 254 | `$queryRawUnsafe(sql, $1, $2, $3, $4)` | ✅ SAFE — parameterized |
| src/lib/simple-auth.ts | 362 | `$queryRawUnsafe(sql, $1, $2, $3, $4, $5)` | ✅ SAFE — parameterized |
| src/lib/simple-auth.ts | 427 | `$executeRawUnsafe(sql, $1, $2, $3)` | ✅ SAFE — parameterized |
| src/server/org/people/write.ts | 80 | `$queryRawUnsafe(sql, $1, $2, $3)` | ✅ SAFE — parameterized |
| src/server/org/people/write.ts | 142 | `$queryRawUnsafe(sql, $1, $2, $3, $4, $5, $6)` | ✅ SAFE — parameterized |
| src/server/org/structure/write.ts | 66 | `$executeRawUnsafe(sql, $1...$5)` | ✅ SAFE — parameterized |
| src/server/org/structure/read.ts | 94 | `$queryRawUnsafe(sql, $1, $2)` | ✅ SAFE — parameterized |
| src/lib/org/data.server.ts | 533 | `$queryRawUnsafe(query, $1, $2, ...$ids)` | ✅ SAFE — parameterized (dynamic IN clause with positional params) |
| src/app/api/migrations/blog/route.ts | 47, 61, 74, 102 | `$executeRawUnsafe(staticSql)` | ✅ SAFE — static DDL strings, no user input |
| src/app/api/org/structure/departments/[departmentId]/owner/route.ts | 134, 150, 170 | `$executeRawUnsafe(sql, $1...$5)` | ✅ SAFE — parameterized |

**Using string interpolation (HIGH RISK): 0**
**Using safe patterns: 13/13**

### ✅ P0 SQL Injection Issues: FIXED

Both P0 sites from the Feb 24 audit (`simple-auth.ts:260,376,441` and `people/write.ts:82,149`) now use proper parameterized queries.

### ⚠️ Residual Risk: Docker Exec Fallback (simple-auth.ts ~lines 98–128)

The Prisma error fallback in `getAuthUser()` builds raw shell commands using primitive SQL escaping:
```typescript
const escapedEmail = session.user.email.replace(/'/g, "''")
const userQuery = `SELECT ... WHERE email = '${escapedEmail}';`
execSync(`docker compose exec -T postgres psql ... -c ${JSON.stringify(userQuery)}`)
```
This path is development-only and only runs if Prisma fails, but the escaping is incomplete (does not handle backslash injection or other vectors). Risk is **LOW** (dev-only fallback, not a Prisma raw query).

### ⚠️ Unauthenticated Migration Endpoint (blog/route.ts)

`POST /api/migrations/blog` has **no authentication check**. The auth check is commented out with a note "In production, you may want to add authentication/authorization." Anyone can invoke DDL operations against the blog database. Risk: **MEDIUM** (limited to blog schema, not main app data).

---

## 3. Auth Coverage Metrics

**Total API routes: 436** (was 439 in Feb 24 — 3 routes removed/merged)

| Metric | Count | % Coverage | Feb 24 Baseline | Delta |
|--------|-------|-----------|----------------|-------|
| `getUnifiedAuth` | 324 | **74.3%** | 326/439 (74%) | ~0 |
| `assertAccess` | 289 | **66.3%** | 290/439 (66%) | ~0 |
| `setWorkspaceContext` | 294 | **67.4%** | 296/439 (67%) | ~0 |
| `handleApiError` | 247 | **56.7%** | 246/439 (56%) | +1 |
| Zod validation | 102 | **23.4%** | 102/439 (23%) | ~0 |

> Auth coverage has held steady. No regression and no meaningful improvement since Feb 24.

### Auth Gap Analysis

- **~112 routes** lack `getUnifiedAuth` — these handle requests without verifying identity
- **~147 routes** lack `assertAccess` — these bypass RBAC role checks
- **~142 routes** lack `setWorkspaceContext` — these may leak cross-workspace data in production

### `orgId` Fallback Pattern
- **69 files** still reference `orgId` (down from 138 in CLAUDE.md Feb 24 estimate)
- Hybrid scoping risk: `ProjectAllocation` still uses `orgId` instead of clean `workspaceId`

---

## 4. P1 Feature Completeness Check

### Epic / Timeline / Files Views (`projects/[id]/page.tsx`)

**✅ ALL THREE VIEWS ARE NOW WIRED**

| View | Status | Location |
|------|--------|----------|
| Epics | ✅ FIXED | Line 758: `{headerView === 'epics' ? (<EpicsView .../>` |
| Timeline | ✅ FIXED | Line 830: `{headerView === 'timeline' && (<TimelineView .../>` |
| Files | ✅ FIXED | Line 837: `{headerView === 'files' && (<ProjectDocumentationSection .../>` |

The P1 issue is resolved. All three views are dynamically imported and conditionally rendered based on `headerView` state.

---

### OrgChart Department Context (`OrgChartClient.tsx:74–79`)

**❌ STILL OPEN — 4 TODO stubs remain:**

```typescript
reportsToName: undefined, // TODO: Populate from department hierarchy when available
isHiring: false,          // TODO: Determine from recent job postings or positions
recentChangeSummary: undefined, // TODO: Calculate from recent changes
isReorg: false,           // TODO: Determine from recent structural changes
```

These fields render as empty/false in the OrgChart department cards. No actual data flows into these slots.

---

### People Page Filters (`PeoplePageClient.tsx`)

| Filter | Status | Notes |
|--------|--------|-------|
| Leaders | ✅ WIRED | Uses `managerId` set — any person who is someone else's manager |
| Unassigned | ✅ WIRED | Filters `!teamId && !departmentId` |
| New | ✅ WIRED | Filters `joinedAt` within last 30 days |
| Recently Changed | ❌ STILL OPEN | TODO comment: `// TODO: T2.5 — requires OrgAuditLog change history tracking` |
| leadersOnly (flag) | ✅ WIRED | Role string matching (lead/manager/director/head/chief) |

---

### Bulk Assignment (`PeoplePageClient.tsx:~961`)

**✅ WIRED** — Calls `POST /api/org/ownership/bulk-assign` with `entityType`, `ownerPersonId`, and `entityIds[]`. Error handling shows an `alert()` on failure (not production-quality UX but functionally wired).

---

## 5. Priority Summary

### CURRENT P0 ISSUES (Security / Data Integrity)

| # | Issue | Status |
|---|-------|--------|
| 1 | **43 models missing from WORKSPACE_SCOPED_MODELS** — OrgDepartment, OrgTeam, Todo, LeaveRequest, OrgInvitation, PersonManagerLink, DecisionDomain, CapacityContract, and 35 more | ❌ STILL OPEN — unchanged since Feb 24 |
| 2 | **SQL injection via `$queryRawUnsafe` string interpolation** — simple-auth.ts, people/write.ts | ✅ FIXED — all calls now use parameterized queries |
| 3 | **Unauthenticated migration endpoint** — `POST /api/migrations/blog` | ❌ NEW — no auth check, DDL operations exposed publicly |

---

### CURRENT P1 ISSUES (Feature Completion)

| # | Issue | Status |
|---|-------|--------|
| 1 | Epic/Timeline/Files views not wired in project detail page | ✅ FIXED |
| 2 | OrgChart department context gaps (hiring, reorg, reports-to, recent changes) | ❌ STILL OPEN |
| 3 | People "recentlyChanged" filter unimplemented | ❌ STILL OPEN (blocked on OrgAuditLog) |
| 4 | Bulk assignment UX (alert on failure instead of toast) | ⚠️ PARTIAL — functionally wired, UX is rough |
| 5 | `orgId` fallback in ~69 API route files | ⚠️ PARTIAL — down from 138, still needs migration |

---

### RECOMMENDED NEXT ACTIONS (Prioritized by Risk / Impact)

#### 🔴 Immediate (P0)

1. **Add auth to `POST /api/migrations/blog`**
   Uncomment the Bearer token check or add `getUnifiedAuth` + `assertAccess(['OWNER'])`. One-line fix, zero risk.

2. **Add 10 CRITICAL models to `WORKSPACE_SCOPED_MODELS`**
   Start with: `OrgDepartment`, `OrgTeam`, `Todo`, `OrgInvitation`, `LeaveRequest`, `PersonAvailability`, `PersonManagerLink`, `DecisionDomain`, `CapacityContract`, `OrgCustomRole`.
   Run `npm run typecheck && npm run test` after each batch. Verify each model has `workspaceId` in schema before adding.

#### 🟠 Next Sprint (P1)

3. **Add 8 HIGH models to `WORKSPACE_SCOPED_MODELS`**
   `OrgIntelligenceSnapshot`, `OrgIntelligenceSettings`, `OrgAuditLog`, `OrgCapacitySettings`, `LoopbrainPendingAction`, `LoopbrainUserProfile`, `ProactiveInsight`, `ProjectSpace`

4. **Wire OrgChart department context**
   Populate `reportsToName` from `OrgDepartment.parentId` hierarchy, `isHiring` from open `OrgPosition` slots, `recentChangeSummary` from `OrgAuditLog` when available.

5. **Implement `recentlyChanged` people filter**
   Requires `OrgAuditLog` to be populated on org mutations. Add write to audit log in org person update endpoints, then query in `PeoplePageClient`.

#### 🟡 Backlog (P2)

6. **Migrate remaining 69 `orgId` files to `workspaceId`**
   Systematic find-and-replace with test coverage for each affected route.

7. **Boost auth coverage from 74% → 90%+**
   Audit the ~112 routes missing `getUnifiedAuth` — many are likely intentionally public (onboarding, auth callbacks), but others may be gaps.

8. **Add MEDIUM/LOW models to `WORKSPACE_SCOPED_MODELS`** (25 remaining after CRITICAL+HIGH)

9. **Replace `alert()` in bulk assign error path** with a toast/snackbar notification.

10. **Remove Docker exec fallback in `simple-auth.ts`** — this is dead code in production and introduces an incomplete SQL escaping path. The Prisma path now handles all cases.

---

## Appendix: File Locations

| File | Purpose |
|------|---------|
| `src/lib/prisma/scopingMiddleware.ts` | WORKSPACE_SCOPED_MODELS array |
| `src/lib/simple-auth.ts` | Auth fallback (contains Docker exec SQL path) |
| `src/server/org/people/write.ts` | Org people write operations |
| `src/app/(dashboard)/w/[workspaceSlug]/projects/[id]/page.tsx` | Project detail (epics/timeline/files now wired) |
| `src/app/org/chart/OrgChartClient.tsx` | OrgChart (department context TODOs at lines 74–79) |
| `src/app/org/people/PeoplePageClient.tsx` | People page (recentlyChanged filter TODO at line 386) |
| `src/app/api/migrations/blog/route.ts` | Unauthenticated migration endpoint |
