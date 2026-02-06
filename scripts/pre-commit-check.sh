#!/bin/bash
#
# Pre-commit quality check script
# Run this before committing to catch issues early.
#
# Usage:
#   ./scripts/pre-commit-check.sh          # Run typecheck + lint
#   ./scripts/pre-commit-check.sh --full   # Run typecheck + lint + tests
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

echo ""
echo "=========================================="
echo "  Loopwell Pre-Commit Quality Check"
echo "=========================================="
echo ""

# Function to run a check
run_check() {
    local name="$1"
    local command="$2"
    
    echo -n "Running $name... "
    
    if $command > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        FAILED=1
        return 1
    fi
}

# TypeScript check
run_check "TypeScript check" "npm run typecheck" || true

# Lint check
run_check "ESLint check" "npm run lint" || true

# Full mode: also run tests
if [ "$1" == "--full" ]; then
    echo ""
    echo "Running full checks (--full mode)..."
    echo ""
    
    # Unit tests
    run_check "Unit tests" "npm run test" || true
fi

# Summary
echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo -e "  ${GREEN}All checks passed!${NC}"
    echo "  Safe to commit."
else
    echo -e "  ${RED}Some checks failed.${NC}"
    echo "  Please fix issues before committing."
    echo ""
    echo "  To see detailed errors, run:"
    echo "    npm run typecheck"
    echo "    npm run lint"
    if [ "$1" == "--full" ]; then
        echo "    npm run test"
    fi
fi
echo "=========================================="
echo ""

exit $FAILED
