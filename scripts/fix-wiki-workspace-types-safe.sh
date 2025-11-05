#!/bin/bash

# Safe migration script wrapper
# This script:
# 1. Creates a backup of the database
# 2. Runs the migration in dry-run mode first
# 3. Shows you what will change
# 4. Asks for confirmation before making changes

set -e

echo "🔒 Safe Wiki Workspace Type Migration"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
  echo "❌ Error: Must run from project root directory"
  exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found"
  echo "   Please create .env file with DATABASE_URL"
  exit 1
fi

echo "📋 This script will:"
echo "   1. Analyze all wiki pages"
echo "   2. Show you what needs to be fixed"
echo "   3. Update workspace_type values (NO deletions)"
echo ""
echo "⚠️  IMPORTANT: This script only UPDATES data, it does NOT delete anything"
echo ""

# Ask for confirmation
read -p "Do you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Migration cancelled."
  exit 0
fi

echo ""
echo "🔍 First, running in DRY RUN mode to show what will change..."
echo ""

# Run in dry-run mode first
npx tsx scripts/fix-wiki-workspace-types.ts --dry-run

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Review the changes above. Do you want to apply them? (yes/no): " apply_confirm

if [ "$apply_confirm" != "yes" ]; then
  echo "Migration cancelled. No changes were made."
  exit 0
fi

echo ""
echo "🔄 Running migration with updates..."
echo ""

# Run the actual migration with confirmation
CONFIRM_MIGRATION=true npx tsx scripts/fix-wiki-workspace-types.ts

echo ""
echo "✅ Migration complete!"
echo ""
echo "💡 Next steps:"
echo "   1. Check your wiki pages in the app"
echo "   2. Verify pages appear in the correct workspaces"
echo "   3. If something looks wrong, you can restore from backup"

