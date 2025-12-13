# Deep Debug: OAuth Authorization Screen Issue

## Problem
OAuth flow stops at Google authorization screen after clicking "Allow". Redirect URI is correctly configured.

## Enhanced Debugging Steps

### Step 1: Check What Happens After Clicking "Allow"

**Critical Question:** Does the browser redirect at all after clicking "Allow"?

1. **If it redirects:**
   - What URL does it go to?
   - Does it show an error page?
   - Does it redirect back to `/login`?
   - Does it show a blank page?

2. **If it doesn't redirect:**
   - Does it stay on Google's page?
   - Does it show an error message?
   - Check browser console for JavaScript errors

### Step 2: Check Browser Console (Critical)

1. Open DevTools (F12) → Console tab
2. **Before** clicking "Continue with Google", clear the console
3. Click "Continue with Google"
4. Wait for Google consent screen
5. Click "Allow"
6. **Immediately check console** for:
   - CORS errors
   - Network errors
   - Cookie errors
   - JavaScript errors
   - Any red error messages

**Copy all console output** - this is critical for diagnosis.

### Step 3: Check Network Tab (Critical)

1. Open DevTools (F12) → Network tab
2. **Clear network log**
3. Click "Continue with Google"
4. Click "Allow" on consent screen
5. Look for request to: `/api/auth/callback/google`
6. **Click on that request** and check:
   - **Status Code** (should be 200, 302, or 307)
   - **Request URL** (should include `code=` and `state=` parameters)
   - **Response Headers** → Look for `Set-Cookie` headers
   - **Response Body** (if any)
   - **Redirect location** (if status is 302/307)

**Screenshot or copy the request details** - this shows what's happening.

### Step 4: Check Server Logs (Critical)

In your terminal running `npm run dev`, look for:

**Expected logs:**
```
🔐 [NextAuth] signIn callback triggered { provider: 'google', ... }
🔐 [NextAuth] Creating/updating user: am@loopwell.io
✅ [NextAuth] User created/updated successfully: user-123
```

**If you see errors:**
- Database connection errors
- Prisma errors
- Any error messages

**Copy all server logs** from the moment you click "Allow" until the redirect (or lack thereof).

### Step 5: Check Cookies After Callback

1. After clicking "Allow" and being redirected (or not)
2. Open DevTools → Application tab → Cookies → `http://localhost:3000`
3. Look for cookies starting with `next-auth.`:
   - `next-auth.session-token` (most important)
   - `next-auth.csrf-token`
   - `next-auth.callback-url`

**If these cookies are missing:**
- Session isn't being created
- This is likely the root cause

### Step 6: Test Database Connection

The signIn callback tries to create/update user in database. If database is down, auth might fail.

```bash
# Test database connection
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({ take: 1 })
  .then(() => console.log('✅ Database connection works'))
  .catch(err => console.error('❌ Database error:', err.message))
  .finally(() => prisma.$disconnect());
"
```

### Step 7: Check for Multiple Dev Servers

You might have multiple Next.js processes running, causing conflicts:

```bash
# Check what's running on port 3000
lsof -ti:3000

# Kill all Next.js processes
pkill -f "next dev"
pkill -f "next-server"

# Restart fresh
npm run dev
```

### Step 8: Test Callback Endpoint Directly

Try accessing the callback with a test error to see if the route works:

```
http://localhost:3000/api/auth/callback/google?error=test
```

This should redirect you (even if with an error). If it doesn't respond, the route might not be working.

### Step 9: Check Prompt Parameter

Your auth config uses `prompt: 'consent select_account'` which forces Google to show consent screen every time.

**Try temporarily changing it** to see if that's the issue:

In `src/lib/auth.ts`, change:
```typescript
prompt: 'consent select_account',
```

To:
```typescript
prompt: 'select_account', // Only show account picker, use cached consent
```

Or remove the prompt entirely:
```typescript
// prompt: 'consent select_account', // Commented out
```

Then restart dev server and try again.

### Step 10: Check NEXTAUTH_SECRET

NextAuth needs `NEXTAUTH_SECRET` to encrypt session tokens. If it's missing or changed, sessions won't work.

```bash
# Check if it's set
node -e "console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET (' + process.env.NEXTAUTH_SECRET.length + ' chars)' : 'NOT SET')"
```

## Most Likely Causes (When Redirect URI is Correct)

1. **Database connection failure** - User creation fails silently
2. **Cookies not being set** - Browser blocking, CORS, SameSite issues
3. **Session token encryption failing** - NEXTAUTH_SECRET issue
4. **Browser blocking cookies** - Privacy settings, extensions
5. **Multiple dev servers** - Port conflicts
6. **Prompt parameter** - Forcing consent every time might cause issues

## What to Provide for Further Help

If you're still stuck, provide:

1. **What happens when you click "Allow":**
   - Does it redirect? Where?
   - Screenshot of what you see

2. **Browser Console Output:**
   - Copy/paste all console messages (errors and warnings)

3. **Network Tab Details:**
   - Screenshot or details of `/api/auth/callback/google` request
   - Status code, headers, response

4. **Server Logs:**
   - Copy/paste logs from the moment you click "Allow"
   - Especially look for `[NextAuth]` prefixed logs

5. **Cookies Present:**
   - List all cookies for `localhost:3000` after callback attempt

6. **Database Connection Test:**
   - Result of Step 6 above

## Quick Test: Try Incognito Mode

Sometimes browser extensions or cached data cause issues:

1. Open incognito/private window
2. Go to `http://localhost:3000/login`
3. Try OAuth flow
4. If it works in incognito, it's a browser cache/extension issue
