# 🔧 Authentication System Migration Guide

## Overview

This guide documents the migration from multiple conflicting authentication systems to a unified, production-ready authentication system.

## What Was Fixed

### 1. **Unified Authentication System**
- **Before**: 4 different auth methods (`getAuthenticatedUser`, `getAuthUser`, `requireDevAuth`, `auth-utils`)
- **After**: Single `getUnifiedAuth()` function that handles both development and production

### 2. **Removed Hardcoded Values**
- **Before**: Hardcoded workspace ID `cmgl0f0wa00038otlodbw5jhn` in 22+ files
- **Before**: Hardcoded user ID `dev-user-1` scattered throughout
- **After**: Dynamic workspace resolution with proper validation

### 3. **Consistent Workspace Context**
- **Before**: Different APIs resolved workspaces differently
- **After**: All APIs use the same workspace resolution logic

### 4. **Frontend-Backend Consistency**
- **Before**: Frontend used `simple-auth`, backend used various methods
- **After**: Both frontend and backend use unified auth system

## Key Changes Made

### New Files Created
- `src/lib/unified-auth.ts` - Central authentication system
- `scripts/production-safety-check.sh` - Production validation script

### Files Updated
- `src/lib/permissions.ts` - Now uses unified auth
- `src/lib/auth/assertAccess.ts` - Updated imports
- `src/app/api/tasks/route.ts` - Uses unified auth
- `src/app/api/projects/route.ts` - Uses unified auth
- `src/app/api/workspaces/route.ts` - Uses unified auth
- `src/app/api/auth/user-status/route.ts` - Uses unified auth
- `src/components/auth-wrapper.tsx` - Updated comments
- `src/lib/dev-config.ts` - Removed hardcoded values
- `src/lib/prisma/scopingMiddleware.ts` - Updated imports and validation
- `eslint-rules/no-hardcoded-ids.js` - Removed hardcoded workspace ID
- `env.template` - Updated development configuration

## How to Use the New System

### For API Routes
```typescript
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

export async function GET(request: NextRequest) {
  try {
    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    // 4. Your API logic here...
    
  } catch (error) {
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

### For Frontend Components
```typescript
// The auth wrapper automatically handles authentication
// No changes needed for existing components
```

## Environment Configuration

### Development
```bash
# Enable development bypasses
ALLOW_DEV_LOGIN="true"
PROD_LOCK="false"

# Optional: Customize dev user
DEV_USER_EMAIL="dev@lumi.local"
DEV_USER_NAME="Development User"
```

### Production
```bash
# Disable development bypasses
ALLOW_DEV_LOGIN="false"
PROD_LOCK="true"
```

## Migration Checklist

### ✅ Completed
- [x] Created unified authentication system
- [x] Updated core API endpoints (tasks, projects, workspaces)
- [x] Updated frontend auth wrapper
- [x] Removed hardcoded development values
- [x] Updated permission system
- [x] Updated workspace context management
- [x] Added production safety checks
- [x] Updated ESLint rules

### 🔄 Remaining Tasks
- [ ] Update remaining API endpoints to use unified auth
- [ ] Update frontend components that use old auth methods
- [ ] Test workspace creation and feature access
- [ ] Run production safety checks
- [ ] Deploy to staging for testing

## Testing the Migration

### 1. Run Production Safety Checks
```bash
./scripts/production-safety-check.sh
```

### 2. Test Authentication Flow
1. Start the development server
2. Try to access protected routes
3. Verify workspace creation works
4. Test feature access (tasks, projects, etc.)

### 3. Test Development Mode
1. Set `ALLOW_DEV_LOGIN="true"`
2. Verify dev user is created automatically
3. Test workspace creation

### 4. Test Production Mode
1. Set `ALLOW_DEV_LOGIN="false"` and `PROD_LOCK="true"`
2. Verify proper authentication is required
3. Test workspace creation with real user

## Troubleshooting

### Common Issues

1. **"Unauthorized: No session found"**
   - Check if user is properly logged in
   - Verify NextAuth configuration
   - Check environment variables

2. **"Workspace not found"**
   - Verify workspace exists in database
   - Check user's workspace membership
   - Ensure proper workspace context is set

3. **"Forbidden: Insufficient permissions"**
   - Check user's role in workspace
   - Verify permission requirements
   - Ensure proper role assignment

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG="lumi:auth"
```

## Benefits of the New System

1. **Consistency**: All APIs use the same authentication logic
2. **Security**: Proper workspace scoping and permission checks
3. **Maintainability**: Single source of truth for authentication
4. **Production Ready**: No hardcoded values or dev bypasses
5. **Flexibility**: Easy to extend with new features
6. **Testing**: Clear separation between dev and production modes

## Next Steps

1. **Complete Migration**: Update remaining API endpoints
2. **Testing**: Comprehensive testing of all features
3. **Documentation**: Update API documentation
4. **Deployment**: Deploy to staging and production
5. **Monitoring**: Set up monitoring for auth-related issues

The unified authentication system provides a solid foundation for building a fully functional workspace management system that works consistently across all features.
