# Fix Internal Server Error

## The Problem

After changing `NEXTAUTH_URL` in `.env.local`, the Next.js dev server needs to be restarted to pick up the new environment variable.

## Solution: Restart Dev Server

1. **Stop the current dev server**:
   - Go to the terminal where `npm run dev` is running
   - Press `Ctrl+C` to stop it

2. **Start it again**:
   ```bash
   npm run dev
   ```

3. **Wait for it to fully start** (you'll see "Ready" message)

4. **Try accessing the app again**:
   - Go to: `https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/home`

## Why This Happens

Next.js reads environment variables when the server starts. When you change `.env.local`, the running server doesn't automatically reload those variables - you need to restart it.

## Alternative: Check Server Logs

If restarting doesn't fix it, check the terminal where the dev server is running for error messages. Common issues:

- Database connection errors
- Missing environment variables
- Authentication/session errors

## Quick Check

After restarting, verify the server is using the new URL:

```bash
curl http://localhost:3000/api/health
```

Should show `NEXTAUTH_URL` is set.


