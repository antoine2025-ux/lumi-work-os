# 🚀 Production Migration Plan

## Current State: Development Bypasses Everywhere
- **41 files** contain development authentication bypasses
- Hardcoded user IDs (`dev-user-1`) scattered throughout
- Inconsistent authentication patterns
- No permission checks in most APIs

## Target State: Unified Production-Ready Auth
- Single authentication system (`unified-auth.ts`)
- Automatic environment detection
- Built-in permission system
- Zero code changes needed for production

## Migration Strategy

### Phase 1: Core APIs (High Priority)
```bash
# These APIs are used by the org feature
src/app/api/role-cards/route.ts ✅ DONE
src/app/api/org/positions/route.ts
src/app/api/org/audit/route.ts
src/app/api/admin/users/route.ts
src/app/api/workspaces/[workspaceId]/user-role/route.ts
```

### Phase 2: Project Management APIs
```bash
src/app/api/projects/route.ts
src/app/api/tasks/route.ts
src/app/api/project-templates/route.ts
src/app/api/task-templates/[id]/apply/route.ts
```

### Phase 3: AI & Assistant APIs
```bash
src/app/api/assistant/route.ts
src/app/api/assistant/sessions/[id]/route.ts
src/app/api/assistant/create-project/route.ts
```

### Phase 4: Utility APIs
```bash
src/app/api/feature-flags/route.ts
src/app/api/health/route.ts
src/app/api/workspaces/route.ts
```

## Implementation Pattern

### Before (Development Bypass):
```typescript
export async function POST(request: NextRequest) {
  try {
    const session = { user: { id: 'dev-user-1' } } // ❌ Hardcoded
    
    const roleCard = await prisma.roleCard.create({
      data: {
        createdById: session.user.id // ❌ No validation
      }
    })
    
    return NextResponse.json({ roleCard })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### After (Unified Auth):
```typescript
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request) // ✅ Unified
    
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canWrite = await hasPermission(authContext.user.id, workspaceId, 'WRITE')
    if (!canWrite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const roleCard = await prisma.roleCard.create({
      data: {
        createdById: authContext.user.id // ✅ Validated
      }
    })
    
    return NextResponse.json({ roleCard })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

## Benefits of This Approach

### 1. **No More "Back and Forth"**
- Authentication works consistently
- No more foreign key constraint errors
- No more intermittent failures

### 2. **Production Ready from Day 1**
- Same code works in dev and production
- Just change environment variables
- No massive refactoring needed

### 3. **Built-in Security**
- Permission checks on every API
- Proper error handling
- Audit trail ready

### 4. **Maintainable**
- Single source of truth for auth
- Easy to add new permission levels
- Consistent error responses

## Environment Variables

### Development:
```bash
ALLOW_DEV_LOGIN="true"
NODE_ENV="development"
```

### Production:
```bash
ALLOW_DEV_LOGIN="false"  # or remove entirely
NODE_ENV="production"
NEXTAUTH_SECRET="your-production-secret"
```

## Rollout Plan

1. **Week 1**: Migrate core org APIs (5 files)
2. **Week 2**: Migrate project management APIs (8 files)
3. **Week 3**: Migrate AI/assistant APIs (6 files)
4. **Week 4**: Migrate utility APIs (4 files)
5. **Week 5**: Remove old dev-auth files and cleanup

## Testing Strategy

### Development Testing:
- All APIs work with `ALLOW_DEV_LOGIN="true"`
- Permission checks work correctly
- Error handling is consistent

### Production Testing:
- Set `ALLOW_DEV_LOGIN="false"`
- Test with real NextAuth sessions
- Verify permission enforcement
- Test error scenarios

## Success Metrics

- ✅ Zero hardcoded user IDs
- ✅ Consistent authentication across all APIs
- ✅ Proper permission checks everywhere
- ✅ Same code works in dev and production
- ✅ No more authentication-related bugs

## Next Steps

1. **Start with Phase 1** (core org APIs)
2. **Test thoroughly** in development
3. **Gradually migrate** other APIs
4. **Remove old dev-auth files** when done
5. **Deploy to production** with confidence

This approach eliminates the "back and forth" problem and ensures a smooth transition to production.
