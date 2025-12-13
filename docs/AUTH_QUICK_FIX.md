# Quick Fix: OAuth Authorization Screen Issue

## The Problem
You see the Google OAuth consent screen, but clicking "Allow" doesn't redirect back to the app.

## Most Likely Cause (95% of cases)
**Redirect URI mismatch in Google Cloud Console**

The redirect URI that NextAuth is sending to Google doesn't match what's configured in Google Cloud Console.

## Quick Fix Steps

### Step 1: Verify Your Environment Variables
```bash
# Run the diagnostic script
node scripts/check-auth-config.js
```

Make sure you see:
- ✅ NEXTAUTH_URL: SET (should be `http://localhost:3000`)
- ✅ GOOGLE_CLIENT_ID: SET
- ✅ GOOGLE_CLIENT_SECRET: SET

### Step 2: Check Google Cloud Console ⚠️ CRITICAL

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Make sure you're in the correct project

2. **Find Your OAuth Client:**
   - Look for the OAuth 2.0 Client ID that matches your `GOOGLE_CLIENT_ID`
   - Your Client ID should look like: `1086815497127-tn2ohvchopi9mso0edc18faie8lhkl5e.apps.googleusercontent.com`

3. **Check Authorized Redirect URIs:**
   - Click on the OAuth Client ID
   - Scroll to **"Authorized redirect URIs"**
   - **MUST HAVE EXACTLY:**
     ```
     http://localhost:3000/api/auth/callback/google
     ```

4. **Common Mistakes to Avoid:**
   - ❌ `http://localhost:3000/api/auth/callback/google/` (trailing slash)
   - ❌ `https://localhost:3000/api/auth/callback/google` (https instead of http)
   - ❌ `http://127.0.0.1:3000/api/auth/callback/google` (127.0.0.1 instead of localhost)
   - ❌ Missing the `/api/auth/callback/google` path

5. **Add if Missing:**
   - Click **"+ ADD URI"**
   - Enter: `http://localhost:3000/api/auth/callback/google`
   - Click **"Save"**

### Step 3: Verify OAuth Consent Screen

1. **Go to OAuth Consent Screen:**
   - Visit: https://console.cloud.google.com/apis/credentials/consent

2. **Add Test Users (if app is in testing mode):**
   - Click **"Test users"** tab
   - Click **"+ ADD USERS"**
   - Add your email: `am@loopwell.io`
   - Click **"Save"**

### Step 4: Restart Dev Server

After making changes:
```bash
# Stop the dev server (Ctrl+C)
# Then restart
npm run dev
```

### Step 5: Clear Browser State

1. **Clear cookies for localhost:3000:**
   - Open browser DevTools (F12)
   - Go to Application tab → Cookies → http://localhost:3000
   - Delete all cookies (especially `next-auth.*` cookies)

2. **Or use incognito/private window:**
   - This ensures a clean state

### Step 6: Test the Flow

1. Go to: http://localhost:3000/login
2. Click "Continue with Google"
3. You should be redirected to Google
4. After clicking "Allow", you should be redirected back to the app

## If It Still Doesn't Work

### Check Browser Console
1. Open DevTools (F12) → Console tab
2. Try the OAuth flow
3. Look for any errors (especially CORS or redirect errors)

### Check Server Logs
In your terminal running `npm run dev`, look for:
- `🔐 Creating/updating user: am@loopwell.io`
- `✅ User created/updated successfully: ...`
- Any error messages

### Verify the Exact Redirect URI

When you click "Continue with Google", check the URL in the browser address bar. It should look like:
```
https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fgoogle&...
```

The `redirect_uri` parameter should be URL-encoded `http://localhost:3000/api/auth/callback/google`

If it's different, that's the problem - check your `NEXTAUTH_URL` environment variable.

## Expected OAuth Flow

```
1. User clicks "Continue with Google"
   ↓
2. Browser redirects to: https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=http://localhost:3000/api/auth/callback/google&...
   ↓
3. User sees consent screen (where you are now)
   ↓
4. User clicks "Allow"
   ↓
5. Google redirects to: http://localhost:3000/api/auth/callback/google?code=...&state=...
   ↓
6. NextAuth processes the callback
   ↓
7. User is created/updated in database
   ↓
8. User is redirected to: /home
```

## Still Having Issues?

1. **Double-check the redirect URI** - It must match EXACTLY (no trailing slash, http not https, localhost not 127.0.0.1)

2. **Verify environment variables are loaded:**
   ```bash
   # Check if .env.local exists (Next.js loads this first)
   ls -la .env.local
   
   # If it doesn't exist, create it from .env
   cp .env .env.local
   ```

3. **Check if dev server is running on port 3000:**
   ```bash
   lsof -ti:3000
   ```

4. **Review the troubleshooting guide:**
   - See: `docs/DEV_AUTH_TROUBLESHOOTING.md` for more detailed steps

## Summary Checklist

- [ ] `NEXTAUTH_URL=http://localhost:3000` in `.env.local`
- [ ] Google Cloud Console has redirect URI: `http://localhost:3000/api/auth/callback/google`
- [ ] Redirect URI matches EXACTLY (no trailing slash, http not https)
- [ ] Your email is added as a test user in OAuth consent screen
- [ ] Dev server restarted after env changes
- [ ] Browser cookies cleared or using incognito mode
- [ ] No errors in browser console
- [ ] No errors in server logs
