# Quick Fix: Create Missing Tables

## The Problem
The `org_departments` and `org_teams` tables don't exist in production yet.

## Quick Fix (Choose One Method)

### Method 1: Using Prisma DB Push (Easiest)

Run this command locally with your production DATABASE_URL:

```bash
# Get your production DATABASE_URL from Vercel:
# Vercel Dashboard → Your Project → Settings → Environment Variables → DATABASE_URL

# Set it locally (don't commit this!)
export DATABASE_URL="your-production-database-url-from-vercel"

# Push schema to create tables
npx prisma db push --accept-data-loss
```

### Method 2: Using SQL Script

1. Get your production DATABASE_URL from Vercel
2. Run the SQL script:

```bash
psql "your-production-database-url" -f scripts/create-org-tables.sql
```

### Method 3: Copy SQL and Run Manually

1. Open `scripts/create-org-tables.sql`
2. Copy all the SQL
3. Connect to your production database (via Supabase dashboard SQL editor, pgAdmin, etc.)
4. Paste and run the SQL

## Verify Tables Were Created

After running migrations, verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('org_departments', 'org_teams');
```

Should return both table names.

## After Tables Are Created

1. Try creating a department again - it should work!
2. Test creating teams, positions, and role cards
3. Everything should work normally

