# Slack Integration - Production Deployment Guide

## 🎯 Overview

This guide covers deploying the Slack integration to production. The code already handles production vs development correctly - you just need to configure environment variables and update Slack app settings.

## ✅ What's Already Done

The code automatically handles production:
- ✅ Uses `NEXTAUTH_URL` for redirect URI in production (no need for `SLACK_REDIRECT_URI`)
- ✅ Callback route uses request origin in production (works with any domain)
- ✅ No code changes needed - just configuration

## 📋 Step-by-Step Deployment

### Step 1: Update Slack App Redirect URLs

1. Go to **https://api.slack.com/apps**
2. Select your app
3. Go to **"OAuth & Permissions"** in the sidebar
4. Scroll to **"Redirect URLs"** section
5. **Add your production URL**:
   ```
   https://your-production-domain.com/api/integrations/slack/callback
   ```
   Replace `your-production-domain.com` with your actual domain (e.g., `app.loopwell.io` or `loopwell.io`)
6. **Keep the ngrok URL** (for development) or remove it if you're done with local dev
7. Click **"Save URLs"**

**Example redirect URLs:**
- ✅ `https://app.loopwell.io/api/integrations/slack/callback` (production)
- ✅ `https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/api/integrations/slack/callback` (dev - optional)

### Step 2: Set Production Environment Variables

In your production hosting platform (Vercel, Railway, etc.), add these environment variables:

#### Required Variables

```env
SLACK_CLIENT_ID=9962468526503.10018235041922
SLACK_CLIENT_SECRET=c1c0abb19319a47dfff7c0b356347e55
NEXTAUTH_URL=https://your-production-domain.com
```

**Important Notes:**
- ✅ Use `https://` for production (not `http://`)
- ✅ No trailing slash on `NEXTAUTH_URL`
- ✅ Use your actual production domain
- ❌ **Do NOT set `SLACK_REDIRECT_URI` in production** - let it use the default from `NEXTAUTH_URL`

#### Optional Variables (Only if needed)

```env
# Only set this if you need a different redirect URI than the default
# Otherwise, it will use: ${NEXTAUTH_URL}/api/integrations/slack/callback
# SLACK_REDIRECT_URI="https://your-production-domain.com/api/integrations/slack/callback"
```

### Step 3: Verify Environment Variables

The redirect URI will be automatically constructed as:
```
${NEXTAUTH_URL}/api/integrations/slack/callback
```

So if `NEXTAUTH_URL=https://app.loopwell.io`, the redirect URI will be:
```
https://app.loopwell.io/api/integrations/slack/callback
```

**Make sure this exact URL is in your Slack app's redirect URLs list!**

### Step 4: Deploy to Production

1. **Commit your changes** (if any)
2. **Push to production branch** (usually `main` or `master`)
3. **Deploy via your platform**:
   - **Vercel**: Automatic on push, or manual via dashboard
   - **Railway**: Automatic on push
   - **Other**: Follow your platform's deployment process

### Step 5: Test the Integration

1. **Go to production**: `https://your-production-domain.com/settings?tab=integrations`
2. **Click "Connect Slack"**
3. **Authorize the app** in Slack
4. **Verify redirect**: Should redirect back to production domain (not localhost or ngrok)
5. **Check status**: Should show "Connected" with team name

## 🔍 How It Works in Production

### OAuth Flow

1. User clicks "Connect Slack" → `/api/integrations/slack/connect`
2. Server builds redirect URI: `${NEXTAUTH_URL}/api/integrations/slack/callback`
3. Redirects to Slack with production callback URL
4. User authorizes → Slack redirects to production callback
5. Server exchanges code for tokens
6. Redirects back to: `${production-domain}/settings?tab=integrations&success=slack_connected`

### Code Logic

The code automatically detects production:

**In `connect/route.ts`:**
```typescript
const redirectUri = process.env.SLACK_REDIRECT_URI || 
  `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/slack/callback`
```

**In `callback/route.ts`:**
```typescript
// Production: uses request origin
const redirectBase = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000'
  : request.url.split('/api')[0] // Gets production domain from request
```

## 📝 Environment Variables Summary

### Development (Local)
```env
SLACK_CLIENT_ID=9962468526503.10018235041922
SLACK_CLIENT_SECRET=c1c0abb19319a47dfff7c0b356347e55
SLACK_REDIRECT_URI="https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/api/integrations/slack/callback"
NEXTAUTH_URL=http://localhost:3000
```

### Production
```env
SLACK_CLIENT_ID=9962468526503.10018235041922
SLACK_CLIENT_SECRET=c1c0abb19319a47dfff7c0b356347e55
NEXTAUTH_URL=https://your-production-domain.com
# SLACK_REDIRECT_URI not needed - uses NEXTAUTH_URL automatically
```

## ✅ Checklist

Before deploying, verify:

- [ ] Production redirect URL added to Slack app
- [ ] `SLACK_CLIENT_ID` set in production environment
- [ ] `SLACK_CLIENT_SECRET` set in production environment
- [ ] `NEXTAUTH_URL` set to production domain (with `https://`)
- [ ] `SLACK_REDIRECT_URI` **NOT** set in production (or set to production URL)
- [ ] Code deployed to production
- [ ] Tested OAuth flow in production
- [ ] Verified integration saves correctly

## 🐛 Troubleshooting

### Issue: "invalid_redirect_uri" error

**Cause**: Redirect URL in Slack app doesn't match what's being sent

**Fix**:
1. Check `NEXTAUTH_URL` in production environment variables
2. Verify redirect URL in Slack app matches: `${NEXTAUTH_URL}/api/integrations/slack/callback`
3. Make sure it's exactly the same (including `https://`, no trailing slash)
4. Wait a few minutes after updating Slack app settings (caching)

### Issue: Redirects to localhost after OAuth

**Cause**: `NEXTAUTH_URL` not set correctly in production

**Fix**:
1. Verify `NEXTAUTH_URL` is set to production domain
2. Make sure it uses `https://` not `http://`
3. Restart/redeploy after changing environment variables

### Issue: "Slack integration is not configured"

**Cause**: Environment variables not set in production

**Fix**:
1. Check `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are set
2. Verify they're set for the correct environment (production, not preview)
3. Redeploy after adding variables

### Issue: OAuth works but integration not saved

**Cause**: Database connection or workspace context issue

**Fix**:
1. Check production database connection
2. Verify workspace ID is valid
3. Check server logs for errors
4. Run verification script: `node scripts/verify-slack-integration.js <workspace-id>`

## 🔐 Security Notes

- ✅ **Never commit** `.env` files with secrets
- ✅ Use your hosting platform's environment variable system
- ✅ Rotate secrets if they're ever exposed
- ✅ Use different Slack apps for dev/staging/prod (optional but recommended)

## 📊 Verification

After deployment, verify everything works:

```bash
# Check environment variables (if you have access to production shell)
echo $SLACK_CLIENT_ID
echo $NEXTAUTH_URL

# Or use the verification script (if you can run it in production)
node scripts/verify-slack-integration.js
```

## 🎉 You're Done!

Once you've:
1. ✅ Added production redirect URL to Slack app
2. ✅ Set environment variables in production
3. ✅ Deployed the code
4. ✅ Tested the OAuth flow

The Slack integration is live in production! Users can now connect their Slack workspaces from the production app.
