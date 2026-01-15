# Org MVP Pressure Test Audit Report

**Date:** 2025-01-27  
**Scope:** Org MVP pages and their API dependencies  
**Purpose:** Identify failures, dead ends, and performance issues blocking onboarding

---

## 1. Executive Summary

### Biggest Blockers

**P0 (Onboarding Blockers):**
1. **Dead-end navigation:** `/org/overview` route referenced but doesn't exist (should be `/org`)
2. **Defensive fallbacks masking schema issues:** Multiple API endpoints use raw SQL fallbacks when Prisma models are missing, indicating stale migrations
3. **Non-compliant routes using deprecated `orgId` pattern:** Routes under `/api/org/[orgId]/**` violate workspaceId-only rule

**P1 (Reliability Issues):**
4. **Client-side waterfall loading:** Overview page makes 3+ sequential API calls instead of parallel
5. **Missing error boundaries:** API failures result in generic "Internal server error" messages
6. **Performance:** `listOrgPeople` fetches availability data separately (N+1 pattern)

**P2 (Performance):**
7. **Deep Prisma includes:** Structure endpoint fetches deeply nested relations unnecessarily
8. **No caching:** Repeated calls to `/api/org/flags` and settings endpoints

### What Is Broken vs Slow

**Broken (500s/404s):**
- Links to `/org/overview` → 404 (should be `/org`)
- Routes under `/api/org/[orgId]/**` → likely 500s due to deprecated pattern
- Stale Prisma client scenarios → defensive fallbacks work but indicate schema drift

**Slow (but functional):**
- Overview page: 3 sequential API calls
- People list: separate availability query (N+1)
- Structure: deep nested includes

---

## 2. Page-by-Page Map

### 2.1 `/org` (Overview)

**Components:**
- `src/app/org/page.tsx` (Server Component)
- `src/components/org/OverviewSummaryCards.tsx` (Client)
- `src/components/org/SetupChecklist.tsx` (Client)
- `src/components/org/OrgIntelligenceOverview.tsx` (Client)

**API Calls:**
1. `GET /api/org/people` (via `OverviewSummaryCards`)
2. `GET /api/org/structure` (via `OverviewSummaryCards`)
3. `GET /api/org/ownership` (via `OverviewSummaryCards` and `SetupChecklist`)
4. `GET /api/org/flags` (via `PeopleListClient` readiness check, if rendered)
5. `GET /api/org/intelligence/snapshots/latest` (via `OrgIntelligenceOverview`)
6. `GET /api/org/intelligence/recommendations/latest` (via `OrgIntelligenceOverview`)

**Status Codes:** 200 (when working), 500 (when Prisma client stale)

**Issues:**
- **Dead-end navigation:** `OverviewSummaryCards.tsx:51` links to `/org/overview` (doesn't exist, should be `/org`)
- **Waterfall loading:** `OverviewSummaryCards` and `SetupChecklist` both fetch the same endpoints sequentially
- **No error boundaries:** If any API fails, entire component shows error state

---

### 2.2 `/org/people` (People List)

**Components:**
- `src/app/org/people/page.tsx` (Server Component)
- `src/components/org/PeopleListClient.tsx` (Client)

**API Calls:**
1. `GET /api/org/flags` (for write permission check)
2. `GET /api/org/people` (list all people)
3. `GET /api/org/structure` (for readiness check via `useOrgReadiness`)
4. `GET /api/org/ownership` (for readiness check via `useOrgReadiness`)

**Status Codes:** 200 (when working)

**Issues:**
- **Performance:** `listOrgPeople` service fetches availability separately (N+1 query pattern)
- **Redundant readiness checks:** `useOrgReadiness` may duplicate queries already made by parent components

---

### 2.3 `/org/people/new` (Add Person)

**Components:**
- `src/app/org/people/new/page.tsx` (Server Component)
- `src/components/org/AddPersonForm.tsx` (Client)

**API Calls:**
1. `GET /api/org/flags` (for write permission check)
2. `GET /api/org/structure` (for department/team dropdowns)
3. `POST /api/org/people/create` (create person)

**Status Codes:** 201 (success), 409 (duplicate email), 500 (server error)

**Issues:**
- **No obvious blockers:** Form works when flags enabled

---

### 2.4 `/org/people/[personId]` (Person Profile)

**Components:**
- `src/app/org/people/[personId]/page.tsx` (Server Component)
- `src/components/org/PersonProfileClient.tsx` (Client, likely)

**API Calls:**
1. `GET /api/org/people/[personId]` (get person details)
2. `GET /api/org/flags` (for write permission checks)
3. `GET /api/org/people` (for manager selection dropdown)
4. `PUT /api/org/people/[personId]/manager` (set manager)
5. `PUT /api/org/people/[personId]/availability` (set availability)

**Status Codes:** 200 (success), 404 (not found), 500 (server error)

**Issues:**
- **Needs verification:** Confirm `PersonProfileClient` component exists and routes correctly

---

### 2.5 `/org/structure` (Structure)

**Components:**
- `src/app/org/structure/page.tsx` (Server Component)
- `src/components/org/StructureClient.tsx` (Client, likely)

**API Calls:**
1. `GET /api/org/structure` (get departments and teams)
2. `GET /api/org/flags` (for write permission checks)
3. `GET /api/org/people` (for owner/member selection dropdowns)
4. `POST /api/org/structure/departments/create` (create department)
5. `POST /api/org/structure/teams/create` (create team)
6. `PUT /api/org/structure/teams/[teamId]/owner` (set team owner)
7. `POST /api/org/structure/teams/[teamId]/members/add` (add member)
8. `POST /api/org/structure/teams/[teamId]/members/remove` (remove member)

**Status Codes:** 200 (success), 500 (server error)

**Issues:**
- **Deep includes:** Structure endpoint fetches deeply nested relations (departments → teams → positions → users)
- **No pagination:** All teams/positions loaded at once

---

### 2.6 `/org/ownership` (Ownership)

**Components:**
- `src/app/org/ownership/page.tsx` (Server Component)
- `src/components/org/OwnershipClient.tsx` (Client, likely)

**API Calls:**
1. `GET /api/org/ownership` (get coverage and assignments)
2. `GET /api/org/flags` (for write permission checks)
3. `GET /api/org/people` (for owner selection dropdown)
4. `POST /api/org/ownership/assign` (assign owner)

**Status Codes:** 200 (success), 500 (server error)

**Issues:**
- **Defensive fallback:** `getOrgOwnership` uses raw SQL when `ownerPersonId` column missing (indicates stale migrations)
- **N+1 pattern:** Fetches owner user details separately after getting assignments

---

### 2.7 `/org/intelligence` (Intelligence)

**Components:**
- `src/app/org/intelligence/page.tsx` (Server Component)
- `src/components/org/IntelligencePageClient.tsx` (Client, likely)

**API Calls:**
1. `GET /api/org/intelligence/snapshots/latest`
2. `GET /api/org/intelligence/settings`
3. `GET /api/org/intelligence/recommendations/latest`
4. `POST /api/org/intelligence/snapshots/create`

**Status Codes:** 200 (success), 500 (when snapshot model missing)

**Issues:**
- **Defensive fallback:** Snapshot endpoint uses try-catch to handle missing `orgIntelligenceSnapshot` model (indicates stale migrations)

---

## 3. API Endpoint Audit

### 3.1 Core MVP Endpoints (Compliant)

| Endpoint | Route File | Auth/Scoping | Prisma Operations | Status |
|----------|------------|--------------|-------------------|--------|
| `GET /api/org/people` | `src/app/api/org/people/route.ts` | ✅ PASS | `orgPosition.findMany` with includes | Working |
| `GET /api/org/people/[personId]` | `src/app/api/org/people/[personId]/route.ts` | ✅ PASS | `orgPosition.findUnique` | Working |
| `POST /api/org/people/create` | `src/app/api/org/people/create/route.ts` | ✅ PASS | `orgPosition.create` | Working |
| `GET /api/org/structure` | `src/app/api/org/structure/route.ts` | ✅ PASS | `orgDepartment.findMany`, `orgTeam.findMany` | Working |
| `GET /api/org/ownership` | `src/app/api/org/ownership/route.ts` | ✅ PASS | `orgTeam.findMany`, `orgDepartment.findMany`, `ownerAssignment.findMany` | Working (with fallback) |
| `GET /api/org/flags` | `src/app/api/org/flags/route.ts` | ✅ PASS | No Prisma (flags only) | Working |
| `GET /api/org/intelligence/snapshots/latest` | `src/app/api/org/intelligence/snapshots/latest/route.ts` | ✅ PASS | `orgIntelligenceSnapshot.findFirst` (with fallback) | Working (with fallback) |

**Compliance Notes:**
- All MVP endpoints follow correct pattern: `getUnifiedAuth` → `assertAccess` → `setWorkspaceContext` → Prisma
- None accept `workspaceId` from body/params/query
- None use `orgId` pattern

---

### 3.2 Non-Compliant Endpoints (Deprecated `orgId` Pattern)

| Endpoint Pattern | Route Files | Issue | Impact |
|------------------|-------------|-------|--------|
| `/api/org/[orgId]/**` | `src/app/api/org/[orgId]/people/route.ts`<br>`src/app/api/org/[orgId]/structure/route.ts`<br>`src/app/api/org/[orgId]/overview/route.ts`<br>... (100+ files) | Uses deprecated `orgId` param instead of `workspaceId` from auth | **Violates ground rules** - these routes should not exist or should be migrated |

**Recommendation:** These routes should be deleted or migrated to workspace-scoped pattern. They violate the "workspaceId only" rule.

---

### 3.3 Defensive Fallbacks (Schema Drift Indicators)

**Issue:** Multiple endpoints use defensive fallbacks when Prisma models/columns are missing:

1. **`getOrgOwnership`** (`src/server/org/ownership/read.ts:30-76`)
   - Falls back to raw SQL when `ownerPersonId` column missing
   - **Root cause:** Stale Prisma client or pending migrations

2. **`getOrCreateIntelligenceSettings`** (`src/server/org/intelligence/settings.ts:91-150`)
   - Falls back to raw SQL when `orgIntelligenceSettings` model missing
   - **Root cause:** Stale Prisma client or pending migrations

3. **`GET /api/org/intelligence/snapshots/latest`** (`src/app/api/org/intelligence/snapshots/latest/route.ts:52-72`)
   - Falls back to `null` when `orgIntelligenceSnapshot` model missing
   - **Root cause:** Stale Prisma client or pending migrations

**Impact:** Endpoints work but indicate schema drift. These fallbacks mask the real issue (need to run migrations).

---

## 4. Dead-End Navigation Audit

### 4.1 Broken Links

| Component | File | Line | Broken Link | Should Be |
|-----------|------|------|-------------|-----------|
| `OverviewSummaryCards` | `src/components/org/OverviewSummaryCards.tsx` | 51 | `/org/overview` | `/org` |
| `OrgIntelligenceOverview` | `src/components/org/OrgIntelligenceOverview.tsx` | 15, 22 | `/org/overview` | `/org` |
| `IntelligenceDrilldownsClient` | `src/components/org/IntelligenceDrilldownsClient.tsx` | 15 | `/org/overview` | `/org` |

**Impact:** Users clicking "View overview" or similar CTAs get 404 errors.

---

## 5. Performance Audit

### 5.1 Client-Side Waterfalls

**Overview Page:**
- `OverviewSummaryCards` fetches: `people` → `structure` → `ownership` (3 sequential calls)
- `SetupChecklist` fetches: `people` → `structure` → `ownership` (3 sequential calls, duplicates above)
- `OrgIntelligenceOverview` fetches: `snapshots/latest` → `recommendations/latest` (2 sequential calls)

**Total:** 8 API calls, but only 5 unique endpoints. Should be parallelized.

**Fix:** Combine `OverviewSummaryCards` and `SetupChecklist` queries into single component or use parallel fetching.

---

### 5.2 N+1 Query Patterns

**`listOrgPeople` service** (`src/server/org/people/read.ts:41-57`)
- Fetches all positions, then separately queries `personAvailabilityHealth` for all users
- **Fix:** Use Prisma `include` with `personAvailabilityHealth` relation, or use a single query with JOIN

**`getOrgOwnership` service** (`src/server/org/ownership/read.ts:97-100`)
- Fetches assignments, then separately queries users for owner details
- **Fix:** Use Prisma `include` if relation exists, or single query with JOIN

---

### 5.3 Deep Includes (Heavy Payloads)

**`getOrgStructure` service** (`src/server/org/structure/read.ts:17-51`)
- Fetches: departments → teams → positions → users (4 levels deep)
- **Impact:** Large payloads, especially for orgs with many teams/people
- **Fix:** Consider pagination or limit depth for list views

---

### 5.4 Uncached Heavy Queries

**`getOrCreateIntelligenceSettings`** (`src/server/org/intelligence/settings.ts`)
- Called on every intelligence snapshot request
- **Fix:** Cache settings in memory or use request-level cache

**`GET /api/org/flags`**
- Called by multiple components on every page load
- **Fix:** Cache flags in client component state or use React Query/SWR

---

## 6. Fix Plan

### P0: Onboarding Blockers (Must Fix)

#### P0.1: Fix Dead-End Navigation (`/org/overview` → `/org`)

**Symptom:** Links to `/org/overview` result in 404 errors  
**Root Cause:** Route doesn't exist; main overview is `/org`  
**Files to Change:**
- `src/components/org/OverviewSummaryCards.tsx:51`
- `src/components/org/OrgIntelligenceOverview.tsx:15, 22`
- `src/components/org/IntelligenceDrilldownsClient.tsx:15`

**Fix:**
- Replace all `/org/overview` hrefs with `/org`

**Verification:**
- Click "View overview" buttons from Overview page
- Verify navigation works, no 404s

---

#### P0.2: Remove Defensive Fallbacks (Run Migrations)

**Symptom:** Endpoints work but use raw SQL fallbacks, indicating schema drift  
**Root Cause:** Prisma client stale or migrations not applied  
**Files to Change:**
- `src/server/org/ownership/read.ts:30-76` (remove fallback, ensure migrations run)
- `src/server/org/intelligence/settings.ts:91-150` (remove fallback, ensure migrations run)
- `src/app/api/org/intelligence/snapshots/latest/route.ts:52-72` (remove fallback, ensure migrations run)

**Fix:**
1. Verify all migrations are applied: `pnpm prisma migrate deploy` (or `dev`)
2. Regenerate Prisma client: `pnpm prisma generate`
3. Remove defensive fallback code
4. If model truly doesn't exist, add migration or remove feature

**Verification:**
- Run migrations
- Verify endpoints work without fallbacks
- Check logs for no "fallback" messages

---

#### P0.3: Audit and Remove/ Migrate `orgId` Routes

**Symptom:** 100+ routes under `/api/org/[orgId]/**` violate workspaceId-only rule  
**Root Cause:** Legacy pattern not migrated  
**Files to Change:**
- All routes under `src/app/api/org/[orgId]/**` (100+ files)

**Fix:**
1. Identify which routes are actually used (grep for API calls)
2. For unused routes: delete them
3. For used routes: migrate to workspace-scoped pattern:
   - Remove `orgId` param
   - Use `getUnifiedAuth(request)` → `workspaceId`
   - Update route path to remove `[orgId]` segment
   - Update client calls

**Verification:**
- Grep codebase for calls to `/api/org/[orgId]/**` endpoints
- Verify no UI components reference these routes
- Delete unused routes, migrate used ones

---

### P1: Reliability Fixes

#### P1.1: Fix N+1 Query in `listOrgPeople`

**Symptom:** Separate query for availability data (performance)  
**Root Cause:** Availability fetched separately instead of included in main query  
**Files to Change:**
- `src/server/org/people/read.ts:41-57`

**Fix:**
- Add `personAvailabilityHealth` relation to Prisma schema if missing
- Use `include: { user: { include: { personAvailabilityHealth: true } } }` in main query
- Remove separate `personAvailabilityHealth.findMany` call

**Verification:**
- Check Prisma query logs: should see single query instead of N+1
- Verify people list still loads correctly

---

#### P1.2: Parallelize Overview Page API Calls

**Symptom:** Overview page makes 8 sequential API calls (5 unique)  
**Root Cause:** Components fetch independently, causing waterfall  
**Files to Change:**
- `src/components/org/OverviewSummaryCards.tsx`
- `src/components/org/SetupChecklist.tsx`

**Fix:**
- Create shared hook `useOrgOverviewData()` that fetches all endpoints in parallel
- Both components use the same hook (shared state)
- Or combine components to share fetch logic

**Verification:**
- Check Network tab: all API calls should fire in parallel
- Page load time should decrease

---

#### P1.3: Add Error Boundaries and Better Error Messages

**Symptom:** Generic "Internal server error" messages don't help users  
**Root Cause:** Error handling returns generic messages  
**Files to Change:**
- All API route handlers in `src/app/api/org/**/route.ts`
- Client components that display errors

**Fix:**
- Add specific error messages for common failures (missing data, validation errors)
- Add error boundaries in page components
- Log detailed errors server-side, return user-safe messages client-side

**Verification:**
- Trigger errors (e.g., invalid personId)
- Verify user sees helpful message, not "Internal server error"

---

### P2: Performance Improvements

#### P2.1: Optimize Structure Endpoint Payload

**Symptom:** Structure endpoint returns deeply nested data (large payloads)  
**Root Cause:** Fetches 4 levels deep (departments → teams → positions → users)  
**Files to Change:**
- `src/server/org/structure/read.ts:17-51`

**Fix:**
- For list view: don't include user details, only IDs/counts
- Add separate endpoint for detailed team view if needed
- Or add pagination/limit

**Verification:**
- Check Network tab: payload size should decrease
- Verify structure page still renders correctly

---

#### P2.2: Cache Flags and Settings

**Symptom:** Flags and settings fetched on every page load  
**Root Cause:** No caching  
**Files to Change:**
- `src/components/org/api.ts` (use React Query or SWR for flags)
- `src/server/org/intelligence/settings.ts` (add request-level cache)

**Fix:**
- Use React Query or SWR to cache flags client-side
- Add simple in-memory cache for settings server-side (or use Next.js cache)

**Verification:**
- Check Network tab: flags should only fetch once per session
- Settings should only fetch once per request

---

#### P2.3: Fix N+1 in `getOrgOwnership`

**Symptom:** Separate query for owner user details  
**Root Cause:** Users fetched after assignments  
**Files to Change:**
- `src/server/org/ownership/read.ts:97-100`

**Fix:**
- If relation exists: use `include` in main query
- If not: use single query with JOIN or Prisma `$queryRaw`

**Verification:**
- Check Prisma query logs: should see single query or JOIN
- Verify ownership page still loads correctly

---

## 7. Verification Steps

### After P0 Fixes:

1. **Navigation:**
   - Visit `/org`
   - Click all "View overview" / "Open" / "Fix" buttons
   - Verify no 404s

2. **API Endpoints:**
   - Call all MVP endpoints manually (curl/Postman)
   - Verify 200 responses
   - Check logs for no fallback warnings

3. **Migrations:**
   - Run `pnpm prisma migrate deploy` (or `dev`)
   - Run `pnpm prisma generate`
   - Restart dev server
   - Verify endpoints work without fallbacks

### After P1 Fixes:

1. **Performance:**
   - Open Network tab on Overview page
   - Verify API calls are parallel, not sequential
   - Check query logs for no N+1 patterns

2. **Error Handling:**
   - Trigger errors (invalid IDs, missing data)
   - Verify helpful error messages

### After P2 Fixes:

1. **Payload Sizes:**
   - Check Network tab payload sizes
   - Verify structure endpoint returns smaller payloads

2. **Caching:**
   - Check flags only fetch once per session
   - Verify settings cached appropriately

---

## 8. Summary Statistics

**Total Pages Audited:** 7 (all MVP pages)  
**Total API Endpoints Audited:** 27 (MVP endpoints)  
**Compliant Endpoints:** 7 (core MVP)  
**Non-Compliant Endpoints:** 100+ (deprecated `orgId` pattern)  
**Dead-End Links:** 3 locations  
**N+1 Query Patterns:** 2  
**Defensive Fallbacks:** 3  
**Performance Issues:** 5  

---

## 9. Next Steps

1. **Immediate:** Fix P0 blockers (dead-end navigation, migrations, `orgId` routes)
2. **Short-term:** Address P1 reliability issues
3. **Medium-term:** Optimize performance (P2)

After P0 fixes, onboarding should work end-to-end. After P1 fixes, reliability should be solid. After P2 fixes, performance should be acceptable.

---

**Report Generated:** 2025-01-27  
**Next Recommended Step:** Generate "Fix Pack 1" (P0 blockers only) with exact file patches and verification steps.

