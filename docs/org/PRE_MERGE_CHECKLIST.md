# Org Module Pre-Merge Checklist

Use this checklist before merging any PR that touches Org module code.

## Architecture & Ground Rules
- [ ] No `orgId` introduced anywhere (use `workspaceId` only)
- [ ] No Prisma imports in UI components (`src/app/org/**` or `src/components/org/**`)
- [ ] Route Handlers only (no Server Actions with `"use server"` in Org paths)
- [ ] All Route Handlers follow strict auth order: `getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma`
- [ ] `workspaceId` is retrieved only via `getUnifiedAuth(request)`, never from params/body/query

## Code Quality
- [ ] No defensive fallbacks masking schema issues (schema truth enforced)
- [ ] Feature flags used for incomplete capabilities (no fake/empty data)
- [ ] All mutations emit Loopbrain ContextObject + trigger non-blocking indexing
- [ ] No breaking changes to existing API contracts without versioning

## Testing & Verification
- [ ] Manual smoke test: affected endpoints return expected data
- [ ] No console errors in browser when using affected UI
- [ ] Database queries respect workspace scoping (test with multiple workspaces if applicable)
- [ ] `pnpm org:onboarding:flow` passes (with LOOPWELL_BASE_URL + auth env)

## Loopbrain Contract
- [ ] `LOOPBRAIN_INGESTION_CONTRACT_V1.md` reviewed for any `/api/org/loopbrain/context` changes
- [ ] `LOOPBRAIN_INGESTION_EXAMPLES_V1.md` updated if schema changes
- [ ] `LOOPBRAIN_CONTEXT_CHANGELOG.md` updated with changelog entry
- [ ] Contract versioning rules followed (breaking changes require v2 bump)
- [ ] `pnpm org:context:doc-guard` passes
- [ ] `pnpm org:loopbrain:contract` passes (if test exists)

## Documentation
- [ ] README or relevant docs updated if API contracts change
- [ ] New features documented in appropriate docs
- [ ] Migration instructions provided if schema changes

## Regression Checks
- [ ] Existing Org UI pages still load without errors
- [ ] Existing API endpoints return correct response shapes
- [ ] Intelligence snapshots still generate correctly (if touching intelligence code)
- [ ] Recommendations still generate correctly (if touching recommendations code)

---

**Note:** This checklist should be enforced via PR review. For automated checks, see `scripts/org-guard.js` and contract test scripts.
