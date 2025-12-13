# Debug: Network Tab & Server Logs

## The Console Warning is Not the Issue

The warning you see is just a deprecation notice from Google's JavaScript. It won't block OAuth.

## Critical Checks

### 1. Check Network Tab (MOST IMPORTANT)

The console warning doesn't tell us if the callback is being hit. We need to check the Network tab:

1. **Open DevTools (F12) → Network tab**
2. **Clear the network log** (trash icon)
3. **Click "Continue with Google"** on your login page
4. **Click "Allow"** on Google's consent screen
5. **Look for a request to:** `/api/auth/callback/google`

**What to check:**
- **Does the request exist?** (If no, Google isn't redirecting back)
- **Status code:** Should be 200, 302, or 307
- **Request URL:** Should have `code=` and `state=` parameters
- **Response:** Click on the request → Response tab → What does it show?
- **Headers:** Click on the request → Headers tab → Look for `Set-Cookie` headers

**Screenshot or describe what you see** - this is critical!

### 2. Check Server Logs (CRITICAL)

In your terminal running `npm run dev`, after clicking "Allow":

**Look for these logs:**
```
🔐 [NextAuth] signIn callback triggered
🔐 [NextAuth] Creating/updating user: am@loopwell.io
✅ [NextAuth] User created/updated successfully: ...
```

**If you DON'T see these logs:**
- The callback isn't being hit
- Google might not be redirecting back
- Or the route isn't working

**If you DO see these logs:**
- The callback is working
- Check for any error messages after them

### 3. What Happens After Clicking "Allow"?

**Critical question:** What do you see after clicking "Allow"?

- [ ] Stays on Google's page (doesn't redirect)
- [ ] Redirects to an error page
- [ ] Redirects back to `/login`
- [ ] Redirects to a blank page
- [ ] Shows a loading spinner that never finishes
- [ ] Something else (describe)

### 4. Check Cookies

After clicking "Allow" and being redirected (or not):

1. **Open DevTools → Application tab → Cookies → `http://localhost:3000`**
2. **Look for cookies starting with `next-auth.`**

**Expected cookies:**
- `next-auth.session-token` (most important - this means session was created)
- `next-auth.csrf-token`
- `next-auth.callback-url`

**If these cookies are missing:**
- Session isn't being created
- This is likely the root cause

## Quick Test

Try accessing the callback endpoint directly to see if it works:

```
http://localhost:3000/api/auth/callback/google?error=test
```

This should redirect you (even if with an error). If it doesn't respond at all, the route might not be working.

## Most Likely Scenarios

Based on only seeing the console warning:

1. **Callback isn't being hit** - Google isn't redirecting back (check Network tab)
2. **Callback fails silently** - Check server logs for errors
3. **Cookies not being set** - Browser blocking or CORS issue
4. **Database connection fails** - User creation fails silently

## What to Report Back

Please provide:

1. **Network Tab:** Screenshot or description of `/api/auth/callback/google` request (if it exists)
2. **Server Logs:** Copy/paste logs from terminal after clicking "Allow"
3. **What happens:** Describe what you see after clicking "Allow"
4. **Cookies:** List any `next-auth.*` cookies present after callback attempt
