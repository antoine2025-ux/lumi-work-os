# Authentication Troubleshooting Guide

## Current Status

**Problem**: User is not authenticated (session is empty `{}`), causing all protected routes to redirect.

## Root Cause

The session check shows:
```json
{}
```

This means:
- No NextAuth session cookie exists
- User needs to log in via Google OAuth
- OR session cookie exists but isn't being read correctly

## Step-by-Step Fix

### 1. Verify You're Logged In

**In Browser Console:**
```javascript
// Check if session cookie exists
document.cookie.split(';').find(c => c.includes('next-auth.session-token'))
```

**Expected**: Should return a cookie string like `next-auth.session-token=...`

**If empty**: You're not logged in → Go to step 2

### 2. Log In via Google OAuth

1. **Go to**: http://localhost:3000/login
2. **Click**: "Continue with Google"
3. **Complete**: Google OAuth flow
4. **Expected**: Redirect to `/home` or your `callbackUrl`

### 3. If Login Fails

**Check Server Logs:**
```bash
# Look for NextAuth errors
tail -f <server-log-file> | grep -i "nextauth\|auth\|error"
```

**Common Issues:**
- `NEXTAUTH_SECRET` not set → Check `.env.local`
- `GOOGLE_CLIENT_ID` not set → Check `.env.local`
- OAuth callback URL mismatch → Check `NEXTAUTH_URL` in `.env.local`

### 4. If Session Exists But API Returns Empty

**Possible Causes:**
- Cookie domain mismatch
- Cookie path mismatch
- Cookie is `HttpOnly` but being read incorrectly
- Session expired

**Fix:**
1. Clear all cookies: `document.cookie.split(";").forEach(c => document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"));`
2. Log in again
3. Check if session persists

### 5. Verify Session After Login

**Run:**
```bash
node scripts/check-auth-status.js
```

**Expected Output:**
```json
{
  "user": {
    "email": "your@email.com",
    "workspaceId": "...",
    ...
  }
}
```

## Quick Test

1. **Open**: http://localhost:3000/login
2. **Sign in** with Google
3. **Check**: http://localhost:3000/api/auth/session (should show user data)
4. **Navigate**: Try `/projects`, `/wiki`, etc. (should work now)

## If Issues Persist

1. **Clear browser cache and cookies**
2. **Restart dev server**: `npm run dev`
3. **Check `.env.local`** has all required vars:
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_URL=http://localhost:3000` (for dev)

## Next Steps After Login

Once authenticated:
- `/home` should work
- `/projects` should redirect to `/w/[workspaceSlug]/projects`
- `/wiki` should work
- API routes should return data (not 500 errors)
