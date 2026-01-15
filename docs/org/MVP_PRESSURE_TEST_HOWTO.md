# Org MVP Pressure Test - Quick How-To

> **Operator-friendly guide** - Run this before/after merges to validate Org MVP flows

## Prerequisites

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Log in in browser:**
   - Open `http://localhost:3000`
   - Complete login flow
   - Navigate to any Org page (e.g., `/org`) to ensure session is active

## Step 1: Capture Cookie

1. **Open Chrome DevTools:**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)

2. **Navigate to Cookies:**
   - Go to **Application** tab
   - Expand **Cookies** in left sidebar
   - Click on `http://localhost:3000`

3. **Find and copy session cookie:**
   - Look for one of these cookie names:
     - `__Secure-next-auth.session-token` (preferred if exists)
     - `next-auth.session-token`
   - **If both exist, use the `__Secure-` one**
   - Copy the **Value** column (the long string)

4. **Format for file:**
   - Format: `name=value` (single line, no quotes)
   - Example: `__Secure-next-auth.session-token=abc123def456...`

## Step 2: Create Cookie File (Recommended)

```bash
mkdir -p tmp
echo "__Secure-next-auth.session-token=PASTE_VALUE_HERE" > tmp/org-cookie.txt
```

**Or manually:**
- Create `tmp/org-cookie.txt`
- Paste cookie value: `name=value` (single line)

## Step 3: Run Tests

### Smoke Test (No Data Writes - Safe)

```bash
export ORG_TEST_COOKIE_FILE="./tmp/org-cookie.txt"
npm run org:mvp:smoke
```

**Use when:**
- Before merge (validate routes work)
- After merge (quick sanity check)
- Quick validation without creating test data

### Full Test (Creates Data)

```bash
export ORG_TEST_COOKIE_FILE="./tmp/org-cookie.txt"
npm run org:mvp:pressure-test
```

**Use when:**
- Before demo (validate full flow)
- Deep validation (tests create → read → assign flow)
- **Note:** Creates test people/teams/departments in your dev DB

## Step 4: Check Results

Results appear in:
- **Human-readable:** `docs/org/MVP_READINESS_SCORECARD.md`
- **Machine-readable:** `docs/org/MVP_READINESS_SCORECARD.json`

Open the MD file to see:
- ✅ PASS / ❌ FAIL per step
- HTTP status codes
- Error messages and hints
- Response body snippets (on failure)

## Step 5: Interpret Outcomes

### ✅ All PASS
- Proceed with confidence
- Org MVP flows are working

### ❌ FAIL 401/403 (Unauthorized/Forbidden)
- **Cause:** Cookie expired or invalid
- **Fix:**
  1. Log in again via browser
  2. Recapture cookie (Step 1)
  3. Update `tmp/org-cookie.txt`
  4. Re-run test

### ❌ FAIL ECONNREFUSED
- **Cause:** Server not running
- **Fix:** Start server with `npm run dev`

### ❌ FAIL 404 (Not Found)
- **Cause:** Route mismatch or endpoint missing
- **Fix:**
  - Check if route file exists: `src/app/api/org/.../route.ts`
  - Verify URL path matches route structure
  - Check server logs

### ❌ FAIL 500 (Server Error)
- **Cause:** Server-side error
- **Fix:**
  1. Open failing endpoint file
  2. Check server console logs
  3. Look for database connection issues
  4. Verify DATABASE_URL is set

### ❌ FAIL 400 (Bad Request)
- **Cause:** Request validation failed
- **Fix:**
  - Check request body format in scorecard
  - Verify required fields are present
  - Check API endpoint expects correct format

## Cleanup Note

**Full mode creates test data:**
- Test people (emails like `test-1234567890@example.com`)
- Test departments (names like `Test Department 1234567890`)
- Test teams (names like `Test Team 1234567890`)
- Ownership assignments

**This is OK for dev DB** - you can leave it or clean up manually if needed.

## Quick Reference

```bash
# Get help
npm run org:mvp:help

# Smoke test (safe, no writes)
export ORG_TEST_COOKIE_FILE="./tmp/org-cookie.txt"
npm run org:mvp:smoke

# Full test (creates data)
export ORG_TEST_COOKIE_FILE="./tmp/org-cookie.txt"
npm run org:mvp:pressure-test

# View results
cat docs/org/MVP_READINESS_SCORECARD.md
```

## Merge Safety Harness

**Before merge:**
```bash
npm run org:mvp:smoke  # Quick validation
```

**After merge:**
```bash
npm run org:mvp:smoke  # Verify nothing broke
```

**Before demo:**
```bash
npm run org:mvp:pressure-test  # Full flow validation
```

---

*For detailed cookie help, see: `scripts/org-cookie-help.md`*

