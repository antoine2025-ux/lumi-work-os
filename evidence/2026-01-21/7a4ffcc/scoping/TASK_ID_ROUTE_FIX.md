# CRITICAL FIX: src/app/api/tasks/[id]/route.ts

**Date:** 2026-01-21  
**Commit:** 7a4ffcc  
**Severity:** CRITICAL → RESOLVED

## Problem

The route `src/app/api/tasks/[id]/route.ts` had:

1. **No authentication** - No `getUnifiedAuth()` or session check
2. **No workspace validation** - No `assertAccess()` call
3. **No workspace scoping** - Queries used only `id`, not `workspaceId`
4. **Duplicate Prisma client** - Created own `new PrismaClient()` instead of using consolidated client

**Risk:** Anyone with a task ID could GET, PUT, or DELETE any task in the system regardless of workspace membership.

## Fix Applied

### 1. Replaced Prisma Client

Before:
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

After:
```typescript
import { prisma } from '@/lib/db'
```

### 2. Added Authentication

Added to each handler (GET, PUT, DELETE):
```typescript
const auth = await getUnifiedAuth(request)
```

### 3. Added Workspace Access Check

```typescript
await assertAccess({
  userId: auth.user.userId,
  workspaceId: auth.workspaceId,
  scope: 'workspace',
  requireRole: ['VIEWER'] // or ['MEMBER'] for write ops
})
```

### 4. Constrained Queries with workspaceId

Before:
```typescript
const task = await prisma.task.findUnique({
  where: { id: taskId }
})
```

After:
```typescript
const task = await prisma.task.findFirst({
  where: { 
    id: taskId,
    workspaceId: auth.workspaceId
  }
})
```

### 5. Proper Error Responses

- 401 Unauthorized - if not authenticated
- 403 Forbidden - if not workspace member
- 404 Not Found - if task doesn't exist in this workspace

## Verification

### Build Status
```
✅ npm run build - PASS (exit code 0)
```

### Error Handling
- Unauthenticated requests → 401
- Unauthorized workspace access → 403
- Task not in workspace → 404

## Files Changed

- `src/app/api/tasks/[id]/route.ts` - Complete rewrite with auth + scoping

## Methods Protected

| Method | Auth | Access Check | Workspace Scoped |
|--------|------|--------------|------------------|
| GET | ✅ | VIEWER | ✅ |
| PUT | ✅ | MEMBER | ✅ |
| DELETE | ✅ | MEMBER | ✅ |
