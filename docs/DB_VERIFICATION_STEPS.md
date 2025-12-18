# Database Verification Steps

## Current State

### Prisma CLI Database (Verified ✅)
```bash
npm run print-db
```

**Result:**
- Database: `lumi_work_os`
- Host: `localhost:5432`
- Projects: 2
- WikiPages: 3
- Spaces: 8

### Environment Files
- ✅ `.env` exists with `DATABASE_URL="postgresql://tonyem@localhost:5432/lumi_work_os"`
- ❌ `.env.local` does NOT exist

**This means:** Next.js will use `.env` (since `.env.local` doesn't exist), so runtime should match CLI.

---

## Verification Steps

### 1. Verify Runtime DB (App Server)

**Start dev server:**
```bash
npm run dev
```

**Check startup logs for:**
```
[DB INIT] 📊 Runtime Database Connection:
[DB INIT]   Host: localhost:5432
[DB INIT]   Database: lumi_work_os
[DB INIT] ✅ Connected to database:
[DB INIT]   Database name: lumi_work_os
```

**Or use debug endpoint:**
```bash
curl http://localhost:3000/api/debug/db | jq '.actualConnection.database'
```

**Expected:** `lumi_work_os`

### 2. Verify CLI DB (Prisma Tooling)

```bash
npm run print-db
```

**Look for:**
```
Database name: lumi_work_os
```

**Expected:** `lumi_work_os`

### 3. Compare

**Extract DB names:**
```bash
# Runtime DB
RUNTIME_DB=$(curl -s http://localhost:3000/api/debug/db | jq -r '.actualConnection.database')

# CLI DB  
CLI_DB=$(npm run print-db 2>&1 | grep "Database name" | awk '{print $3}')

# Compare
echo "Runtime DB: $RUNTIME_DB"
echo "CLI DB: $CLI_DB"

if [ "$RUNTIME_DB" = "$CLI_DB" ]; then
  echo "✅ MATCH - Both using same database"
else
  echo "❌ MISMATCH - Different databases!"
fi
```

---

## If Mismatch Found

### Common Causes

1. **Multiple .env files with different DATABASE_URL**
   - `.env` has DB A
   - `.env.local` has DB B
   - Next.js uses `.env.local` (higher priority)
   - Prisma CLI uses `.env` (or first found)

2. **Cached environment variables**
   - Dev server cached old DATABASE_URL
   - Restart required

3. **Shell session environment**
   - Terminal has DATABASE_URL set
   - Prisma CLI picks it up
   - Next.js doesn't

### Fix Steps

**Option 1: Single Source of Truth (Recommended)**

Create `.env.local` with the correct DATABASE_URL:
```bash
# Copy from .env or set explicitly
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://tonyem@localhost:5432/lumi_work_os?schema=public"
DIRECT_URL="postgresql://tonyem@localhost:5432/lumi_work_os?schema=public"
EOF
```

Then restart dev server:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

**Option 2: Ensure .env Files Match**

Check both files:
```bash
grep "^DATABASE_URL" .env .env.local 2>/dev/null
```

If they differ, update `.env.local` to match `.env` (or vice versa).

**Option 3: Remove Conflicting .env Files**

If `.env.local` has wrong DB:
```bash
# Backup first
cp .env.local .env.local.backup

# Remove or update
rm .env.local
# OR edit .env.local to have correct DATABASE_URL
```

---

## Verification Checklist

- [ ] Dev server started (`npm run dev`)
- [ ] Startup logs show database name
- [ ] Debug endpoint accessible (`curl http://localhost:3000/api/debug/db`)
- [ ] Runtime DB name extracted
- [ ] CLI DB name extracted (`npm run print-db`)
- [ ] Both DB names match
- [ ] Data counts match (projects, wikiPages, spaces)

---

## Expected Results

**If everything is correct:**
```
Runtime DB: lumi_work_os
CLI DB: lumi_work_os
✅ MATCH - Both using same database

Data Verification:
  Runtime: { projects: 2, wikiPages: 3, spaces: 8 }
  CLI: { projects: 2, wikiPages: 3, spaces: 8 }
```

**If mismatch found:**
```
Runtime DB: lumi_work_os_dev
CLI DB: lumi_work_os
❌ MISMATCH - Different databases!

Fix: Update .env.local to match .env
```

---

## Quick Test Script

Save as `scripts/verify-db-match.sh`:

```bash
#!/bin/bash
echo "🔍 Verifying Database Connection Match..."
echo ""

echo "1️⃣  Prisma CLI Database:"
CLI_DB=$(npm run print-db 2>&1 | grep "Database name" | awk '{print $3}')
echo "   Database: $CLI_DB"
echo ""

echo "2️⃣  Runtime Database (requires dev server running):"
if curl -s http://localhost:3000/api/debug/db > /dev/null 2>&1; then
  RUNTIME_DB=$(curl -s http://localhost:3000/api/debug/db | jq -r '.actualConnection.database')
  echo "   Database: $RUNTIME_DB"
  echo ""
  
  if [ "$RUNTIME_DB" = "$CLI_DB" ]; then
    echo "✅ MATCH - Both using same database: $RUNTIME_DB"
  else
    echo "❌ MISMATCH!"
    echo "   Runtime: $RUNTIME_DB"
    echo "   CLI: $CLI_DB"
    echo ""
    echo "Fix: Update .env.local to match .env"
  fi
else
  echo "   ⚠️  Dev server not running"
  echo "   Start with: npm run dev"
fi
```

---

**Next Steps:** Start dev server and run verification to confirm runtime DB matches CLI DB.
