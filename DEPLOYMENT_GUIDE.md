# Deployment Guide for Loopwell.io

This guide covers deploying Loopwell to `loopwell.io` with the landing page as the homepage and proper workspace creation flow.

## Current Flow

1. **Root (`/`)**: Shows landing page (via re-export from `/landing`)
2. **Landing Page**: Users see the marketing page with Sign In/Sign Up buttons
3. **Login (`/login`)**: Google OAuth sign-in
4. **Workspace Creation (`/welcome`)**: First-time users create workspace
5. **Dashboard (`/home`)**: Main application for authenticated users

## Deployment Steps

### 1. Update Root Route

The root route (`src/app/page.tsx`) now re-exports the landing page, so `loopwell.io` will show the landing page.

### 2. Environment Variables

Set these environment variables in your deployment platform:

#### Required Variables

```bash
# Database
DATABASE_URL="your-postgres-connection-string"

# NextAuth
NEXTAUTH_URL="https://loopwell.io"
NEXTAUTH_SECRET="your-nextauth-secret" # Generate with: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# App URL (for redirects)
NEXT_PUBLIC_APP_URL="https://loopwell.io"
```

#### Optional Variables

```bash
# Sentry (if using)
SENTRY_DSN="your-sentry-dsn"

# Analytics
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://loopwell.io/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local dev)

### 4. Database Setup

Ensure your PostgreSQL database is:
- Accessible from your deployment platform
- Has all migrations applied
- Has proper indexes for performance

### 5. Deployment Platform Options

#### Option A: Vercel (Recommended - Easiest)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Deploy
   vercel
   ```

2. **Or use Vercel Dashboard**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub/GitLab repository
   - Add environment variables
   - Deploy

3. **Configure Domain**
   - Go to Project Settings → Domains
   - Add `loopwell.io` and `www.loopwell.io`
   - Configure DNS as instructed by Vercel

4. **Production Deployment**
   ```bash
   vercel --prod
   ```

#### Option B: AWS (More Control)

1. **Using AWS Amplify**
   - Connect GitHub repository
   - Configure build settings (Next.js preset)
   - Add environment variables
   - Connect custom domain

2. **Using EC2/ECS**
   - Build Docker image
   - Deploy to ECS or run on EC2
   - Use ALB for load balancing
   - Configure Route53 for domain

#### Option C: Railway/Render

1. **Railway**
   - Connect repository
   - Add PostgreSQL service
   - Set environment variables
   - Deploy

2. **Render**
   - Create new Web Service
   - Connect repository
   - Add PostgreSQL database
   - Set environment variables
   - Deploy

### 6. Domain Configuration

1. **DNS Settings** (for loopwell.io)
   ```
   Type: A
   Name: @
   Value: [Your deployment IP or CNAME]
   
   Type: CNAME
   Name: www
   Value: loopwell.io
   ```

2. **SSL Certificate**
   - Most platforms (Vercel, Railway, Render) provide SSL automatically
   - For custom setups, use Let's Encrypt

### 7. Post-Deployment Checklist

- [ ] Verify landing page loads at `loopwell.io`
- [ ] Test Google OAuth sign-in
- [ ] Verify workspace creation flow works
- [ ] Check database connections
- [ ] Test authenticated routes
- [ ] Verify redirects work correctly
- [ ] Check SSL certificate is active
- [ ] Test on mobile devices
- [ ] Verify analytics (if enabled)

### 8. Monitoring & Maintenance

1. **Set up error tracking** (Sentry recommended)
2. **Monitor database performance**
3. **Set up uptime monitoring** (UptimeRobot, Pingdom)
4. **Configure backups** for database
5. **Set up logging** (Vercel Analytics, CloudWatch, etc.)

## User Flow After Deployment

1. User visits `loopwell.io` → Sees landing page
2. User clicks "Sign Up" → Redirects to `/login`
3. User signs in with Google → OAuth callback
4. **If first-time user** → Redirects to `/welcome` for workspace creation
5. **If existing user** → Redirects to `/home` (dashboard)
6. After workspace creation → Redirects to `/home`

## Testing the Deployment

### Test Checklist

1. **Landing Page**
   - [ ] Loads at `loopwell.io`
   - [ ] Logo displays correctly
   - [ ] Sign In/Sign Up buttons work
   - [ ] Mobile responsive

2. **Authentication**
   - [ ] Google OAuth works
   - [ ] Account selection works (if logged into multiple Google accounts)
   - [ ] Logout works correctly

3. **Workspace Creation**
   - [ ] First-time users see `/welcome`
   - [ ] Workspace creation form works
   - [ ] Redirects to dashboard after creation

4. **Dashboard**
   - [ ] Authenticated users can access `/home`
   - [ ] Navigation works
   - [ ] Features load correctly

## Troubleshooting

### Landing Page Not Showing
- Check that `src/app/page.tsx` re-exports landing page
- Verify no redirect logic interferes
- Check browser console for errors

### OAuth Not Working
- Verify `NEXTAUTH_URL` matches deployment URL
- Check Google OAuth redirect URI matches
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

### Workspace Creation Issues
- Check database connection
- Verify user is created in database after OAuth
- Check `/api/auth/user-status` endpoint
- Review server logs for errors

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is accessible from deployment platform
- Ensure migrations are applied
- Check database connection pooling settings

## Rollback Plan

If deployment fails:

1. **Vercel**: Use deployment history to rollback
2. **Other platforms**: Use previous deployment or git revert
3. **Database**: Keep backups before major deployments

## Security Considerations

1. **Environment Variables**: Never commit secrets
2. **Database**: Use connection pooling, enable SSL
3. **OAuth**: Use secure redirect URIs only
4. **HTTPS**: Always use HTTPS in production
5. **CORS**: Configure properly for API routes
6. **Rate Limiting**: Consider adding rate limits for API routes

## Performance Optimization

1. **Image Optimization**: Next.js handles this automatically
2. **Database**: Add indexes, use connection pooling
3. **Caching**: Configure appropriate cache headers
4. **CDN**: Use platform's CDN (Vercel Edge Network, etc.)
5. **Bundle Size**: Monitor with `@next/bundle-analyzer`

## Next Steps After Deployment

1. Set up monitoring and alerts
2. Configure staging environment for testing
3. Set up CI/CD pipeline
4. Plan for scaling (database, caching, etc.)
5. Document any custom deployment procedures

