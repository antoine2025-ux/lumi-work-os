#!/bin/bash
# Script to run database migrations
# This can be run manually or via Vercel Build Hook

set -e

echo "Running Prisma migrations..."

# Try migrate deploy first (for production)
if npx prisma migrate deploy; then
    echo "✅ Migrations deployed successfully"
    exit 0
fi

# If migrate fails, try db push as fallback
echo "Migration deploy failed, trying db push..."
if npx prisma db push --accept-data-loss --skip-generate; then
    echo "✅ Database schema pushed successfully"
    exit 0
fi

echo "❌ Both migration methods failed"
exit 1

