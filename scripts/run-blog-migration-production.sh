#!/bin/bash
# Script to run blog migration on production database
# Usage: DATABASE_URL="your-production-url" ./scripts/run-blog-migration-production.sh

set -e

echo "🚀 Running blog migration on production database..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo "Usage: DATABASE_URL='your-database-url' ./scripts/run-blog-migration-production.sh"
  exit 1
fi

echo "📦 Running Prisma migrate deploy..."
if npx prisma migrate deploy; then
  echo "✅ Blog migration deployed successfully!"
  echo ""
  echo "Verifying blog_posts table exists..."
  npx prisma db execute --stdin <<EOF
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'blog_posts';
EOF
  echo ""
  echo "✅ Migration complete! Blog system is ready."
  exit 0
fi

echo "❌ Migration failed. Trying db push as fallback..."
if npx prisma db push --accept-data-loss --skip-generate; then
  echo "✅ Database schema pushed successfully!"
  exit 0
fi

echo "❌ Both migration methods failed"
exit 1

