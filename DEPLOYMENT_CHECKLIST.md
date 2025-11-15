# Deployment Checklist - Org Chart & User Invitations

## Pre-Deployment Checklist

### ✅ Code Changes Ready
- [x] Org Chart redesign with minimal UI
- [x] Clean slate onboarding flow
- [x] Department, Team, Position, Role Card creation
- [x] User invitation via Supabase Auth
- [x] Role card assignment in user profiles
- [x] Department-based position filtering

### ⚠️ Environment Variables Required in Vercel

Make sure these are set in **Vercel Dashboard → Settings → Environment Variables**:

#### Required Supabase Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://ozpfuynytrnxazwxvrsg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Other Required Variables:
- `DATABASE_URL` (your production database)
- `NEXTAUTH_URL` (your production URL)
- `NEXTAUTH_SECRET`
- Any other existing environment variables

### 📝 New Files Created
- `src/lib/supabase.ts` - Supabase client setup
- `src/app/api/admin/invite/route.ts` - Invite API endpoint
- `src/components/org/invite-user-dialog.tsx` - Invite dialog component
- `src/components/ui/alert.tsx` - Alert component
- `src/components/org/org-clean-slate.tsx` - Clean slate onboarding
- `src/components/org/department-form.tsx` - Department creation
- `src/components/org/team-form.tsx` - Team creation
- `src/components/org/position-form-simple.tsx` - Position creation
- `src/components/org/role-card-form.tsx` - Role card creation
- `src/app/api/org/departments/` - Department API routes
- `src/app/api/org/teams/` - Team API routes

### 🔄 Database Migration
- Make sure Prisma migrations are up to date
- Run migrations on production database if needed

## Deployment Steps

1. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: Add org chart redesign, user invitations via Supabase, and role card system"
   ```

2. **Push to Repository**
   ```bash
   git push origin enhanced-pm-features
   ```

3. **Set Environment Variables in Vercel**
   - Go to Vercel Dashboard
   - Select your project
   - Go to Settings → Environment Variables
   - Add all required Supabase variables
   - Make sure to set them for Production, Preview, and Development environments

4. **Deploy**
   - Vercel will automatically deploy on push
   - Or trigger manual deployment from Vercel dashboard

5. **Verify Deployment**
   - Check build logs for errors
   - Test invite flow in production
   - Verify Supabase integration works

## Post-Deployment Testing

- [ ] Test user invitation flow
- [ ] Verify email invitations are sent
- [ ] Test org chart clean slate flow
- [ ] Test department/team/position creation
- [ ] Test role card assignment
- [ ] Verify user profile updates work

## Rollback Plan

If issues occur:
1. Revert to previous commit
2. Check Vercel build logs
3. Verify environment variables are set correctly
4. Check Supabase dashboard for API errors

