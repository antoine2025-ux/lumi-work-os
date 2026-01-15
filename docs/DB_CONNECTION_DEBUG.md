# Database Connection Debugging Guide

## Which Database Am I Using?

This guide helps you identify and fix database connection mismatches between:
- **Runtime** (Next.js app server)
- **Prisma CLI** (migrations, db push, backfill scripts)

---

## Quick Check

### 1. Check Runtime Database (Running App)

**Via Debug Endpoint:**
```bash
curl http://localhost:3000/api/debug/db
```

Or visit in browser: `http://localhost:3000/api/debug/db`

**Via Server Logs:**
When the Next.js dev server starts, look for:
```
[DB INIT] 📊 Runtime Database Connection:
[DB INIT]   Host: localhost:5432
[DB INIT]   Database: lumi_work_os
[DB INIT] ✅ Connected to database:
[DB INIT]   Database name: lumi_work_os
```

### 2. Check Prisma CLI Database

**Via Print Script:**
```bash
npm run print-db
```

This shows which database Prisma CLI operations (`db push`, `migrate`, `backfill`) will connect to.

---

## Common Issues

### Issue: App connects to DB A, Prisma CLI connects to DB B

**Symptoms:**
- API routes return 500 errors
- Projects/pages exist in one DB but not the other
- Schema changes don't appear in the app

**Root Cause:**
- Next.js app uses `.env.local` (or cached env)
- Prisma CLI uses `.env` (or different shell session env)

**Solution:**

1. **Ensure single source of truth:**
   ```bash
   # .env.local should be the primary source (Next.js loads this first)
   cp .env .env.local
   ```

2. **Verify both point to same DB:**
   ```bash
   # Check runtime
   curl http://localhost:3000/api/debug/db | jq '.actualConnection.database'
   
   # Check CLI
   npm run print-db | grep "Database name"
   ```

3. **If they differ, update .env.local:**
   ```bash
   # Edit .env.local to match what Prisma CLI sees
   # Or vice versa - make Prisma CLI use .env.local
   ```

---

## Environment File Priority

Next.js loads env files in this order (later files override earlier):
1. `.env`
2. `.env.local` ← **Use this for local dev**
3. `.env.development`
4. `.env.development.local`

**Best Practice:** Use `.env.local` for local development. It's gitignored and won't conflict with team settings.

---

## Guardrails

The app includes automatic guardrails (DEV ONLY):

1. **Missing DATABASE_URL:**
   ```
   [DB INIT] ❌ CRITICAL: DATABASE_URL is not set!
   ```

2. **Wrong Database Pattern:**
   ```
   [DB INIT] ❌ CRITICAL: Connected to wrong database!
   [DB INIT]   Database name "lumi_work_os_test" matches wrong DB pattern
   ```

3. **DIRECT_URL Mismatch:**
   ```
   [DB INIT] ⚠️  WARNING: DIRECT_URL points to different database than DATABASE_URL
   ```

---

## Verification Commands

### Check Runtime DB
```bash
# Start dev server and check logs
npm run dev
# Look for [DB INIT] logs

# Or use debug endpoint
curl http://localhost:3000/api/debug/db
```

### Check Prisma CLI DB
```bash
npm run print-db
```

### Verify Data Exists
```bash
# Check if project exists in runtime DB
curl http://localhost:3000/api/debug/db | jq '.dataVerification'

# Check if project exists in CLI DB
npm run print-db
# Look at "Data Verification" section
```

---

## Fixing a Mismatch

1. **Identify the mismatch:**
   ```bash
   # Runtime DB
   curl http://localhost:3000/api/debug/db | jq -r '.actualConnection.database'
   
   # CLI DB
   npm run print-db | grep "Database name" | awk '{print $3}'
   ```

2. **Update .env.local to match:**
   ```bash
   # Edit .env.local
   DATABASE_URL="postgresql://user@host:5432/correct_db_name"
   DIRECT_URL="postgresql://user@host:5432/correct_db_name"
   ```

3. **Restart dev server:**
   ```bash
   # Stop and restart
   npm run dev
   ```

4. **Re-run Prisma operations:**
   ```bash
   # If schema changed
   npx prisma generate
   
   # If migrations needed
   npx prisma migrate dev
   
   # If backfill needed
   npm run backfill:spaces
   ```

---

## Troubleshooting

### "Database does not exist"
- Check DATABASE_URL points to correct database name
- Verify PostgreSQL is running
- Check database exists: `psql -l | grep your_db_name`

### "Connection refused"
- Verify PostgreSQL is running: `pg_isready`
- Check host/port in DATABASE_URL
- Check firewall/network settings

### "Authentication failed"
- Verify username/password in DATABASE_URL
- Check PostgreSQL user permissions
- Try connecting manually: `psql $DATABASE_URL`

---

## Files Changed

- `src/lib/db.ts` - Added startup logging and guardrails
- `src/app/api/debug/db/route.ts` - Debug endpoint (DEV ONLY)
- `scripts/print-db.ts` - CLI script to print DB info
- `package.json` - Added `print-db` script

---

## Related Documentation

- [Database Migration Guide](./DATABASE_MIGRATION_GUIDE.md)
- [Database Sync Guide](./DATABASE_SYNC_GUIDE.md)
