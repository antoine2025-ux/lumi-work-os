# Org MVP Runtime Audit

**Date:** 2025-01-27  
**Scope:** End-to-end Org MVP flow validation  
**Goal:** Determine if a new workspace can complete Org onboarding without hitting dead ends

---

## Executive Verdict

**Status: ALMOST — Fix Pack X Required**

Org MVP is **nearly usable** but has **3 P0 blockers** that prevent end-to-end onboarding. The core read/write flows work, but setup state inconsistencies and intelligence coupling create user confusion and partial failures.

**Can a new workspace complete Org onboarding end-to-end?**  
**Answer: NO** — Users will encounter:
1. Setup state inconsistencies between `/org` and `/org/setup`
2. Intelligence failures blocking Overview page rendering
3. Missing error boundaries causing partial page failures

---

## Flow-by-Flow Analysis

### Flow A — Fresh Workspace Onboarding

| Step | Route | Status | Error | Root Cause | MVP Blocker |
|------|-------|--------|-------|------------|-------------|
| 1. Visit `/org` | `/org` | ⚠️ **PARTIAL** | Intelligence section fails | Intelligence API returns 500/403 | **YES** |
| 2. Click "Add person" | `/org/people/new` | ✅ **PASS** | None | - | No |
| 3. Create person | `POST /api/org/people/create` | ✅ **PASS** | None | - | No |
| 4. Return to `/org` | `/org` | ⚠️ **PARTIAL** | Intelligence section fails | Intelligence API returns 500/403 | **YES** |
| 5. Click "Define structure" | `/org/structure` | ⚠️ **BLOCKED** | 404 Not Found | Gated behind `NEXT_PUBLIC_ORG_DEV_PAGES` | **YES** |
| 6. Create department/team | `POST /api/org/structure/*/create` | ❌ **BLOCKED** | Cannot reach page | Structure page is dev-only | **YES** |
| 7. Assign owner | `POST /api/org/ownership/assign` | ✅ **PASS** | None | - | No |
| 8. Return to `/org` | `/org` | ⚠️ **PARTIAL** | Intelligence section fails | Intelligence API returns 500/403 | **YES** |
| 9. Setup moves to "Ready" | `/org/setup` | ⚠️ **INCONSISTENT** | Counts differ from `/org` | Different data sources | **YES** |

**Flow A Result: FAIL** — Cannot complete due to structure page gating and intelligence coupling.

---

### Flow B — Core Navigation Health

| Page | Loads | Error | Root Cause | MVP Blocker |
|------|-------|-------|------------|-------------|
| `/org` | ✅ Yes | ⚠️ Intelligence section fails | `OrgIntelligenceOverview` calls `/api/org/intelligence/snapshots/latest` which returns 500/403 | **YES** |
| `/org/people` | ✅ Yes | None | - | No |
| `/org/people/new` | ✅ Yes | None | - | No |
| `/org/structure` | ❌ **404** | Page not found | Gated behind `NEXT_PUBLIC_ORG_DEV_PAGES !== "1"` | **YES** |
| `/org/ownership` | ✅ Yes | None | - | No |
| `/org/setup` | ✅ Yes | ⚠️ Counts inconsistent | Uses different data source than `/org` overview | **YES** |

**Flow B Result: PARTIAL FAIL** — Structure page is inaccessible, Overview has intelligence failures.

---

### Flow C — Read-only Loopbrain Readiness

| Component | Status | Error | Root Cause | MVP Blocker |
|-----------|--------|-------|------------|-------------|
| Overview counts | ✅ **PASS** | None | `/api/org/overview` works correctly | No |
| Ownership coverage | ✅ **PASS** | None | `/api/org/ownership` works correctly | No |
| Reporting structure | ✅ **PASS** | None | People API includes manager relationships | No |
| Intelligence snapshot | ❌ **FAIL** | 500/403 errors | Intelligence endpoints require snapshots | No (optional) |

**Flow C Result: PASS** — Core read-only data works. Intelligence is optional and correctly isolated.

---

## API Dependency Mapping

### `/org` (Overview Page)

| Endpoint | Required for MVP | Status | Failure Impact |
|----------|------------------|--------|----------------|
| `GET /api/org/overview` | ✅ **YES** | ✅ Works | Page shows error banner |
| `GET /api/org/intelligence/snapshots/latest` | ❌ **NO** | ❌ Fails (500/403) | **BLOCKS RENDERING** |
| `GET /api/org/intelligence/recommendations/latest` | ❌ **NO** | ❌ Fails (500/403) | **BLOCKS RENDERING** |

**Violation:** Intelligence endpoints are **optional** but cause **blocking errors** in `OrgIntelligenceOverview` component.

**Fix Required:** Make intelligence section fail gracefully (show empty state, not error banner).

---

### `/org/people`

| Endpoint | Required for MVP | Status | Failure Impact |
|----------|------------------|--------|----------------|
| `GET /api/org/flags` | ✅ **YES** | ✅ Works | Write actions disabled |
| `GET /api/org/people` | ✅ **YES** | ✅ Works | Page shows error |
| `GET /api/org/structure` | ⚠️ **OPTIONAL** | ✅ Works | Form dropdowns empty |

**Status:** ✅ **PASS** — All MVP endpoints work. Structure is optional for form dropdowns.

---

### `/org/structure`

| Endpoint | Required for MVP | Status | Failure Impact |
|----------|------------------|--------|----------------|
| `GET /api/org/flags` | ✅ **YES** | ✅ Works | Write actions disabled |
| `GET /api/org/structure` | ✅ **YES** | ✅ Works | Page shows error |
| `GET /api/org/people` | ⚠️ **OPTIONAL** | ✅ Works | Owner dropdowns empty |

**Status:** ❌ **BLOCKED** — Page is gated behind `NEXT_PUBLIC_ORG_DEV_PAGES` env var.

**Fix Required:** Remove dev-only gating or provide alternative structure management UI.

---

### `/org/ownership`

| Endpoint | Required for MVP | Status | Failure Impact |
|----------|------------------|--------|----------------|
| `GET /api/org/flags` | ✅ **YES** | ✅ Works | Write actions disabled |
| `GET /api/org/ownership` | ✅ **YES** | ✅ Works | Page shows error |
| `GET /api/org/people` | ⚠️ **OPTIONAL** | ✅ Works | Owner dropdowns empty |

**Status:** ✅ **PASS** — All MVP endpoints work.

---

### `/org/setup`

| Endpoint | Required for MVP | Status | Failure Impact |
|----------|------------------|--------|----------------|
| `GET /api/org/setup-status` | ✅ **YES** | ✅ Works | Page shows error |
| Server-side: `getOrgSetupStatus()` | ✅ **YES** | ✅ Works | Page shows error |

**Status:** ✅ **PASS** — Endpoint works, but counts differ from `/org/overview`.

**Issue:** Setup page uses `getOrgSetupStatus()` which counts differently than `/api/org/overview`, causing inconsistency.

---

## Setup State Consistency

### Data Sources

| Page | Data Source | Count Logic |
|------|-------------|-------------|
| `/org` | `GET /api/org/overview` | `prisma.orgPosition.count({ userId: { not: null }, isActive: true })` |
| `/org/setup` | `getOrgSetupStatus()` | `prisma.orgPosition.count({ userId: { not: null } })` (no `isActive` filter) |

**Inconsistency:** `/org/setup` does not filter by `isActive: true`, causing counts to differ.

**Impact:** Users see "0 people" on `/org` but "1 person" on `/org/setup` if a person was deactivated.

**Fix Required:** Align count logic between `/api/org/overview` and `getOrgSetupStatus()`.

---

### Setup Checklist Items

| Item | Source | Status |
|------|--------|--------|
| `people_added` | `/api/org/overview` → `readiness.people_added` | ✅ Consistent |
| `structure_defined` | `/api/org/overview` → `readiness.structure_defined` | ✅ Consistent |
| `ownership_assigned` | `/api/org/overview` → `readiness.ownership_assigned` | ✅ Consistent |

**Status:** ✅ **PASS** — Checklist items are consistent (both use `/api/org/overview`).

---

## Intelligence Isolation Check

### Intelligence Endpoints

| Endpoint | Called By | Blocks MVP? | Status |
|----------|-----------|-------------|--------|
| `GET /api/org/intelligence/snapshots/latest` | `OrgIntelligenceOverview` | ❌ **YES** | Returns 500/403, causes error banner |
| `GET /api/org/intelligence/recommendations/latest` | `OrgIntelligenceOverview` | ❌ **YES** | Returns 500/403, causes error banner |

**Violation:** Intelligence failures **block Overview page rendering** by showing error banners.

**Current Behavior:**
```tsx
// OrgIntelligenceOverview.tsx
if (error) {
  return (
    <Card>
      <CardContent className="text-sm text-destructive">
        Failed to load insights: {error}
      </CardContent>
    </Card>
  );
}
```

**Fix Required:** Change to empty state instead of error banner:
```tsx
if (error) {
  return (
    <Card>
      <CardContent className="text-sm text-muted-foreground">
        Intelligence insights unavailable. This is optional and does not affect Org functionality.
      </CardContent>
    </Card>
  );
}
```

---

## Feature Flag Gating

### Flags Checked

| Flag | Used By | Blocks Read? | Blocks Write? | Status |
|------|---------|--------------|--------------|--------|
| `org.people.write` | `AddPersonForm`, `PeopleListClient` | ❌ No | ✅ Yes | ✅ Correct |
| `org.structure.write` | `StructureClient` | ❌ No | ✅ Yes | ✅ Correct |
| `org.ownership.write` | `OwnershipClient` | ❌ No | ✅ Yes | ✅ Correct |

**Status:** ✅ **PASS** — Feature flags correctly disable write actions without blocking read.

---

## Prisma Runtime Errors

### People List Failure

**Error:** None observed in current code.

**Root Cause:** N/A — `listOrgPeople()` uses correct includes:
```ts
include: {
  user: { select: { id: true, name: true, email: true } },
  team: { select: { id: true, name: true, department: { select: { id: true, name: true } } } },
  parent: { select: { id: true, user: { select: { id: true, name: true } } } },
}
```

**Status:** ✅ **PASS** — No Prisma errors.

---

### Snapshot Failure

**Error:** Intelligence snapshot endpoints return 500/403.

**Root Cause:** Intelligence endpoints require:
1. Existing snapshots (may not exist for new workspaces)
2. Proper auth/workspace context
3. Intelligence service availability

**Status:** ⚠️ **EXPECTED** — Intelligence is optional, but errors should not block MVP pages.

---

### Overview Partial Load

**Error:** Overview page loads but intelligence section fails.

**Root Cause:** `OrgIntelligenceOverview` component shows error banner instead of empty state.

**Status:** ❌ **FAIL** — Should show empty state, not error.

---

## P0 Blockers (Must Fix)

### 1. Structure Page Gating

**Issue:** `/org/structure` is gated behind `NEXT_PUBLIC_ORG_DEV_PAGES !== "1"`, returning 404.

**Impact:** Users cannot create departments or teams, blocking Flow A steps 5-6.

**Fix:**
- Remove dev-only gating from `src/app/org/structure/page.tsx`
- Or provide alternative structure management UI (e.g., via `/org/people` or `/org/ownership`)

**Priority:** **P0** — Blocks core MVP flow.

---

### 2. Intelligence Coupling on Overview

**Issue:** `OrgIntelligenceOverview` shows error banner when intelligence endpoints fail, blocking Overview page rendering.

**Impact:** Users see "Failed to load insights" error on `/org`, making the page appear broken.

**Fix:**
- Change `OrgIntelligenceOverview` to show empty state instead of error banner
- Add try-catch around intelligence API calls
- Make intelligence section truly optional (hide if unavailable)

**Priority:** **P0** — Blocks Overview page usability.

---

### 3. Setup State Inconsistency

**Issue:** `/org/setup` uses `getOrgSetupStatus()` which counts people without `isActive: true` filter, causing counts to differ from `/org/overview`.

**Impact:** Users see inconsistent counts between pages, causing confusion.

**Fix:**
- Align `getOrgSetupStatus()` count logic with `/api/org/overview`
- Add `isActive: true` filter to people count in `getOrgSetupStatus()`

**Priority:** **P0** — Causes user confusion and breaks trust.

---

## P1 Defects (Can Tolerate Short-Term)

### 1. Structure Write Controls Missing

**Issue:** Structure page is inaccessible, so users cannot create departments/teams via UI.

**Workaround:** Users can create teams via API calls or use alternative flows (e.g., assign teams when creating people).

**Priority:** **P1** — Workaround exists, but UX is poor.

---

### 2. Intelligence Error Messages

**Issue:** Intelligence endpoints return generic 500/403 errors without context.

**Impact:** Users see "Failed to load insights" without understanding why.

**Fix:** Add better error messages explaining that intelligence is optional.

**Priority:** **P1** — Does not block MVP, but improves UX.

---

## What Is Still Breaking Page Loads?

### Root Causes

1. **Intelligence Coupling:** `OrgIntelligenceOverview` treats intelligence as required, showing error banners when endpoints fail.
2. **Structure Page Gating:** Dev-only env var prevents access to structure management UI.
3. **Setup State Inconsistency:** Different count logic between `/org/overview` and `/org/setup` causes confusion.

### Why Previous Fixes Did Not Surface This

1. **Intelligence was tested in isolation** — Previous fixes focused on API error handling (JSON parsing), not component-level error boundaries.
2. **Structure page was assumed accessible** — Dev-only gating was not documented or tested in MVP flow.
3. **Setup state was not cross-validated** — Different data sources were not compared during testing.

---

## Recommended Fix Pack X

### Scope: Minimal — Unblock Onboarding Fully

**Target:** Make Org onboarding work end-to-end without intelligence or optional features.

### Changes Required

#### 1. Remove Structure Page Gating

**File:** `src/app/org/structure/page.tsx`

**Change:**
```ts
// REMOVE THIS:
if (process.env.NEXT_PUBLIC_ORG_DEV_PAGES !== "1") {
  notFound()
}
```

**Impact:** Structure page becomes accessible to all users.

---

#### 2. Make Intelligence Section Fail Gracefully

**File:** `src/components/org/OrgIntelligenceOverview.tsx`

**Change:**
```tsx
if (error) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Intelligence</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Intelligence insights are temporarily unavailable. This does not affect Org functionality.
      </CardContent>
    </Card>
  );
}
```

**Impact:** Overview page renders successfully even when intelligence fails.

---

#### 3. Align Setup State Counts

**File:** `src/server/org/setup/status.ts`

**Change:**
```ts
// ADD isActive filter to match /api/org/overview
const peopleCount = await prisma.orgPosition.count({
  where: {
    userId: { not: null },
    isActive: true, // ADD THIS
  },
});
```

**Impact:** Setup page counts match Overview page.

---

### What We Will NOT Fix Yet

1. **Intelligence snapshot generation** — Optional feature, not required for MVP.
2. **Advanced structure management** — Basic create/assign flows are sufficient.
3. **Reporting structure visualization** — Read-only data works, visualization is optional.
4. **Availability freshness checks** — Optional feature, not required for MVP.

---

## Verification Checklist

After Fix Pack X, verify:

- [ ] `/org` loads without error banners (intelligence shows empty state)
- [ ] `/org/structure` is accessible (no 404)
- [ ] `/org/setup` counts match `/org/overview` counts
- [ ] Flow A can be completed end-to-end:
  - [ ] Visit `/org` → See overview
  - [ ] Click "Add person" → Create person
  - [ ] Return to `/org` → See person in counts
  - [ ] Click "Define structure" → Create team
  - [ ] Assign owner → Ownership complete
  - [ ] Return to `/org` → Setup shows "Ready"

---

## Next Recommended Step

**Generate Fix Pack X (P0 runtime unblock)** — Implement the 3 changes above to make Org onboarding work end-to-end without intelligence or optional features.

