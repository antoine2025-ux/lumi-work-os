# Dev Mode Authentication Troubleshooting Guide

## Issue: OAuth Flow Stops at Authorization Screen

When the Google OAuth consent screen appears but clicking "Allow" doesn't redirect back to the app, it's usually a **redirect URI mismatch** issue.

## Quick Diagnostic

Run the diagnostic script:
```bash
node scripts/check-auth-config.js
```

## Common Causes & Solutions

### 1. Redirect URI Not Configured in Google Cloud Console ⚠️ MOST COMMON

**Symptom:** Authorization screen appears, but clicking "Allow" shows an error or doesn't redirect.

**Solution:**
1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID (the one matching your `GOOGLE_CLIENT_ID`)
3. Under **"Authorized redirect URIs"**, verify you have:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. **Important:** The URI must match EXACTLY:
   - ✅ `http://localhost:3000/api/auth/callback/google` (correct)
   - ❌ `http://localhost:3000/api/auth/callback/google/` (trailing slash)
   - ❌ `https://localhost:3000/api/auth/callback/google` (https instead of http)
   - ❌ `http://127.0.0.1:3000/api/auth/callback/google` (127.0.0.1 instead of localhost)

5. Click **"Save"** after adding/updating

### 2. Environment Variables Not Loaded

**Check:**
```bash
# Verify .env.local exists and has correct values
cat .env.local | grep -E "NEXTAUTH_URL|GOOGLE_CLIENT"
```

**Solution:**
- Create `.env.local` if it doesn't exist (Next.js loads this first)
- Copy values from `.env` to `.env.local` if needed
- **Restart your dev server** after updating environment variables

### 3. Wrong NEXTAUTH_URL

**Check:**
```bash
# Should be http://localhost:3000 for dev
echo $NEXTAUTH_URL
```

**Solution:**
In `.env.local`:
```env
NEXTAUTH_URL=http://localhost:3000
```

**Important:** 
- Don't use `https://` for localhost (unless using ngrok)
- Don't include trailing slash
- Must match the port your dev server is running on

### 4. Dev Server Not Running or Wrong Port

**Check:**
```bash
# Check if something is running on port 3000
lsof -ti:3000
```

**Solution:**
- Start dev server: `npm run dev`
- Verify it's running on port 3000 (check terminal output)
- If using a different port, update `NEXTAUTH_URL` and Google Console redirect URI

### 5. Browser Cache/Cookies

**Symptom:** Old OAuth state causing issues.

**Solution:**
1. Clear browser cookies for `localhost:3000`
2. Clear browser cache
3. Try incognito/private window
4. Clear NextAuth cookies:
   ```javascript
   // In browser console
   document.cookie.split(";").forEach(c => {
     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   ```

### 6. Google OAuth App Not Published

**Symptom:** "This app isn't verified" warning, or OAuth fails for non-test users.

**Solution:**
1. Go to [Google Cloud Console - OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. For development, add test users:
   - Click **"Test users"** tab
   - Click **"+ ADD USERS"**
   - Add your email address (`am@loopwell.io`)
3. For production, you'll need to publish the app (requires verification)

### 7. Database Connection Issues

**Symptom:** OAuth succeeds but user creation fails.

**Check logs:**
```bash
# Look for database errors in dev server logs
# Should see: "✅ User created/updated successfully"
```

**Solution:**
- Verify `DATABASE_URL` is set correctly
- Check database is running and accessible
- Verify Prisma migrations are up to date: `npx prisma migrate dev`

## Step-by-Step Verification

### Step 1: Verify Environment Variables
```bash
node scripts/check-auth-config.js
```

Should show all ✅ green checks.

### Step 2: Verify Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID (matches `GOOGLE_CLIENT_ID` from `.env`)
3. Check **"Authorized redirect URIs"** includes:
   ```
   http://localhost:3000/api/auth/callback/google
   ```

### Step 3: Verify Dev Server
```bash
# Start dev server
npm run dev

# Should see:
# - Ready on http://localhost:3000
# - No errors about missing env vars
```

### Step 4: Test OAuth Flow
1. Go to: http://localhost:3000/login
2. Click "Continue with Google"
3. Should redirect to Google consent screen
4. After clicking "Allow", should redirect back to app

### Step 5: Check Browser Console
Open browser DevTools (F12) → Console tab
- Look for any errors
- Should see logs like: `🔐 Creating/updating user: ...`

### Step 6: Check Server Logs
In your terminal running `npm run dev`:
- Should see: `🔐 Creating/updating user: am@loopwell.io`
- Should see: `✅ User created/updated successfully: ...`
- Look for any error messages

## Expected OAuth Flow

```
1. User clicks "Continue with Google"
   ↓
2. Redirects to: https://accounts.google.com/o/oauth2/v2/auth?...
   ↓
3. User sees consent screen (where you're stuck)
   ↓
4. User clicks "Allow"
   ↓
5. Google redirects to: http://localhost:3000/api/auth/callback/google?code=...&state=...
   ↓
6. NextAuth processes callback
   ↓
7. User created/updated in database
   ↓
8. Redirects to: /home (or callbackUrl)
```

## Debugging Tips

### Enable Verbose Logging
In `src/lib/auth.ts`, you should already see console logs. If not, check:
- `console.log('🔐 Creating/updating user:', user.email)`
- `console.log('✅ User created/updated successfully:', dbUser.id)`

### Check Network Tab
1. Open browser DevTools → Network tab
2. Try OAuth flow
3. Look for request to `/api/auth/callback/google`
4. Check response status (should be 200 or 302 redirect)

### Test Callback URL Directly
After starting OAuth, check the URL Google redirects to. It should be:
```
http://localhost:3000/api/auth/callback/google?code=...&state=...
```

If it's different, that's the problem - Google Console redirect URI doesn't match.

## Quick Fix Checklist

- [ ] `.env.local` exists with correct values
- [ ] `NEXTAUTH_URL=http://localhost:3000` (no trailing slash, http not https)
- [ ] Google Cloud Console has redirect URI: `http://localhost:3000/api/auth/callback/google`
- [ ] Dev server restarted after env changes
- [ ] Browser cookies cleared
- [ ] Test user added in Google OAuth consent screen
- [ ] Database is running and accessible
- [ ] No errors in browser console
- [ ] No errors in server logs

## Still Not Working?

1. **Check exact error message** in browser console or server logs
2. **Verify redirect URI** - copy the exact URL from Google's redirect and compare
3. **Try incognito mode** - rules out browser cache issues
4. **Check NextAuth version** - ensure compatible version
5. **Review server logs** - look for any error messages during callback

## Contact Points

If issue persists:
- Check server logs for specific error messages
- Verify all environment variables are loaded (run diagnostic script)
- Ensure Google Cloud Console redirect URI matches exactly
