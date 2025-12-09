# Fix ChunkLoadError with ngrok

## The Problem

When accessing Next.js through ngrok, you get `ChunkLoadError` because:
- Next.js builds chunks with `localhost:3000` URLs
- Browser tries to load them from `ngrok-url.ngrok.io`
- Mismatch causes 404 errors

## Solution 1: Use localhost for Development (Recommended)

**Best approach**: Access the app via `localhost:3000` for normal development, and only use ngrok for OAuth callbacks.

1. **Access app via localhost**:
   - Go to: `http://localhost:3000/home`
   - This works normally

2. **OAuth still uses ngrok**:
   - Slack/Google OAuth will use the ngrok URL from `SLACK_REDIRECT_URI` and `NEXTAUTH_URL`
   - The OAuth providers redirect back through ngrok
   - But you can still browse the app on localhost

## Solution 2: Clear Cache and Restart (If you must use ngrok)

If you really need to access the app through ngrok:

1. **Stop the dev server** (Ctrl+C)

2. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   ```

3. **Restart dev server**:
   ```bash
   npm run dev
   ```

4. **Access via ngrok**:
   - Go to: `https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/home`

## Why This Happens

Next.js generates chunk URLs based on the request origin. When you first access via ngrok, it might generate URLs with the ngrok domain, but if the cache was built with localhost, there's a mismatch.

## Recommended Workflow

For local development with OAuth:

1. **Browse app on localhost**: `http://localhost:3000`
2. **OAuth uses ngrok**: Set `NEXTAUTH_URL` and `SLACK_REDIRECT_URI` to ngrok URL
3. **OAuth redirects work**: Slack/Google redirect through ngrok, then back to localhost

This way:
- ✅ No chunk loading issues
- ✅ OAuth works (uses HTTPS via ngrok)
- ✅ Faster development (no ngrok overhead for normal browsing)






