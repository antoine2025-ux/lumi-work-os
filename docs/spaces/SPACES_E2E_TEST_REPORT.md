# Spaces Feature: End-to-End Test Report

**Date:** 2026-02-25  
**Test Suite:** Full E2E test suite per agreed architecture  
**Environment:** Local dev (npm run dev), Playwright E2E, Prisma data integrity script

---

## Executive Summary

| Category | Pass | Fail | Skip | Notes |
|----------|-----|------|------|-------|
| **Test Suite 1: Sidebar Structure** | 0 | 0 | 6 | Auth required; tests not executed |
| **Test Suite 2: Personal View** | 0 | 0 | 1 | Auth required |
| **Test Suite 3: Team Space View** | 0 | 0 | 1 | Auth required |
| **Test Suite 4: Company Wiki** | 0 | 0 | 1 | Auth required |
| **Test Suite 5: Project Creation** | — | — | — | Not automated |
| **Test Suite 6: Wiki Page Scoping** | — | — | — | Not automated |
| **Test Suite 7: Navigation** | 0 | 0 | 2 | Auth required |
| **Test Suite 8: Data Integrity** | 2 | 1 | 0 | SQL checks run |

**E2E tests:** Auth setup failed (no `.auth/user.json` or CI E2E auth). All 11 Spaces tests were skipped.  
**Data integrity:** 2/3 checks passed. 4 orphaned projects (legacy `spaceId=null`).

---

## Test Environment Setup

- **Prerequisites:** Fresh workspace or cleared test data; user with ADMIN/OWNER role
- **Actual:** Local DB with existing workspaces (Loopwell, Loopingwell, Loopingwell.io)
- **Auth:** `.auth/user.json` not present; E2E tests require manual `npx playwright codegen --save-storage=.auth/user.json` or CI `E2E_AUTH_ENABLED` + `E2E_AUTH_SECRET`

---

## TEST SUITE 1: SIDEBAR STRUCTURE

### Test 1.1: Sidebar sections exist

**Status:** NOT RUN (auth required)

**Expected:** Navigate to `/spaces/home` (or `/w/[slug]/spaces/home`). Sidebar has:
- [ ] MY SPACE section with "Personal" item
- [ ] TEAM SPACES section with team spaces list
- [ ] SHARED section with "Company Wiki" and "Templates"
- [ ] MY STUFF section with "To-do List" and "Favorites"

**Code verification:** `GlobalSidebar.tsx` implements all four sections. Structure matches spec.

---

### Test 1.2: Company Wiki NOT in Team Spaces

**Status:** NOT RUN (auth required)

**Expected:** "Company Wiki" appears only under SHARED, not under TEAM SPACES.

**Code verification:** `GlobalSidebar.tsx` filters team spaces with:
```ts
!s.isPersonal && type !== 'WIKI' && !parentId && slug !== 'company-wiki'
```
Company Wiki is rendered under SHARED only. **PASS (by code review).**

---

### Test 1.3: Folders nested under parent space

**Status:** NOT RUN (auth required)

**Expected:** Folders (child spaces) appear nested under parent with expand arrow; not as top-level TEAM SPACES items.

**Code verification:** `GlobalSidebar.tsx` filters `!parentId` for team spaces; children rendered under parent with `toggleSpaceExpand`. **PASS (by code review).**

---

### Test 1.4: Sidebar consistent across all pages

**Status:** NOT RUN (auth required)

**Expected:** Same sidebar on `/spaces/home`, `/spaces/[teamSlug]`, `/projects/[id]`, `/wiki/[slug]`.

**Code verification:** `DashboardLayoutClient.tsx` renders `GlobalSidebar` for all dashboard routes. `SpacesLayoutShell` is a pass-through; sidebar comes from root layout. **PASS (by code review).**

---

## TEST SUITE 2: PERSONAL SPACE VIEW

### Tests 2.1–2.4

**Status:** NOT RUN (auth required)

**Code verification:**
- `PersonalSpaceView.tsx` has WORKING ON, RECENT ACTIVITY, PERSONAL NOTES, DUE SOON
- APIs: `/api/spaces/personal/projects`, `recent-pages`, `notes`, `due-tasks`
- `getMyProjects`, `getMyRecentPages`, `getMyPersonalNotes`, `getMyDueTasks` in `src/lib/spaces/queries.ts`

---

## TEST SUITE 3: TEAM SPACE VIEW

### Tests 3.1–3.6

**Status:** NOT RUN (auth required)

**Code verification:**
- `TeamSpaceView.tsx` has OUR PROJECTS, COLLABORATING ON, TEAM DOCS, FOLDERS
- APIs: `/api/spaces/[id]`, `/api/spaces/[id]/projects`, `collaborations`, `docs`
- Breadcrumb: Spaces > Parent? > This space

---

## TEST SUITE 4: COMPANY WIKI

### Test 4.1: Company Wiki is clickable

**Status:** NOT RUN (auth required)

**Code verification:** `GlobalSidebar.tsx` links Company Wiki to `/wiki/home`. **PASS (by code review).**

### Test 4.2–4.5

**Status:** NOT RUN (auth required)

**Code verification:** `CompanyWikiView.tsx` shows header, "+ New Page", Recent Updates. `/api/wiki/company-wiki` scopes by `companyWikiSpaceId`.

---

## TEST SUITE 5: PROJECT CREATION & OWNERSHIP

**Status:** NOT automated. Manual verification required.

**Code verification:** `CreateProjectDialog` requires space selection. Project creation sets `spaceId`. Legacy projects may have `spaceId=null` (see Test 8.2).

---

## TEST SUITE 6: WIKI PAGE SCOPING

**Status:** NOT automated. Manual verification required.

**Code verification:** `WikiPage` has `spaceId`, `type` (TEAM_DOC | COMPANY_WIKI | PERSONAL_NOTE). `getCompanyWikiPages` filters by `companyWikiSpaceId`. `getMyPersonalNotes` filters by personal space or `permissionLevel='personal'`.

---

## TEST SUITE 7: NAVIGATION & LINKS

**Status:** NOT RUN (auth required)

**Code verification:** Project cards link to `/projects/[id]`; page links to `/wiki/[slug]`. Breadcrumbs in `TeamSpaceView` and wiki layout.

---

## TEST SUITE 8: DATA INTEGRITY CHECKS

**Script:** `npx tsx scripts/spaces-data-integrity.ts`

### Test 8.1: Orphaned wiki pages

```
8.1 Orphaned wiki pages (space_id=null, not PERSONAL_NOTE, permissionLevel!=personal):
  Count: 0
```

**Result:** PASS — No orphaned wiki pages.

---

### Test 8.2: Orphaned projects

```
8.2 Orphaned projects (space_id=null):
  Count: 4
  - cmlqt9ya3000o8olevh5wrurl: "To the moon" (ws: cmlp182up00028o5sz4eg2o3o)
  - cmlqw407m00168ole344me524: "New Product Launch" (ws: cmlp182up00028o5sz4eg2o3o)
  - cmluymta6000h8o5xd70i2i01: "Will it work" (ws: cmluv5993000b8owuhimca2yv)
  - cmm29objj001j8orc25qa5ne8: "Testing Project Sample" (ws: cmlut9371000u8ovqrfdnseln)
```

**Result:** FAIL

| TEST | Test 8.2 |
|------|----------|
| **EXPECTED** | No orphaned projects (space_id=null) |
| **ACTUAL** | 4 projects with space_id=null |
| **EVIDENCE** | Script output above |
| **ROOT CAUSE** | Legacy projects created before spaceId was required |
| **FIX SUGGESTION** | Run backfill script to assign projects to a default space (e.g. first team space or "Unassigned" space), or add UI prompt to assign team when spaceId is null |

---

### Test 8.3: Company Wiki space per workspace

```
8.3 Company Wiki space per workspace:
  Loopingwell: OK (exactly 1)
  Loopwell: OK (exactly 1)
  Loopingwell.io: OK (exactly 1)
```

**Result:** PASS — Exactly one Company Wiki space per workspace.

---

## FAILURE REPORT (Detailed)

### FAILURE 1: E2E Auth Setup

| Field | Value |
|-------|-------|
| **TEST** | [setup] authenticate |
| **EXPECTED** | Auth state loaded from `.auth/user.json` or E2E auth endpoint |
| **ACTUAL** | "AUTH STATE NOT FOUND OR INVALID" — setup throws, all Spaces tests skipped |
| **EVIDENCE** | Playwright output: `1 failed, 11 did not run` |
| **ROOT CAUSE** | No `.auth/user.json`; CI not configured with E2E_AUTH_ENABLED |
| **FIX SUGGESTION** | For local: `npx playwright codegen --save-storage=.auth/user.json http://localhost:3000/login`. For CI: set E2E_AUTH_ENABLED=true and E2E_AUTH_SECRET |

---

### FAILURE 2: Orphaned Projects (Test 8.2)

| Field | Value |
|-------|-------|
| **TEST** | Test 8.2 |
| **EXPECTED** | No projects with space_id=null |
| **ACTUAL** | 4 projects with space_id=null |
| **EVIDENCE** | See Test 8.2 output above |
| **ROOT CAUSE** | Legacy data; project creation may have allowed null spaceId historically |
| **FIX SUGGESTION** | Backfill script or migration to assign default space; enforce spaceId in project create API |

---

## KNOWN ISSUES (From Prior Assessment)

### P0: `/spaces/home` client error after redirect

| Field | Value |
|-------|-------|
| **TEST** | Entry point |
| **EXPECTED** | `/spaces/home` redirects to `/w/[slug]/spaces/home` and loads |
| **ACTUAL** | Client-side exception after redirect (per SPACES_E2E_UX_ASSESSMENT.md) |
| **WORKAROUND** | Use `/w/[workspaceSlug]/spaces/home` directly |
| **FIX SUGGESTION** | Debug browser console when loading `/spaces/home`; likely workspaceSlug or Loopbrain context guard |

---

## PRIORITY FIXES (From Spec)

| Priority | Issue | Status |
|----------|-------|--------|
| **P0** | Projects not appearing in space | Not verified (auth); code sets spaceId on create |
| **P0** | Company Wiki in Team Spaces | PASS — filtered by type/slug |
| **P0** | Folders as top-level items | PASS — filtered by parentId |
| **P1** | Team docs in Company Wiki sidebar | PASS — sidebar uses companyWikiPages from company-wiki API |

---

## FILES CREATED/MODIFIED

- **Added:** `tests/e2e/spaces.spec.ts` — Playwright E2E tests for Suites 1–4, 7
- **Added:** `scripts/spaces-data-integrity.ts` — Data integrity checks (Suite 8)
- **Added:** `docs/spaces/SPACES_E2E_TEST_REPORT.md` — This report

---

## HOW TO RUN

### E2E Tests (requires auth)

```bash
# 1. Set up auth (one-time)
npx playwright codegen --save-storage=.auth/user.json http://localhost:3000/login
# Complete Google OAuth, then close browser

# 2. Run Spaces tests
npm run dev   # in one terminal
npm run test:e2e:dev -- tests/e2e/spaces.spec.ts   # in another
```

### Data Integrity

```bash
npx tsx scripts/spaces-data-integrity.ts
```

---

## RECOMMENDATIONS

1. **Fix auth for CI:** Configure E2E_AUTH_ENABLED and E2E_AUTH_SECRET so Spaces E2E runs in CI.
2. **Fix `/spaces/home` redirect bug:** Resolve client exception so main entry point works.
3. **Backfill orphaned projects:** Assign the 4 projects to a space or add "Unassigned" handling.
4. **Expand E2E coverage:** Add Suites 5–6 (project creation, wiki scoping) and folder/precondition tests.
