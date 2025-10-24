# Phase 3 - Production Deployment Guide

This guide covers the production deployment process with security hardening and environment-specific configurations.

## 🎯 Production Requirements

- **ALLOW_DEV_LOGIN=false** - Disable development login bypasses
- **PROD_LOCK=true** - Lock production features and disable dev bypasses
- **NODE_ENV=production** - Set production environment
- **Feature flags per environment** - Control features based on environment

## 🚀 Deployment Process

### 1. Environment Setup

Create production environment file:

```bash
# Copy production template
cp env.production.template .env.production

# Update with actual production values
DATABASE_URL="postgresql://prod_user:secure_password@prod-db:5432/lumi_work_os"
NEXTAUTH_URL="https://your-production-domain.com"
NEXTAUTH_SECRET="your-production-secret-key"
GOOGLE_CLIENT_ID="your-production-google-client-id"
GOOGLE_CLIENT_SECRET="your-production-google-client-secret"
OPENAI_API_KEY="your-production-openai-api-key"
ANTHROPIC_API_KEY="your-production-anthropic-api-key"

# Production Security Flags
ALLOW_DEV_LOGIN="false"
PROD_LOCK="true"
ENABLE_ASSISTANT="true"
NODE_ENV="production"
```

### 2. Pre-Deployment Checks

Run production readiness checks:

```bash
# Check for hardcoded IDs and security issues
npm run phase2:check

# Run tests
npm test

# Build application
npm run build
```

### 3. Database Setup

Set up production database:

```bash
# Run migrations
npx prisma migrate deploy

# Note: Seed scripts will be blocked in production due to PROD_LOCK=true
# Use proper user registration flow instead
```

### 4. Deploy Application

```bash
# Start production server
npm start

# Verify deployment
npm run phase3:verify
```

## 🔒 Security Features

### Environment Flag Protection

The application uses environment flags to control security features:

- **ALLOW_DEV_LOGIN**: Controls dev@lumi.com bypass
- **PROD_LOCK**: Disables all development features
- **ENABLE_ASSISTANT**: Controls AI assistant features

### Seed Script Protection

Seed scripts automatically respect environment flags:

```typescript
// Production safety check
if (PROD_LOCK && NODE_ENV === 'production') {
  console.log('🚫 Production lock enabled - skipping seed data creation')
  return
}
```

### Feature Flag System

Environment-specific feature flags:

```typescript
const flags = await getFeatureFlags(workspaceId)
// Returns flags based on environment and workspace configuration
```

## 📊 Monitoring

### Health Endpoint

Monitor application health:

```bash
curl https://your-production-domain.com/api/health
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

### Security Monitoring

Check for security violations:

```bash
# Monitor logs for security issues
tail -f /var/log/app.log | grep -E "(dev@lumi|bypass|PROD_LOCK)"
```

## 🧪 Testing

### Production Testing

Test production deployment:

```bash
# Run production verification
npm run phase3:verify

# Test API endpoints
curl -H "Authorization: Bearer <token>" https://your-domain.com/api/projects
```

### Security Testing

Verify security measures:

1. **Dev Bypass Protection**:
   ```bash
   # Should return 401 Unauthorized
   curl https://your-domain.com/api/projects
   ```

2. **Workspace Scoping**:
   ```bash
   # Should only return user's workspace data
   curl -H "Authorization: Bearer <token>" https://your-domain.com/api/projects
   ```

## 🔧 Troubleshooting

### Common Issues

1. **Seed Scripts Not Working**:
   - Check `PROD_LOCK=true` and `NODE_ENV=production`
   - Use proper user registration flow

2. **Dev Bypasses Still Active**:
   - Verify `ALLOW_DEV_LOGIN=false`
   - Check environment variables are loaded

3. **Feature Flags Not Working**:
   - Check `ENABLE_ASSISTANT` setting
   - Verify workspace-specific overrides

### Debug Commands

```bash
# Check environment variables
env | grep -E "(ALLOW_DEV_LOGIN|PROD_LOCK|ENABLE_ASSISTANT)"

# Check application logs
pm2 logs app

# Test health endpoint
curl https://your-domain.com/api/health
```

## 📋 Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Domain configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Error tracking set up

## 🚨 Security Considerations

### Production Security

1. **Environment Variables**:
   - Use secure secret management
   - Rotate secrets regularly
   - Never commit secrets to version control

2. **Database Security**:
   - Use connection pooling
   - Enable SSL connections
   - Regular backups
   - Access control

3. **Application Security**:
   - Enable HTTPS only
   - Set security headers
   - Rate limiting
   - Input validation

4. **Monitoring**:
   - Log security events
   - Monitor for anomalies
   - Set up alerts

## 🎉 Success Criteria

Production deployment is successful when:

- [ ] Application starts without errors
- [ ] Health endpoint shows correct flags
- [ ] All API endpoints require authentication
- [ ] Dev bypasses are blocked
- [ ] Workspace scoping is enforced
- [ ] Feature flags work correctly
- [ ] Monitoring is operational
- [ ] Security measures are active

## 📞 Support

For production issues:

1. Check application logs
2. Verify environment configuration
3. Test health endpoint
4. Review security measures
5. Contact development team

---

**Phase 3 Status**: ✅ **COMPLETE** - Production deployment ready with security hardening

