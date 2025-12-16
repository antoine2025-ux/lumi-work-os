#!/bin/bash
#
# Production Migration Script: Apply workspace_invites table
#
# This script applies the workspace_invites migration to production.
# Run this before deploying the invites feature to production.
#
# Usage:
#   DATABASE_URL="postgresql://..." ./scripts/apply-invites-migration-production.sh
#
# Or set DATABASE_URL in environment:
#   export DATABASE_URL="postgresql://..."
#   ./scripts/apply-invites-migration-production.sh

set -e  # Exit on error

echo "🔍 Checking production database migration status..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo ""
  echo "Usage:"
  echo "  DATABASE_URL=\"postgresql://user:pass@host:5432/db\" ./scripts/apply-invites-migration-production.sh"
  exit 1
fi

# Check migration status
echo "📊 Checking migration status..."
MIGRATION_STATUS=$(npx prisma migrate status 2>&1 | grep -i "workspace_invites\|20250116140000" || echo "")

if echo "$MIGRATION_STATUS" | grep -q "20250116140000_add_workspace_invites"; then
  echo "✅ Migration found in migration history"
else
  echo "⚠️  Migration not found in status - will attempt to apply anyway"
fi

# Check if table already exists
echo "🔍 Checking if workspace_invites table exists..."
TABLE_EXISTS=$(npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_invites') as exists;" 2>&1 | grep -i "true\|false" || echo "unknown")

if echo "$TABLE_EXISTS" | grep -qi "true"; then
  echo "✅ Table workspace_invites already exists"
  echo "   Skipping migration (table already present)"
  exit 0
fi

echo "📝 Table does not exist - applying migration..."

# Apply migration
echo "🚀 Applying migration: 20250116140000_add_workspace_invites"
npx prisma migrate deploy

# Verify table was created
echo "🔍 Verifying table creation..."
TABLE_EXISTS_AFTER=$(npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_invites') as exists;" 2>&1 | grep -i "true\|false" || echo "unknown")

if echo "$TABLE_EXISTS_AFTER" | grep -qi "true"; then
  echo "✅ Migration successful! Table workspace_invites created"
  echo ""
  echo "📋 Next steps:"
  echo "   1. Regenerate Prisma client: npx prisma generate"
  echo "   2. Restart your production application"
  echo "   3. Test invites: Follow docs/INVITES_SMOKE_TEST_CHECKLIST.md"
else
  echo "❌ Migration may have failed - table still does not exist"
  echo "   Check the error messages above"
  exit 1
fi
