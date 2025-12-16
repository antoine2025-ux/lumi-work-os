#!/bin/bash

# Production Safety Check Script
# This script validates that the codebase is ready for production deployment

echo "🔍 Running production safety checks..."

# Check for hardcoded development values
echo "📋 Checking for hardcoded development values..."

# Check for hardcoded workspace IDs
if grep -r "cmgl0f0wa00038otlodbw5jhn" src/ --exclude-dir=node_modules --exclude="**/seed*.ts" --exclude="**/test*.ts"; then
  echo "❌ Found hardcoded workspace ID: cmgl0f0wa00038otlodbw5jhn"
  exit 1
fi

# Check for dev user references
if grep -r "dev-user-1" src/ --exclude-dir=node_modules --exclude="**/seed*.ts" --exclude="**/test*.ts"; then
  echo "❌ Found hardcoded dev user ID: dev-user-1"
  exit 1
fi

# Check for dev@lumi.com in production code (should only be in seed scripts)
if grep -r "dev@lumi.com" src/ --exclude-dir=node_modules --exclude="**/seed*.ts" --exclude="**/test*.ts"; then
  echo "❌ Found dev@lumi.com in production code"
  exit 1
fi

# Check for development bypass patterns (only flag actual hardcoded assignments, not environment variable checks)
if grep -r "ALLOW_DEV_LOGIN.*=.*true[^']" src/ --exclude-dir=node_modules; then
  echo "❌ Found hardcoded ALLOW_DEV_LOGIN=true"
  exit 1
fi

if grep -r "PROD_LOCK.*=.*false[^']" src/ --exclude-dir=node_modules; then
  echo "❌ Found hardcoded PROD_LOCK=false"
  exit 1
fi

echo "✅ No hardcoded IDs or dev bypasses found"

# Check for proper environment variable usage
echo "📋 Checking environment variable usage..."

# Check that critical environment variables are referenced
if ! grep -r "process.env.NEXTAUTH_SECRET" src/ --exclude-dir=node_modules; then
  echo "⚠️  Warning: NEXTAUTH_SECRET not found in code"
fi

if ! grep -r "process.env.DATABASE_URL" src/ --exclude-dir=node_modules; then
  echo "⚠️  Warning: DATABASE_URL not found in code"
fi

# Check for unified auth usage
echo "📋 Checking for unified auth usage..."

# Count files using old auth methods
OLD_AUTH_COUNT=$(grep -r "getAuthenticatedUser.*getAuthenticatedUser" src/ --exclude-dir=node_modules | wc -l)
if [ "$OLD_AUTH_COUNT" -gt 0 ]; then
  echo "⚠️  Warning: Found $OLD_AUTH_COUNT files using old auth methods"
fi

# Count files using unified auth
UNIFIED_AUTH_COUNT=$(grep -r "getUnifiedAuth" src/ --exclude-dir=node_modules | wc -l)
echo "✅ Found $UNIFIED_AUTH_COUNT files using unified auth"

# Check for proper workspace context usage
echo "📋 Checking workspace context usage..."

WORKSPACE_CONTEXT_COUNT=$(grep -r "setWorkspaceContext" src/ --exclude-dir=node_modules | wc -l)
echo "✅ Found $WORKSPACE_CONTEXT_COUNT files using workspace context"

# Check for permission assertions
PERMISSION_COUNT=$(grep -r "assertAccess" src/ --exclude-dir=node_modules | wc -l)
echo "✅ Found $PERMISSION_COUNT files using permission assertions"

# Run ESLint with custom rules
echo "📋 Running ESLint with custom rules..."
if command -v npm &> /dev/null; then
  npm run lint
  if [ $? -ne 0 ]; then
    echo "❌ ESLint found issues"
    exit 1
  fi
else
  echo "⚠️  npm not found, skipping ESLint check"
fi

# Check TypeScript compilation
echo "📋 Checking TypeScript compilation..."
if command -v npx &> /dev/null; then
  npx tsc --noEmit
  if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed"
    exit 1
  fi
else
  echo "⚠️  npx not found, skipping TypeScript check"
fi

echo "✅ All production safety checks passed!"
echo "🚀 Codebase is ready for production deployment"
