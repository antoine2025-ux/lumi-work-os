#!/bin/bash

# Script to set up the database schema
# This loads environment variables from .env.local and runs Prisma commands

set -e

echo "🔧 Setting up database schema..."

# Load environment variables from .env.local
export $(grep -v '^#' .env.local | grep -E '^DATABASE_URL=|^DIRECT_URL=' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found in .env.local"
  exit 1
fi

if [ -z "$DIRECT_URL" ]; then
  echo "⚠️  Warning: DIRECT_URL not found, using DATABASE_URL"
  export DIRECT_URL="$DATABASE_URL"
fi

echo "✅ Using DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "✅ Using DIRECT_URL: ${DIRECT_URL:0:50}..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Push schema to database
echo "🗄️  Pushing schema to database..."
npx prisma db push --accept-data-loss

echo "✅ Database setup complete!"

