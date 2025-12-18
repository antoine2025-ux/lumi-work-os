# Database Mismatch Fix Summary

## Problem Identified

The Next.js app was potentially connecting to a different database than Prisma CLI operations (`db push`, `migrate`, `backfill`), causing:
- API routes returning 500 errors
- Schema changes not appearing in the app
- Data existing in one DB but not the other

---

## Root Cause

**Environment File Priority:**
- Next.js loads `.env.local` first (if exists), then `.env`
- Prisma CLI loads `.env` directly
- If `.env.local` doesn't exist, both use `.env` (OK)
- If `.env.local` exists with different DATABASE_URL, mismatch occurs

**Current State:**
- `.env` exists with `DATABASE_URL="postgresql://tonyem@localhost:5432/lumi_work_os"`
- `.env.local` does NOT exist
- Prisma CLI connects to: `lumi_work_os` ✅
- Runtime app should also connect to: `lumi_work_os` (if using .env)

---

## Solution Implemented

### Phase A: Runtime Database Identification

**1. Added startup logging (`src/lib/db.ts`):**
```typescript
// Logs DATABASE_URL, DIRECT_URL, and actual connected database
// Shows: Host, Port, Database name, Server address, Schema
```

**2. Created debug endpoint (`src/app/api/debug/db/route.ts`):**
- `GET /api/debug/db` (DEV ONLY)
- Returns: env vars, actual connection, data verification counts
- Use: `curl http://localhost:3000/api/debug/db`

**3. Added route-level logging (`src/app/api/projects/[projectId]/route.ts`):**
- Logs DB info when `DEBUG_DB=true` env var is set
- Helps debug specific failing requests

### Phase B: Prisma CLI Database Identification

**1. Created print-db script (`scripts/print-db.ts`):**
- Shows which DB Prisma CLI operations connect to
- Use: `npm run print-db`
- Outputs: env vars, actual connection, data verification

**2. Verified Prisma schema (`prisma/schema.prisma`):**
- Uses `env("DATABASE_URL")` and `env("DIRECT_URL")`
- No hardcoded values ✅

### Phase C: Guardrails & Prevention

**1. Startup guardrails (`src/lib/db.ts`):**
- ✅ Detects missing DATABASE_URL
- ✅ Detects wrong database patterns (`_shadow`, `_test`, `test_`, `dev_`, `_dev`)
- ✅ Warns if DIRECT_URL points to different DB than DATABASE_URL
- ✅ All checks are DEV ONLY (non-blocking in production)

**2. Documentation:**
- Created `docs/DB_CONNECTION_DEBUG.md` with troubleshooting guide
- Added "Which Database Am I Using?" section
- Includes verification commands and fix steps

---

## Files Changed

### Modified Files:
1. **`src/lib/db.ts`**
   - Added startup logging (lines ~10-35)
   - Added database verification query (lines ~108-150)
   - Added guardrails for wrong DB detection

2. **`src/app/api/projects/[projectId]/route.ts`**
   - Added optional debug logging (lines ~17-26)
   - Only logs when `DEBUG_DB=true` env var is set

3. **`package.json`**
   - Added `print-db` script (line ~20)

### New Files:
1. **`src/app/api/debug/db/route.ts`**
   - Debug endpoint for runtime DB info
   - DEV ONLY (gated by NODE_ENV check)

2. **`scripts/print-db.ts`**
   - CLI script to print Prisma CLI DB connection info
   - Uses same env loading as Next.js

3. **`docs/DB_CONNECTION_DEBUG.md`**
   - Complete troubleshooting guide
   - Verification commands
   - Fix instructions

---

## Verification Steps

### 1. Check Runtime Database
```bash
# Start dev server
npm run dev

# Check logs for:
[DB INIT] 📊 Runtime Database Connection:
[DB INIT]   Database: lumi_work_os
[DB INIT] ✅ Connected to database:
[DB INIT]   Database name: lumi_work_os

# Or use debug endpoint
curl http://localhost:3000/api/debug/db | jq '.actualConnection.database'
```

### 2. Check Prisma CLI Database
```bash
npm run print-db

# Should show:
# Database name: lumi_work_os
# Projects: 2
# WikiPages: 3
# Spaces: 8
```

### 3. Verify They Match
```bash
# Runtime DB
RUNTIME_DB=$(curl -s http://localhost:3000/api/debug/db | jq -r '.actualConnection.database')

# CLI DB
CLI_DB=$(npm run print-db 2>&1 | grep "Database name" | awk '{print $3}')

# Compare
echo "Runtime: $RUNTIME_DB"
echo "CLI: $CLI_DB"
```

---

## Next Steps

### If Mismatch Found:

1. **Create/Update `.env.local`:**
   ```bash
   # Copy from .env or set explicitly
   DATABASE_URL="postgresql://tonyem@localhost:5432/lumi_work_os?schema=public"
   DIRECT_URL="postgresql://tonyem@localhost:5432/lumi_work_os?schema=public"
   ```

2. **Restart dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

3. **Verify both match:**
   ```bash
   npm run print-db
   curl http://localhost:3000/api/debug/db
   ```

4. **Re-run Prisma operations if needed:**
   ```bash
   npx prisma generate
   npm run backfill:spaces  # If schema changed
   ```

---

## Prevention

**Best Practice:**
- Use `.env.local` for local development (gitignored)
- Keep `.env` for team defaults (can be committed)
- Next.js will load `.env.local` first, ensuring consistency

**Guardrails:**
- Startup checks warn about wrong DB patterns
- Debug endpoint available in dev mode
- Print script available for CLI verification

---

## Testing

✅ **Verified:**
- Print script works: `npm run print-db` ✅
- Prisma CLI connects to: `lumi_work_os` ✅
- Data exists: 2 projects, 3 wiki pages, 8 spaces ✅

⏳ **To Test:**
- Start dev server and check startup logs
- Call `/api/debug/db` endpoint
- Verify runtime DB matches CLI DB

---

## Debug Endpoint Response Example

```json
{
  "environment": {
    "nodeEnv": "development",
    "hasDatabaseUrl": true,
    "hasDirectUrl": true
  },
  "envVars": {
    "DATABASE_URL": {
      "host": "localhost",
      "port": "5432",
      "database": "lumi_work_os",
      "username": "tonyem",
      "url": "postgresql://tonyem:***@localhost:5432/lumi_work_os"
    },
    "DIRECT_URL": {
      "host": "localhost",
      "port": "5432",
      "database": "lumi_work_os",
      "username": "tonyem",
      "url": "postgresql://tonyem:***@localhost:5432/lumi_work_os"
    }
  },
  "actualConnection": {
    "database": "lumi_work_os",
    "serverAddress": "::1",
    "schema": "public"
  },
  "dataVerification": {
    "projects": 2,
    "wikiPages": 3,
    "spaces": 8
  }
}
```

---

**Status:** ✅ Implementation Complete
**Next:** Test with running dev server to verify runtime DB matches CLI DB
