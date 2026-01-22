# Workspace Scoping Audit

**Purpose:** Identify which API routes are workspace-scoped and which are not  
**Status:** ⚠️ **PARTIAL** - Analysis started, full audit needed

---

## Scoping Enforcement Status

**Current State:**
- **Middleware:** Disabled (`PRISMA_WORKSPACE_SCOPING_ENABLED=false`)
- **Manual Filtering:** Required on all workspace-scoped queries
- **Pattern:** `where: { workspaceId: auth.workspaceId }`

---

## API Route Scoping Status

### ✅ Fully Scoped Routes

Routes that:
1. Call `getUnifiedAuth(request)` ✅
2. Call `assertAccess()` ✅
3. Filter queries with `workspaceId: auth.workspaceId` ✅

| Route | Method | Status | Notes |
|-------|--------|--------|-------|
| `/api/tasks` | GET, POST | ✅ Scoped | Uses `auth.workspaceId` in queries |
| `/api/projects` | GET, POST | ✅ Scoped | Uses `auth.workspaceId` in queries |
| `/api/wiki/pages` | GET, POST | ✅ Scoped | Uses `auth.workspaceId` in queries |
| `/api/org/track` | POST | ✅ Scoped | Sets `workspaceId` in create |

---

### ⚠️ Partially Scoped Routes

Routes that:
1. Call `getUnifiedAuth()` ✅
2. Call `assertAccess()` ✅
3. ⚠️ May have some queries without workspaceId filter

| Route | Method | Status | Risk | Notes |
|-------|--------|--------|------|-------|
| `/api/org/views` | POST | ⚠️ Partial | Medium | Uses `workspaceId` in upsert, but need to verify all queries |
| `/api/org/fix-events` | GET, POST | ⚠️ Partial | Medium | Uses `orgId` (may be workspaceId), need to verify |
| `/api/todos` | GET, POST | ⚠️ Partial | Medium | Need to verify all queries |

---

### ❌ Unscoped Routes (High Risk)

Routes that:
1. ❌ Don't call `getUnifiedAuth()`
2. ❌ Don't filter by workspaceId
3. ❌ Write data without workspace context

**Status:** ⚠️ **AUDIT IN PROGRESS** - Need to check all 339 API routes

---

## Write Operations Audit

### Routes with Create Operations

**Pattern to Check:**
```typescript
prisma.model.create({
  data: {
    // Must include workspaceId
    workspaceId: auth.workspaceId,
    // ... other fields
  }
})
```

**Routes Found (30 files with create/update/delete):**
- `/api/projects` - ✅ Scoped
- `/api/tasks` - ✅ Scoped
- `/api/wiki/pages` - ✅ Scoped
- `/api/todos` - ⚠️ Need to verify
- `/api/org/track` - ✅ Scoped
- `/api/org/views` - ⚠️ Partial
- `/api/workspaces` - ⚠️ Special case (creates workspace)
- `/api/invites/[token]/accept` - ⚠️ Special case (creates membership)

---

## Read Operations Audit

### Routes with FindMany Operations

**Pattern to Check:**
```typescript
prisma.model.findMany({
  where: {
    workspaceId: auth.workspaceId, // Must be present
    // ... other filters
  }
})
```

**Status:** ⚠️ **AUDIT IN PROGRESS** - Need to check all findMany queries

---

## Risk Assessment

### High Risk Routes

Routes that write data without workspaceId:

**Status:** ⚠️ **AUDIT IN PROGRESS**

**Action Required:**
1. Run audit script: `npx tsx scripts/audit-workspace-scoping.ts`
2. Review findings
3. Fix missing workspaceId filters
4. Re-run audit to verify

---

## Re-enablement Plan

### Phase 1: Complete Audit

1. Run audit script
2. Review all findings
3. Fix missing workspaceId filters
4. Verify fixes

### Phase 2: Enable Scoping

1. Set `PRISMA_WORKSPACE_SCOPING_ENABLED=true` in development
2. Test all API routes
3. Fix any errors (missing `setWorkspaceContext()`)
4. Enable in production

### Phase 3: Verification

1. Monitor logs for workspace context errors
2. Verify no data leaks
3. Document any edge cases

---

## Commands to Execute

```bash
# 1. Run audit script
npx tsx scripts/audit-workspace-scoping.ts > workspace-scoping-audit-results.txt

# 2. Review results
cat workspace-scoping-audit-results.txt

# 3. Check specific routes
grep -r "prisma\." src/app/api/projects/route.ts | grep -v "workspaceId"

# 4. Count routes with write operations
grep -r "\.create\|\.update\|\.delete" src/app/api --include="*.ts" | wc -l
```

---

## Verification Results

| Check | Status | Evidence |
|-------|--------|----------|
| Audit script run | ❌ Not Run | - |
| Write operations scoped | ⚠️ Partial | Manual review only |
| Read operations scoped | ⚠️ Partial | Manual review only |
| High-risk routes identified | ⚠️ Partial | - |
| Re-enablement ready | ❌ No | Audit incomplete |

---

**Status:** ⚠️ **AUDIT IN PROGRESS - EXECUTION REQUIRED**
