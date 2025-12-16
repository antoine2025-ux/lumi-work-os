# OAuth Callback Error Troubleshooting

## Error: `OAuthCallback` - "Error during OAuth callback"

If you're seeing this error even though the redirect URI is configured, check these:

### 1. OAuth Consent Screen Configuration

1. Go to **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**
2. Check the **Publishing status**:
   - If it says **"Testing"**, you MUST add your email as a test user
   - Go to **Test users** section → **Add Users** → Add your Google email
   - Save and wait a few minutes

### 2. Verify Client ID and Secret Match

1. In Google Cloud Console → **Credentials**
2. Make sure you're using the **OAuth 2.0 Client ID** (not API key or service account)
3. Verify the Client ID in `.env.local` matches exactly (including the full `.apps.googleusercontent.com` part)

### 3. Check Redirect URI Format

The redirect URI must be **exactly**:
```
http://localhost:3000/api/auth/callback/google
```

**Common mistakes:**
- ❌ `https://localhost:3000/...` (wrong protocol)
- ❌ `http://localhost:3000/api/auth/callback/google/` (trailing slash)
- ❌ `http://127.0.0.1:3000/...` (use localhost, not IP)

### 4. Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Click "View Error Details" button on the error page
4. Look for any error messages that might give more details

### 5. Verify Environment Variables Are Loaded

Visit: `http://localhost:3000/api/debug/env`

Should show:
- `hasValidCredentials: true`
- `isPlaceholder: false` for both

### 6. Restart Dev Server After Changes

After updating `.env.local` or Google Cloud Console settings:
1. Stop the dev server (Ctrl+C)
2. Wait 5 seconds
3. Start again: `npm run dev`

### 7. Clear Browser Cache

Sometimes cached OAuth state causes issues:
1. Clear browser cache for `localhost:3000`
2. Or use an incognito/private window
3. Try signing in again

### 8. Check OAuth Scopes

The default scopes should be fine, but if you modified them, make sure they include:
- `openid`
- `email`
- `profile`

### Still Not Working?

1. Check the terminal where `npm run dev` is running for any error messages
2. Check browser console (F12) for detailed error messages
3. Verify you're using the correct Google account (the one added as a test user if app is in Testing mode)

