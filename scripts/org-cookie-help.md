# Org MVP Pressure Test - Cookie Help

## Quick Guide

The pressure test requires an authentication cookie to make authenticated requests to the Org API endpoints.

## How to Get Your Cookie

### Option 1: Chrome DevTools (Recommended)

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Log in via browser:**
   - Open `http://localhost:3000` in Chrome
   - Complete the login flow (OAuth or dev login)

3. **Open DevTools:**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
   - Go to **Application** tab (or **Storage** in Firefox)

4. **Find Cookies:**
   - In the left sidebar, expand **Cookies**
   - Click on `http://localhost:3000`

5. **Copy Cookie Header:**
   - Look for the session cookie (usually named `next-auth.session-token` or similar)
   - Copy the **entire cookie header string** in this format:
     ```
     next-auth.session-token=abc123...; other-cookie=value2
     ```
   - **Important:** Copy ALL cookies, not just one. Format: `name1=value1; name2=value2`

6. **Set Environment Variable:**
   ```bash
   export ORG_TEST_COOKIE="next-auth.session-token=abc123...; other-cookie=value2"
   ```

### Option 2: Save to File

1. **Create cookie file:**
   ```bash
   mkdir -p tmp
   echo "next-auth.session-token=abc123...; other-cookie=value2" > tmp/org-cookie.txt
   ```

2. **Set file path:**
   ```bash
   export ORG_TEST_COOKIE_FILE="./tmp/org-cookie.txt"
   ```

## Cookie Format Examples

### Correct Formats:
```bash
# Single cookie
export ORG_TEST_COOKIE="next-auth.session-token=abc123def456"

# Multiple cookies (recommended)
export ORG_TEST_COOKIE="next-auth.session-token=abc123; next-auth.csrf-token=xyz789"
```

### Incorrect Formats:
```bash
# Missing equals sign
export ORG_TEST_COOKIE="just-a-token"  # ❌

# Too short (likely incomplete)
export ORG_TEST_COOKIE="abc"  # ❌

# Missing quotes (will break shell)
export ORG_TEST_COOKIE=abc123  # ❌
```

## Cookie Expiry

**Important:** Cookies expire when:
- Your session expires (usually after inactivity)
- You log out
- The server restarts (in development)

**If tests fail with 401/403:**
1. Log in again via browser
2. Get a fresh cookie
3. Re-run the test

## Troubleshooting

### "Cookie validation failed"
- Ensure cookie contains `=` (format: `name=value`)
- Check for typos or incomplete copy

### "Cookie seems too short"
- You may have copied only part of the cookie
- Copy the entire cookie value from DevTools

### "Auth check failed" / 401 Unauthorized
- Cookie expired - get a fresh one
- Not logged in - complete login flow first
- Wrong workspace - ensure you're in the correct workspace

### "Server not running"
- Start dev server: `npm run dev`
- Check BASE_URL matches your server port

## Quick Test

After setting the cookie, verify it works:
```bash
# Test auth check only
curl -H "Cookie: $ORG_TEST_COOKIE" http://localhost:3000/api/org/overview
```

Should return JSON with `{ "summary": {...}, "readiness": {...} }`

