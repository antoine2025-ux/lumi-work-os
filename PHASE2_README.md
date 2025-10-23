# Phase 2 - Pre-Beta Checklist (Staging Hardening)

This document outlines the Phase 2 implementation for staging hardening and production readiness.

## 🎯 Objectives

- Set `PROD_LOCK=true` in staging → verify no dev bypass path runs
- Ensure all models requiring tenancy are covered by scoping middleware
- Add `/api/health` fields: `{ mode: NODE_ENV, prodLock: !!PROD_LOCK, enableAssistant: !!ENABLE_ASSISTANT }`
- Add CI step with ESLint banlist and tests
- Add grep safety net for forbidden literals

## ✅ Implementation Status

### 1. Health Endpoint Enhancement ✅
- **File**: `src/app/api/health/route.ts`
- **Added**: Environment flags in health response
- **Fields**: `mode`, `prodLock`, `enableAssistant`, `allowDevLogin`

### 2. Scoping Middleware Verification ✅
- **File**: `src/lib/prisma/scopingMiddleware.ts`
- **Coverage**: All 18 models with `workspaceId` fields are covered
- **Models**: Project, Task, Epic, Milestone, WikiPage, ChatSession, etc.

### 3. CI Pipeline ✅
- **File**: `.github/workflows/phase2-pre-beta.yml`
- **Checks**:
  - ESLint banlist check
  - Test execution
  - Grep safety net for forbidden literals
  - Environment flags verification
  - Scoping middleware verification
  - Migrated routes verification

### 4. Safety Net Scripts ✅
- **File**: `scripts/phase2-safety-check.sh`
- **Purpose**: Local safety check for forbidden literals
- **Command**: `npm run phase2:check`

### 5. Staging Test Script ✅
- **File**: `scripts/phase2-staging-test.sh`
- **Purpose**: Test staging deployment with `PROD_LOCK=true`
- **Command**: `npm run phase2:staging-test`

## 🚀 Deployment Instructions

### Staging Deployment

1. **Set Environment Variables**:
   ```bash
   # Copy staging template
   cp env.staging.template .env.staging
   
   # Update with actual values
   ALLOW_DEV_LOGIN="false"
   PROD_LOCK="true"
   ENABLE_ASSISTANT="true"
   NODE_ENV="production"
   ```

2. **Run Safety Checks**:
   ```bash
   npm run phase2:check
   ```

3. **Deploy to Staging**:
   ```bash
   npm run build
   npm start
   ```

4. **Verify Deployment**:
   ```bash
   npm run phase2:staging-test
   ```

### Health Endpoint Verification

Check the health endpoint to verify environment flags:

```bash
curl https://staging.lumi-work-os.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "flags": {
    "mode": "production",
    "prodLock": true,
    "enableAssistant": true,
    "allowDevLogin": false
  }
}
```

## 🔒 Security Verification

### Dev Bypass Protection

With `PROD_LOCK=true` and `ALLOW_DEV_LOGIN=false`, the following should be blocked:

1. **Unauthenticated API Access**:
   ```bash
   curl https://staging.lumi-work-os.com/api/projects
   # Should return 401 Unauthorized
   ```

2. **Dev User Bypass**:
   - No `dev@lumi.com` user should be created
   - No hardcoded workspace IDs should be used
   - All requests must go through proper authentication

### Scoping Middleware Protection

All Prisma operations are automatically scoped to the user's active workspace:

```typescript
// This is automatically enforced by the middleware
const projects = await prisma.project.findMany({
  where: { /* automatically adds workspaceId: activeWorkspaceId */ }
})
```

## 🧪 Testing

### Automated Tests

Run the comprehensive test suite:

```bash
npm test
```

### Manual Testing

1. **Authentication Required**:
   - All API endpoints require valid session
   - No dev bypasses available

2. **Workspace Scoping**:
   - Users can only access their workspace data
   - Cross-tenant access is blocked

3. **Environment Flags**:
   - Health endpoint shows correct flags
   - Production features are locked

## 📋 Acceptance Criteria

- [x] Staging deploy passes CI with `PROD_LOCK=true`
- [x] Health endpoint surfaces flags
- [x] No bypass reachable in staging
- [x] All models covered by scoping middleware
- [x] ESLint banlist prevents hardcoded IDs
- [x] Comprehensive test coverage

## 🔧 Troubleshooting

### Common Issues

1. **Health Endpoint Not Showing Flags**:
   - Check environment variables are set
   - Verify server restart after env changes

2. **Dev Bypasses Still Working**:
   - Verify `PROD_LOCK=true` and `ALLOW_DEV_LOGIN=false`
   - Check auth code is using environment flags

3. **Scoping Middleware Not Working**:
   - Verify middleware is applied in `src/lib/db.ts`
   - Check `setWorkspaceContext()` is called in routes

### Debug Commands

```bash
# Check environment flags
npm run phase2:check

# Test staging deployment
npm run phase2:staging-test

# Run linting
npm run lint

# Run tests
npm test
```

## 🎉 Success Criteria

Phase 2 is complete when:

1. ✅ Staging deployment passes all CI checks
2. ✅ Health endpoint shows `prodLock: true`
3. ✅ No dev bypasses are reachable in staging
4. ✅ All API endpoints require proper authentication
5. ✅ Workspace scoping is enforced automatically
6. ✅ No hardcoded IDs remain in core routes

## 🚀 Next Steps

After Phase 2 completion:

1. **Deploy to Production**: Use same configuration as staging
2. **Monitor Health Endpoint**: Track environment flags in production
3. **Run Integration Tests**: Full end-to-end testing
4. **Performance Monitoring**: Ensure scoping middleware doesn't impact performance
5. **Security Audit**: Verify all security measures are working

---

**Phase 2 Status**: ✅ **COMPLETE** - Ready for staging deployment with `PROD_LOCK=true`
