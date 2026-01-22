# Policy Enforcement - Error Baseline

**Date:** 2026-01-21  
**Commit:** 7a4ffcc

## Current Baseline

| Metric | Count | Baseline Date |
|--------|-------|---------------|
| TypeScript Errors | 525 | 2026-01-21 |
| Test Failures | 19 | 2026-01-21 |

## Enforcement Commands

### Check TypeScript Error Count

```bash
# Returns current error count
npm run typecheck 2>&1 | grep -c "error TS"
```

**Baseline:** 525 errors  
**Policy:** Count must not increase beyond 525

### Check Test Failure Count

```bash
# Returns test summary
npm test 2>&1 | grep -E "Tests.*failed"
```

**Baseline:** 19 failed  
**Policy:** Count must not increase beyond 19

## Automated Check Script

Add to `package.json` scripts or CI:

```bash
#!/bin/bash
# scripts/check-error-baseline.sh

TS_BASELINE=525
TEST_BASELINE=19

TS_ERRORS=$(npm run typecheck 2>&1 | grep -c "error TS" || echo 0)
TEST_FAILS=$(npm test 2>&1 | grep -o "[0-9]* failed" | head -1 | awk '{print $1}' || echo 0)

echo "TypeScript: $TS_ERRORS errors (baseline: $TS_BASELINE)"
echo "Tests: $TEST_FAILS failures (baseline: $TEST_BASELINE)"

if [ "$TS_ERRORS" -gt "$TS_BASELINE" ]; then
  echo "❌ TypeScript errors increased!"
  exit 1
fi

if [ "$TEST_FAILS" -gt "$TEST_BASELINE" ]; then
  echo "❌ Test failures increased!"
  exit 1
fi

echo "✅ Error counts within baseline"
exit 0
```

## Manual Check Before Merge

Before merging any PR:

```bash
# Quick check
npm run typecheck 2>&1 | grep -c "error TS"
# Must be <= 525

npm test 2>&1 | grep "Tests.*failed"
# Must be <= 19 failed
```

## Error Categories (For Future Cleanup)

### TypeScript (525 total)

| Directory | ~Errors | Priority |
|-----------|---------|----------|
| src/app/(dashboard)/org-legacy/ | 300 | Low (legacy) |
| src/server/org/ | 50 | Medium |
| src/lib/loopbrain/ | 45 | Medium |
| prisma/seed/ | 10 | Low |
| Other | 120 | Mixed |

### Tests (19 failures)

| Test File | Failures | Root Cause |
|-----------|----------|------------|
| tasks.auth.spec.ts | ~10 | Fixture workspace setup |
| access-control.spec.ts | ~5 | Same |
| workspace-scoping.sanity.test.ts | ~4 | Scoping disabled |

## Policy Decision

**Risk-Accept** these pre-existing errors with:
1. No new errors allowed
2. Baseline checked before each merge
3. Cleanup planned for dedicated sprint

---

**Last Updated:** 2026-01-21  
**Verified By:** Stabilization Engineer
