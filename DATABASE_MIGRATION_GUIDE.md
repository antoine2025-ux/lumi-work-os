# Database Migration Guide

Guide for running database migrations in development and production environments.

## Table of Contents

1. [Automatic Migrations](#automatic-migrations)
2. [Manual Migrations](#manual-migrations)
3. [Common Issues](#common-issues)
4. [Verification](#verification)

---

## Automatic Migrations

### Development

During development, use Prisma migrations:

```bash
# Generate migration after schema changes
npx prisma migrate dev --name your_migration_name

# This will:
# 1. Create migration files in prisma/migrations/
# 2. Apply migration to your database
# 3. Regenerate Prisma Client
```

### Production (Vercel)

The build process automatically:
1. Tries to run `prisma migrate deploy` (applies pending migrations)
2. If that fails, falls back to `prisma db push` (syncs schema directly)

**This happens automatically on every Vercel deployment.**

---

## Manual Migrations

If automatic migration fails, use one of these methods:

### Method 1: Prisma Migrate Deploy (Recommended)

```bash
# Set production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Deploy migrations
npx prisma migrate deploy
```

**Use this when:**
- You have migration files in `prisma/migrations/`
- You want to track migration history
- You're deploying to production

### Method 2: Prisma DB Push (Quick Fix)

```bash
# Set production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Push schema directly (creates missing tables/columns)
npx prisma db push --accept-data-loss
```

**Use this when:**
- Missing tables need to be created quickly
- You don't have migration files yet
- You're okay with potential data loss (use `--accept-data-loss` flag)

**⚠️ Warning:** `db push` doesn't create migration files and may cause data loss.

### Method 3: SQL Script

If you have SQL scripts (e.g., `scripts/create-org-tables.sql`):

```bash
# Using psql
psql $DATABASE_URL -f scripts/create-org-tables.sql

# Or copy SQL and run manually in:
# - Supabase SQL Editor
# - pgAdmin
# - DBeaver
# - Any PostgreSQL client
```

---

## Common Issues

### Issue: Missing Tables in Production

**Symptoms:**
- Error: "relation 'org_departments' does not exist"
- Error: "relation 'org_teams' does not exist"
- Tables missing after deployment

**Solution:**

1. **Check if tables exist:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('org_departments', 'org_teams');
   ```

2. **If missing, run migration:**
   ```bash
   # Option 1: Use db push (quickest)
   export DATABASE_URL="your-production-database-url"
   npx prisma db push --accept-data-loss
   
   # Option 2: Use migrate deploy (if migrations exist)
   npx prisma migrate deploy
   
   # Option 3: Run SQL script
   psql $DATABASE_URL -f scripts/create-org-tables.sql
   ```

3. **Verify tables were created:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('org_departments', 'org_teams');
   ```

### Issue: Migration Fails During Vercel Build

**Symptoms:**
- Build fails with database connection errors
- Migration errors in Vercel logs

**Causes:**
- Vercel build environment cannot connect to database
- Database URL not set correctly
- Network/firewall issues

**Solution:**

1. **Check Vercel Environment Variables:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Verify `DATABASE_URL` is set correctly
   - Ensure it's available for Production, Preview, and Development

2. **Run Migration Manually After Deployment:**
   ```bash
   # Get DATABASE_URL from Vercel
   export DATABASE_URL="your-production-database-url"
   
   # Run migration manually
   npx prisma migrate deploy
   ```

3. **Or Use Build Hook:**
   - Create Vercel Build Hook (Settings → Git → Build Hooks)
   - Set it to run after deployment
   - Use script: `scripts/run-migrations.sh`

### Issue: Schema Drift

**Symptoms:**
- Database schema doesn't match Prisma schema
- Missing columns or tables
- Type mismatches

**Solution:**

1. **Check schema differences:**
   ```bash
   npx prisma db pull
   # Compare with prisma/schema.prisma
   ```

2. **Sync schema:**
   ```bash
   # Development: Create migration
   npx prisma migrate dev --name fix_schema_drift
   
   # Production: Push schema (if safe)
   npx prisma db push --accept-data-loss
   ```

---

## Verification

### Verify Tables Exist

```sql
-- Check specific tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('org_departments', 'org_teams');

-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Verify Migrations Applied

```bash
# Check migration status
npx prisma migrate status

# Should show:
# ✅ All migrations have been applied
```

### Verify Schema Matches Database

```bash
# Pull current database schema
npx prisma db pull

# Compare with prisma/schema.prisma
# They should match (or differences should be intentional)
```

---

## Best Practices

### Development

1. **Always use migrations:**
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```

2. **Review migration files:**
   - Check `prisma/migrations/` before committing
   - Ensure migrations are reversible when possible

3. **Test migrations:**
   - Test on local database first
   - Verify no data loss

### Production

1. **Use `migrate deploy`:**
   ```bash
   npx prisma migrate deploy
   ```
   - Tracks migration history
   - Safer than `db push`

2. **Backup before migration:**
   - Always backup production database
   - Test migrations on staging first

3. **Monitor migration logs:**
   - Check Vercel build logs
   - Monitor database for errors

### Emergency Fixes

If you need to quickly fix missing tables:

```bash
# Quick fix (use with caution)
export DATABASE_URL="your-production-database-url"
npx prisma db push --accept-data-loss

# Then verify
npx prisma migrate status
```

---

## Migration Workflow

### Standard Workflow

1. **Make schema changes** in `prisma/schema.prisma`
2. **Create migration:**
   ```bash
   npx prisma migrate dev --name add_new_feature
   ```
3. **Test locally**
4. **Commit migration files** to git
5. **Deploy to production**
6. **Migrations run automatically** on Vercel

### Emergency Workflow

1. **Identify missing tables/columns**
2. **Quick fix:**
   ```bash
   export DATABASE_URL="production-url"
   npx prisma db push --accept-data-loss
   ```
3. **Verify fix worked**
4. **Create proper migration later:**
   ```bash
   npx prisma migrate dev --name emergency_fix
   ```

---

## Troubleshooting

### "Migration failed" Error

**Check:**
- Database connection string is correct
- Database is accessible from your network
- User has permissions to create tables
- No conflicting migrations

**Fix:**
- Verify DATABASE_URL
- Check database permissions
- Review migration files for conflicts

### "Table already exists" Error

**Cause:** Migration was partially applied

**Fix:**
```bash
# Mark migration as applied (if safe)
npx prisma migrate resolve --applied migration_name

# Or reset and reapply (⚠️ data loss)
npx prisma migrate reset
```

### "Cannot connect to database" Error

**Check:**
- DATABASE_URL is set correctly
- Database is running
- Network/firewall allows connection
- SSL mode matches database requirements

**Fix:**
- Verify DATABASE_URL format
- Check database status
- Review connection string parameters

---

## Next Steps

1. ✅ Set up automatic migrations in Vercel
2. ✅ Test migrations locally first
3. ✅ Monitor migration logs in production
4. ✅ Keep migration files in version control
5. ✅ Document any manual migrations needed

---

For authentication system migration, see `AUTHENTICATION_MIGRATION_GUIDE.md`.  
For migrating from other platforms (Notion, Confluence), see `MIGRATION_STRATEGY.md`.  
For HRIS migration, see `HRIS_MIGRATION_GUIDE.md`.



