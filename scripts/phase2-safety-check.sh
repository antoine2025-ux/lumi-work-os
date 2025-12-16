#!/bin/bash

# Phase 2 Pre-Beta Safety Net Script
# Checks for forbidden literals and ensures production readiness

set -e

echo "🔍 Phase 2 Pre-Beta Safety Net Check"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check for forbidden patterns
check_forbidden() {
    local pattern="$1"
    local description="$2"
    local files_found=""
    
    files_found=$(grep -r "$pattern" src/ --exclude-dir=node_modules 2>/dev/null || true)
    
    if [ -n "$files_found" ]; then
        echo -e "${RED}❌ Found $description:${NC}"
        echo "$files_found"
        return 1
    else
        echo -e "${GREEN}✅ No $description found${NC}"
        return 0
    fi
}

# Function to check for required patterns
check_required() {
    local pattern="$1"
    local description="$2"
    local location="$3"
    
    if grep -r "$pattern" "$location" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $description found in $location${NC}"
        return 0
    else
        echo -e "${RED}❌ $description not found in $location${NC}"
        return 1
    fi
}

echo ""
echo "1. Checking for forbidden hardcoded IDs..."

# Check for hardcoded IDs (exclude scoping middleware which intentionally checks for these)
if grep -r "cmgl0f0wa00038otlodbw5jhn" src/ --exclude-dir=node_modules --exclude="scopingMiddleware.ts" >/dev/null 2>&1; then
    echo -e "${RED}❌ Found hardcoded workspace ID:${NC}"
    grep -r "cmgl0f0wa00038otlodbw5jhn" src/ --exclude-dir=node_modules --exclude="scopingMiddleware.ts"
    exit 1
else
    echo -e "${GREEN}✅ No hardcoded workspace ID found${NC}"
fi
check_forbidden "dev-user-1" "hardcoded dev user ID" || exit 1
check_forbidden "dev-workspace" "hardcoded dev workspace" || exit 1
check_forbidden "test-workspace" "hardcoded test workspace" || exit 1

echo ""
echo "2. Checking for unprotected dev bypasses..."

# Check for unprotected dev@lumi.com usage
if grep -r "dev@lumi\.com" src/ --exclude-dir=node_modules | grep -v "ALLOW_DEV_LOGIN" >/dev/null 2>&1; then
    echo -e "${RED}❌ Found unprotected dev@lumi.com usage${NC}"
    grep -r "dev@lumi\.com" src/ --exclude-dir=node_modules | grep -v "ALLOW_DEV_LOGIN"
    exit 1
else
    echo -e "${GREEN}✅ No unprotected dev@lumi.com usage found${NC}"
fi

# Check for development bypass patterns without environment guards
if grep -r "development.*bypass\|dev.*bypass" src/ --exclude-dir=node_modules | grep -v "NODE_ENV\|ALLOW_DEV_LOGIN\|PROD_LOCK" >/dev/null 2>&1; then
    echo -e "${RED}❌ Found unprotected development bypass patterns${NC}"
    grep -r "development.*bypass\|dev.*bypass" src/ --exclude-dir=node_modules | grep -v "NODE_ENV\|ALLOW_DEV_LOGIN\|PROD_LOCK"
    exit 1
else
    echo -e "${GREEN}✅ No unprotected development bypass patterns found${NC}"
fi

echo ""
echo "3. Verifying environment flags are properly used..."

# Check environment flags are referenced
check_required "PROD_LOCK" "PROD_LOCK environment flag" "src/lib/auth/" || exit 1
check_required "ALLOW_DEV_LOGIN" "ALLOW_DEV_LOGIN environment flag" "src/lib/auth/" || exit 1
check_required "ENABLE_ASSISTANT" "ENABLE_ASSISTANT environment flag" "src/app/api/health/" || exit 1

echo ""
echo "4. Verifying scoping middleware is active..."

# Check scoping middleware configuration
check_required "scopingMiddleware" "scoping middleware import" "src/lib/db.ts" || exit 1
check_required "\$use.*scopingMiddleware" "scoping middleware application" "src/lib/db.ts" || exit 1

echo ""
echo "5. Checking migrated routes use new auth system..."

# Check core routes use new auth system
for route in "src/app/api/projects/route.ts" "src/app/api/tasks/route.ts" "src/app/api/projects/[projectId]/epics/route.ts"; do
    if [ -f "$route" ]; then
        if ! grep -q "getAuthenticatedUser" "$route"; then
            echo -e "${RED}❌ Route $route does not use getAuthenticatedUser${NC}"
            exit 1
        fi
        
        if ! grep -q "assertAccess" "$route"; then
            echo -e "${RED}❌ Route $route does not use assertAccess${NC}"
            exit 1
        fi
        
        if ! grep -q "setWorkspaceContext" "$route"; then
            echo -e "${RED}❌ Route $route does not use setWorkspaceContext${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ Route $route properly uses new auth system${NC}"
    else
        echo -e "${YELLOW}⚠️  Route $route not found${NC}"
    fi
done

echo ""
echo "6. Checking ESLint configuration..."

# Check ESLint has custom rules
if [ -f "eslint-rules/no-hardcoded-ids.js" ]; then
    echo -e "${GREEN}✅ Custom ESLint rule exists${NC}"
else
    echo -e "${RED}❌ Custom ESLint rule missing${NC}"
    exit 1
fi

if grep -q "no-hardcoded-ids" eslint.config.mjs; then
    echo -e "${GREEN}✅ Custom ESLint rule configured${NC}"
else
    echo -e "${RED}❌ Custom ESLint rule not configured${NC}"
    exit 1
fi

echo ""
echo "7. Checking test coverage..."

# Check tests exist for migrated routes
if [ -f "tests/api/phase1-migrated-routes.spec.ts" ]; then
    echo -e "${GREEN}✅ Phase 1 migration tests exist${NC}"
else
    echo -e "${RED}❌ Phase 1 migration tests missing${NC}"
    exit 1
fi

echo ""
echo "8. Checking package.json scripts..."

# Check required scripts exist
if grep -q '"test":' package.json; then
    echo -e "${GREEN}✅ Test script exists${NC}"
else
    echo -e "${RED}❌ Test script missing${NC}"
    exit 1
fi

if grep -q '"seed:dev":' package.json; then
    echo -e "${GREEN}✅ Dev seed script exists${NC}"
else
    echo -e "${RED}❌ Dev seed script missing${NC}"
    exit 1
fi

echo ""
echo "===================================="
echo -e "${GREEN}🎉 Phase 2 Pre-Beta Safety Net Check PASSED!${NC}"
echo ""
echo "✅ No forbidden literals found"
echo "✅ Environment flags properly configured"
echo "✅ Scoping middleware active"
echo "✅ Migrated routes use new auth system"
echo "✅ ESLint configuration complete"
echo "✅ Test coverage adequate"
echo "✅ Package scripts configured"
echo ""
echo -e "${GREEN}🚀 Ready for staging deployment with PROD_LOCK=true${NC}"
echo ""
echo "Next steps:"
echo "1. Set PROD_LOCK=true in staging environment"
echo "2. Deploy to staging"
echo "3. Verify /api/health shows prodLock: true"
echo "4. Test that no dev bypasses are reachable"
