# Multi-Tenant Rollout Checklist

## Overview

This checklist provides a step-by-step guide for safely enabling workspace scoping in staging and production. Follow this checklist before enabling `PRISMA_WORKSPACE_SCOPING_ENABLED=true`.

---

## Current Multi-Tenant Protection Layers

### 1. Data Model Layer
- **Workspace**: Primary tenant container (`id`, `name`, `slug`, `ownerId`)
- **WorkspaceMember**: Links users to workspaces with roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`)
- **workspaceId columns**: All domain models have `workspaceId` foreign key
- **Database constraints**: Foreign keys enforce referential integrity

### 2. Application-Level Checks
- **`getUnifiedAuth(request)`**: Resolves `workspaceId` from URL params → header → user's first workspace
- **`assertAccess()`**: Validates workspace membership and role requirements before queries
- **Explicit `where` clauses**: All queries include `where: { workspaceId: auth.workspaceId }`
- **Used in**: 100+ API routes

### 3. Prisma Scoping Flag (Feature-Flagged)
- **Flag**: `PRISMA_WORKSPACE_SCOPING_ENABLED` (default: `false`)
- **When OFF**: Prisma client is unscoped, routes rely on explicit `where` clauses
- **When ON**: Prisma client automatically requires `setWorkspaceContext()` before queries
- **Behavior**: Missing workspace context throws errors (fail-fast)
- **Purpose**: Defense-in-depth to catch bugs where `setWorkspaceContext()` is forgotten

### 4. Frontend Workspace Selection
- **WorkspaceProvider**: Manages `currentWorkspace` state, persists to `localStorage`
- **WorkspaceSwitcher**: UI component in header for switching workspaces
- **Server-side resolution**: Frontend `localStorage` doesn't directly affect server-side `auth.workspaceId`
- **API calls**: Should pass `workspaceId` via URL params or `x-workspace-id` header

---

## Config & Environment

### Required Environment Variables

| Variable | Local Dev | Staging | Production |
|----------|-----------|---------|------------|
| `PRISMA_WORKSPACE_SCOPING_ENABLED` | `false` | `false` → `true` (after testing) | `false` → `true` (after staging validation) |
| `DATABASE_URL` | `postgresql://...` | Staging DB URL | Production DB URL |
| `DIRECT_URL` | Same as `DATABASE_URL` | Same as `DATABASE_URL` | Same as `DATABASE_URL` |
| `NEXTAUTH_URL` | `http://localhost:3000` | Staging URL | Production URL |
| `NEXTAUTH_SECRET` | Dev secret | Staging secret | Production secret |
| `OPENAI_API_KEY` | Dev key (optional) | Staging key | Production key |

### Recommended Values

**Local Dev**:
```bash
PRISMA_WORKSPACE_SCOPING_ENABLED=false
DATABASE_URL="postgresql://user:pass@localhost:5432/loopwell_dev"
NEXTAUTH_URL="http://localhost:3000"
```

**Staging**:
```bash
PRISMA_WORKSPACE_SCOPING_ENABLED=false  # Start with false, enable after testing
DATABASE_URL="postgresql://user:pass@staging-db:5432/loopwell_staging"
NEXTAUTH_URL="https://staging.loopwell.com"
```

**Production**:
```bash
PRISMA_WORKSPACE_SCOPING_ENABLED=false  # Enable only after staging validation
DATABASE_URL="postgresql://user:pass@prod-db:5432/loopwell_prod"
NEXTAUTH_URL="https://loopwell.com"
```

---

## Pre-Flight Checks in Staging (Flag OFF)

### Step 1: Verify App Works as Expected

- [ ] **Start staging server** with `PRISMA_WORKSPACE_SCOPING_ENABLED=false`
- [ ] **Check logs**: Should see `✅ Workspace scoping DISABLED`
- [ ] **No errors** in startup logs

### Step 2: Test Critical Endpoints

Run these endpoints and verify they work:

- [ ] **`GET /api/workspaces`**
  - Returns all workspaces user belongs to
  - Each workspace includes `userRole`
  - No duplicates

- [ ] **`GET /api/projects`**
  - Returns projects scoped to user's workspace
  - No cross-workspace data leakage
  - Works with `?workspaceId=...` query param

- [ ] **`GET /api/wiki/pages`**
  - Returns wiki pages scoped to workspace
  - No cross-workspace data leakage

- [ ] **`POST /api/loopbrain/chat`**
  - Works with workspace context
  - Returns workspace-scoped context
  - Accepts `x-workspace-id` header

### Step 3: Known Quirks / Acceptable Warnings

- [ ] **Logs show**: `✅ Workspace scoping DISABLED` (expected)
- [ ] **No "workspace context" errors** (expected when flag is off)
- [ ] **Background jobs work**: Cron jobs use `prismaUnscoped` (verify in `server.js`)

---

## Scoping Flag Enablement (Staging)

### Step 1: Enable Flag

- [ ] **Set environment variable**: `PRISMA_WORKSPACE_SCOPING_ENABLED=true`
- [ ] **Restart application**
- [ ] **Check logs**: Should see `✅ Workspace scoping ENABLED`
- [ ] **Verify**: Log message includes "workspace context required"

### Step 2: Run Automated Sanity Check

- [ ] **Run sanity script**: `npm test -- tests/workspace-scoping.sanity.test.ts`
- [ ] **Expected**: Tests pass, confirming scoping is enforced
- [ ] **If tests fail**: Fix unscoped queries before proceeding

### Step 3: Test Single-Workspace User Behavior

- [ ] **User with 1 workspace**:
  - [ ] Login → workspace switcher shows workspace name (no dropdown)
  - [ ] Visit `/home` → dashboard loads correctly
  - [ ] Visit `/projects` → projects list loads correctly
  - [ ] Visit `/wiki/home` → wiki pages load correctly
  - [ ] No errors in console

### Step 4: Test Multi-Workspace User Behavior

- [ ] **User with 2+ workspaces**:
  - [ ] Login → workspace switcher shows dropdown
  - [ ] **Switch to workspace A**:
    - [ ] Projects list shows only workspace A projects
    - [ ] Wiki pages show only workspace A pages
    - [ ] Dashboard shows workspace A data
  - [ ] **Switch to workspace B**:
    - [ ] Projects list updates to workspace B projects
    - [ ] Wiki pages update to workspace B pages
    - [ ] Dashboard updates to workspace B data
  - [ ] **Refresh page** → selected workspace persists
  - [ ] No errors in console

### Step 5: Test Loopbrain Behavior

- [ ] **Query Loopbrain** with workspace context:
  - [ ] Pass `x-workspace-id` header or `workspaceId` query param
  - [ ] Response includes workspace-scoped context
  - [ ] No cross-workspace data in response
  - [ ] Works with both single and multi-workspace users

### Step 6: Error Handling

**Acceptable errors** (need to fix):
- [ ] Queries without `setWorkspaceContext()` throw clear errors
- [ ] Error messages are actionable: "Call setWorkspaceContext(workspaceId) before querying..."
- [ ] Errors logged with stack traces for debugging

**Not acceptable**:
- [ ] Silent failures (queries succeed without workspace context)
- [ ] Unclear error messages
- [ ] App crashes without error messages

---

## Pre-Production Sign-Off

### Conditions for Production Enablement

Before enabling `PRISMA_WORKSPACE_SCOPING_ENABLED=true` in production:

- [ ] **Staging validation complete**: All tests pass in staging
- [ ] **No critical errors**: All endpoints work correctly
- [ ] **Error handling verified**: Unscoped queries fail with clear errors
- [ ] **Multi-workspace tested**: Switching works correctly
- [ ] **Loopbrain tested**: Works with workspace context
- [ ] **Background jobs verified**: Cron jobs use `prismaUnscoped` (not affected)
- [ ] **Rollback plan ready**: Can disable flag immediately if needed
- [ ] **Monitoring in place**: Error tracking configured

### Documentation Links

- [ ] **Read**: `docs/MULTI_TENANT_HARDENING.md` - Security and architecture
- [ ] **Read**: `docs/MULTI_WORKSPACE_UX.md` - UX behavior
- [ ] **Read**: `docs/MULTI_WORKSPACE_TEST_RUNBOOK.md` - Manual test procedures
- [ ] **Read**: `docs/PRISMA_SCOPING_FEATURE_FLAG.md` - Scoping flag details

---

## Post-Deploy Checks in Production

### Step 1: Enable Flag

- [ ] **Set**: `PRISMA_WORKSPACE_SCOPING_ENABLED=true` in production
- [ ] **Deploy**: Restart application
- [ ] **Monitor**: Watch logs for startup errors

### Step 2: Smoke Test Sequence

Run these checks immediately after deployment:

- [ ] **Check logs**: `✅ Workspace scoping ENABLED` appears
- [ ] **Test**: `GET /api/workspaces` → returns workspaces
- [ ] **Test**: `GET /api/projects` → returns projects
- [ ] **Test**: `GET /api/wiki/pages` → returns wiki pages
- [ ] **Test**: Single-workspace user can login and navigate
- [ ] **Test**: Multi-workspace user can switch workspaces
- [ ] **Monitor**: Error tracking for 15 minutes

### Step 3: Monitor for Issues

- [ ] **Watch error logs**: Look for "workspace context" errors
- [ ] **Check user reports**: Monitor support channels
- [ ] **Verify**: No increase in error rates
- [ ] **Confirm**: All critical endpoints working

### Step 4: Rollback (If Needed)

If issues arise:

- [ ] **Disable flag**: Set `PRISMA_WORKSPACE_SCOPING_ENABLED=false`
- [ ] **Restart**: Application restarts with unscoped client
- [ ] **Verify**: App returns to previous behavior
- [ ] **Note**: No database migrations needed (code-only change)

**Rollback time**: < 5 minutes (environment variable change + restart)

---

## Troubleshooting

### Issue: "Workspace scoping enabled but no workspace context set"

**Cause**: Query attempted without `setWorkspaceContext()`

**Fix**: Add `setWorkspaceContext(auth.workspaceId)` before query

**Location**: Check API route that threw error

### Issue: Queries still work without setWorkspaceContext

**Cause**: Flag not actually enabled or using `prismaUnscoped`

**Fix**: 
- Verify `PRISMA_WORKSPACE_SCOPING_ENABLED=true`
- Check import: should use `prisma` (not `prismaUnscoped`)

### Issue: Background job fails

**Cause**: Background job using scoped `prisma` instead of `prismaUnscoped`

**Fix**: Update script to import `prismaUnscoped` from `@/lib/db`

---

## Related Documentation

- `docs/MULTI_TENANT_HARDENING.md` - Multi-tenant security architecture
- `docs/MULTI_WORKSPACE_UX.md` - User experience documentation
- `docs/MULTI_WORKSPACE_TEST_RUNBOOK.md` - Manual test procedures
- `docs/PRISMA_SCOPING_FEATURE_FLAG.md` - Scoping flag technical details
