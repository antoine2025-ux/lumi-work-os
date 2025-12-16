# How to Fix Google OAuth Configuration

## Current Issue
Your `.env.local` file still contains placeholder values. The file shows:
```
GOOGLE_CLIENT_ID="REPLACE_WITH_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="REPLACE_WITH_GOOGLE_CLIENT_SECRET"
```

## Steps to Fix

### 1. Get Your Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to: **APIs & Services** → **Credentials**
4. Click on your **OAuth 2.0 Client ID**
5. Copy:
   - **Client ID** (looks like: `123456789-abc...apps.googleusercontent.com`)
   - **Client secret** (looks like: `GOCSPX-abc...`)

### 2. Configure Redirect URI in Google Cloud Console

**IMPORTANT:** Before updating `.env.local`, add this redirect URI to your OAuth client:

1. In Google Cloud Console, edit your OAuth 2.0 Client ID
2. Under **Authorized redirect URIs**, click **ADD URI**
3. Add: `http://localhost:3000/api/auth/callback/google`
4. Click **SAVE**

### 3. Update `.env.local`

1. Open `.env.local` in your project root
2. Find these lines:
   ```env
   GOOGLE_CLIENT_ID="REPLACE_WITH_GOOGLE_CLIENT_ID"
   GOOGLE_CLIENT_SECRET="REPLACE_WITH_GOOGLE_CLIENT_SECRET"
   ```

3. Replace them with your actual credentials:
   ```env
   GOOGLE_CLIENT_ID="your-actual-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-actual-client-secret"
   ```

   **Important:**
   - Keep the quotes (`"`) around the values
   - No spaces before or after the `=`
   - Use the exact values from Google Cloud Console
   - Make sure there are no extra spaces or line breaks

4. **Save the file** (make sure it's actually saved!)

### 4. Verify the File Was Updated

Run this command to check:
```bash
grep "GOOGLE_CLIENT_ID" .env.local
```

You should see your actual Client ID, NOT `REPLACE_WITH_GOOGLE_CLIENT_ID`.

### 5. Restart the Dev Server

1. Stop the current server (Ctrl+C in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

### 6. Verify It's Working

1. Visit: `http://localhost:3000/api/debug/env`
   - Check that `hasValidCredentials` is `true`
   - Check that `isPlaceholder` is `false` for both

2. Visit: `http://localhost:3000/api/auth/providers`
   - Should show: `{"google": {...}}` (not `{}`)

3. Visit: `http://localhost:3000/login`
   - Should show "Continue with Google" button
   - No error messages

## Common Issues

- **File not saved:** Make sure you actually saved `.env.local` after editing
- **Wrong file:** Make sure you're editing `.env.local` in the project root, not `.env` or another file
- **Quotes missing:** Values must be in quotes: `GOOGLE_CLIENT_ID="value"`
- **Extra spaces:** No spaces around the `=` sign
- **Redirect URI not added:** Must add `http://localhost:3000/api/auth/callback/google` to Google Cloud Console

