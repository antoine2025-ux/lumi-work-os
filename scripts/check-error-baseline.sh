#!/bin/bash
# Error Baseline Enforcement Script
# Run before merging to ensure no regression

set -e

TS_BASELINE=525
TEST_BASELINE=19

echo "=== Error Baseline Check ==="
echo "Date: $(date)"
echo ""

# Check TypeScript errors
echo "Checking TypeScript errors..."
TS_ERRORS=$(npm run typecheck 2>&1 | grep -c "error TS" || echo 0)
echo "TypeScript: $TS_ERRORS errors (baseline: $TS_BASELINE)"

# Check test failures
echo ""
echo "Checking test failures..."
TEST_OUTPUT=$(npm test 2>&1 || true)
TEST_FAILS=$(echo "$TEST_OUTPUT" | grep -o "[0-9]* failed" | head -1 | awk '{print $1}')
TEST_FAILS=${TEST_FAILS:-0}
echo "Tests: $TEST_FAILS failures (baseline: $TEST_BASELINE)"

echo ""
echo "=== Results ==="

FAILED=0

if [ "$TS_ERRORS" -gt "$TS_BASELINE" ]; then
  echo "❌ TypeScript errors increased from $TS_BASELINE to $TS_ERRORS"
  FAILED=1
else
  echo "✅ TypeScript: $TS_ERRORS <= $TS_BASELINE"
fi

if [ "$TEST_FAILS" -gt "$TEST_BASELINE" ]; then
  echo "❌ Test failures increased from $TEST_BASELINE to $TEST_FAILS"
  FAILED=1
else
  echo "✅ Tests: $TEST_FAILS <= $TEST_BASELINE"
fi

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "FAILED: Error count regression detected"
  exit 1
fi

echo ""
echo "PASSED: All counts within baseline"
exit 0
