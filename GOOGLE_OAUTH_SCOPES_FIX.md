# Google OAuth Scopes Fix

## Problem

The Google OAuth flow was incomplete - it wasn't requesting the necessary scopes to access Google Calendar and other Google services. Users had to manually authorize the app each time.

## What Was Fixed

### 1. Added Required OAuth Scopes

**File**: `src/server/authOptions.ts`

Added proper scopes to the GoogleProvider:
- `openid` - Basic OpenID Connect
- `https://www.googleapis.com/auth/userinfo.email` - User email
- `https://www.googleapis.com/auth/userinfo.profile` - User profile (name, image)
- `https://www.googleapis.com/auth/calendar.readonly` - Read-only access to Google Calendar

**Key Changes:**
- Added `access_type: 'offline'` - Ensures we get a refresh token
- Added `prompt: 'consent'` - Forces consent screen so users can grant all permissions upfront

### 2. Enhanced Token Refresh Handling

**File**: `src/app/api/calendar/events/route.ts`

Added automatic token refresh handling so expired tokens are refreshed automatically.

## What You Need to Do

### 1. Re-authenticate (Required)

**Important**: Existing sessions don't have the new scopes. You must log out and log back in.

1. **Log out**: Clear your session or go to `/login` and sign out
2. **Log in again**: Go to `/login` and click "Continue with Google"
3. **Grant permissions**: You'll see a consent screen asking for:
   - Your basic profile (name, email, picture)
   - **Google Calendar access** (read-only)
4. **Complete login**: After granting permissions, you'll be redirected back

### 2. Verify It Works

After logging in with the new scopes:

1. **Check session**: http://localhost:3000/api/auth/session
   - Should show `accessToken` and `refreshToken` in the response

2. **Test calendar**: Navigate to `/home` 
   - Calendar events should load without errors
   - No more 500 errors from `/api/calendar/events`

3. **Check console**: No more authentication errors

## Technical Details

### OAuth Flow (After Fix)

```
1. User clicks "Continue with Google"
2. Google OAuth consent screen shows:
   - ✅ See your basic profile info
   - ✅ See your email address  
   - ✅ See your Google Calendar (read-only) ← NEW
3. User grants permissions
4. Google returns:
   - Access token (short-lived)
   - Refresh token (long-lived) ← NEW (with access_type: 'offline')
5. NextAuth stores tokens in JWT session
6. Calendar API uses tokens to fetch events
```

### Token Storage

- **Access Token**: Stored in session JWT, expires in ~1 hour
- **Refresh Token**: Stored in session JWT, used to get new access tokens
- **Automatic Refresh**: Google OAuth client automatically refreshes expired tokens

## Troubleshooting

### "Still seeing 500 errors"

1. **Make sure you re-authenticated** (logged out and back in)
2. **Check browser console** for specific error messages
3. **Verify scopes were granted**: 
   - Go to https://myaccount.google.com/permissions
   - Find "Loopwell" app
   - Should show "Calendar" permission

### "Consent screen doesn't show Calendar permission"

- Make sure you're using the updated code (restart dev server)
- Clear browser cache and cookies
- Try logging in from an incognito window

### "Token refresh not working"

- Check that `refresh_token` exists in session: `/api/auth/session`
- Verify `access_type: 'offline'` is in the OAuth request (check network tab)

## Next Steps

After re-authenticating:
- ✅ Calendar events should load automatically
- ✅ No more manual authorization needed
- ✅ Tokens refresh automatically
- ✅ All Google services (that we request) are accessible
