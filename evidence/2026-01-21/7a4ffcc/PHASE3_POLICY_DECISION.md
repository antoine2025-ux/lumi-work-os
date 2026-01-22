# Phase 3: Typecheck/Tests Policy Decision

**Date:** 2026-01-21  
**Commit:** 7a4ffcc

## Current State

### TypeScript Errors: 516 total

**Top Error Locations (by file count):**
| Location | Errors | Category |
|----------|--------|----------|
| `src/app/(dashboard)/org-legacy/` | ~300 | Legacy org module |
| `src/server/org/` | ~50 | Org server code |
| `src/lib/loopbrain/` | ~45 | LoopBrain AI |
| `src/app/ops/` | ~35 | Ops dashboard |
| `prisma/seed/` | ~10 | Seed scripts |
| `tests/` | ~30 | Test files |
| Core app routes | ~46 | Mixed |

**Root Causes:**
1. **Schema drift:** Prisma types don't match code expectations (missing `workspaceId`, `teamMembership`, etc.)
2. **Incomplete refactor:** `org-legacy` has undefined variables (`onAddAvailability`, `setLoading`, `orgId`)
3. **Test fixture issues:** Tests expect workspace membership that doesn't exist in fixtures

### Test Failures: 19 failed / 98 passed

**Failing Test Files:**
- `tests/api/tasks.auth.spec.ts` - Workspace membership not set up
- `tests/access-control.spec.ts` - Fixture workspace mismatch
- `tests/auth-unit.test.ts` - Related auth assertions
- `tests/workspace-scoping.sanity.test.ts` - Scoping not enabled

**Root Cause:** Test fixtures don't have proper workspace membership associations.

---

## Policy Options

### Option A: Block Merge Until Fixed

**Pros:**
- Clean codebase
- No accumulated tech debt

**Cons:**
- Significant delay (3-5 days minimum)
- May touch code unrelated to current changes
- Risk of introducing new bugs during fixes

### Option B: Risk-Accept with "No New Errors" Rule ✓ RECOMMENDED

**Pros:**
- Allows immediate progress on critical work
- Isolates problem to specific directories
- Prevents accumulation of NEW debt

**Implementation:**
1. **Isolate failing directories** in tsconfig:
   ```json
   {
     "exclude": [
       "src/app/(dashboard)/org-legacy/**",
       "src/server/org/**",
       "src/app/ops/**"
     ]
   }
   ```
   OR use `// @ts-nocheck` in legacy files

2. **Add CI check:** Fail build if error count increases from 516 baseline

3. **Track in tech debt register:**
   - `org-legacy/` - 300 errors - Owner: TBD
   - `server/org/` - 50 errors - Owner: TBD
   - `loopbrain/` - 45 errors - Owner: TBD

4. **Test fixtures:** Fix in separate PR

### Option C: Disable Typecheck in Build

**NOT RECOMMENDED** - Removes safety net entirely.

---

## Recommendation

**Implement Option B** with immediate actions:

1. ✅ Document baseline: 516 typecheck errors, 19 test failures
2. Add CI rule: `error_count <= 516`
3. Mark `org-legacy/` as "DO NOT TOUCH" for now
4. Fix test fixtures in follow-up PR

---

## Evidence Files

- `evidence/2026-01-21/7a4ffcc/typecheck-fresh.txt` - Fresh typecheck output
- `evidence/2026-01-21/7a4ffcc/test-fresh.txt` - Fresh test output

---

## Acceptance Criteria for Option B

- [ ] Baseline documented (this file)
- [ ] CI rule added (or manual check before merge)
- [ ] Core routes typecheck clean (non-org-legacy)
- [ ] Security fix for `tasks/[id]/route.ts` does not increase errors
