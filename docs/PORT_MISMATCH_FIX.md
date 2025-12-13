# Port Mismatch Fix - CRITICAL ISSUE FOUND

## The Problem

Your dev server is running on **port 3003**, but:
- `NEXTAUTH_URL` is set to `http://localhost:3000`
- Google OAuth redirect URI is configured for `http://localhost:3000/api/auth/callback/google`
- **Result:** When Google redirects back after authorization, it goes to port 3000 (which has old processes), not port 3003 where your actual server is!

## The Fix

### Step 1: Kill Old Processes on Port 3000

I've killed the processes, but verify:
```bash
lsof -ti:3000
# Should return nothing
```

### Step 2: Restart Dev Server (Should Now Use Port 3000)

```bash
# Stop current dev server (Ctrl+C)
npm run dev
```

**Verify it says:**
```
Local: http://localhost:3000
```

**NOT:**
```
Local: http://localhost:3003
```

### Step 3: Verify NEXTAUTH_URL

Make sure `.env.local` (or `.env`) has:
```env
NEXTAUTH_URL=http://localhost:3000
```

### Step 4: Verify Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", verify you have:
   ```
   http://localhost:3000/api/auth/callback/google
   ```

## Why This Happened

When port 3000 was in use, Next.js automatically used port 3003. But `NEXTAUTH_URL` was still set to 3000, causing the mismatch.

## After Fixing

1. Restart dev server (should be on port 3000)
2. Try OAuth flow again
3. Check server logs - you should now see:
   ```
   🔐 [NextAuth] signIn callback triggered
   ```
