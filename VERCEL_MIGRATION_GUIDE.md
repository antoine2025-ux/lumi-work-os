# Vercel Database Migration Guide

## Problem
Vercel build environment cannot connect to the database during build time, so migrations fail.

## Solution

### Option 1: Run Migrations Manually (Recommended)

After deployment, run migrations manually:

```bash
# Set your production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy

# Or use db push if migrations don't work
npx prisma db push --accept-data-loss
```

### Option 2: Use Vercel Build Hook

1. Create a Vercel Build Hook (Settings → Git → Build Hooks)
2. Set it to run after deployment
3. Use the script: `scripts/run-migrations.sh`

### Option 3: Run SQL Script Directly

Connect to your production database and run:
```bash
psql $DATABASE_URL -f scripts/create-org-tables.sql
```

## Current Build Process

The build command now only:
- Generates Prisma Client (no DB connection needed)
- Builds the Next.js app

Migrations must be run separately after deployment.

## Quick Fix for Current Issue

Run this command locally (with production DATABASE_URL):

```bash
export DATABASE_URL="your-production-database-url"
npx prisma db push --accept-data-loss
```

This will create the missing tables immediately.

