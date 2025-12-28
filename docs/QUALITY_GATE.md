# Production Readiness Quality Gate

This document describes the automated quality checks for Loopwell, including speed/latency monitoring, runtime error detection, regression testing, and security vulnerability scanning.

## Overview

The quality gate runs a series of checks that must pass before code can be merged. It supports both local development and CI workflows.

```bash
npm run quality:gate
```

## Quality Gate Tiers

### `quality:gate` (Fast - CI Default)

Runs the core checks that must pass:
- E2E Tests (Playwright)
- Dependency Audit (npm audit --audit-level=high)
- Secret Scan

### `quality:gate:strict` (Comprehensive)

Runs all checks including those with known pre-existing issues:
- TypeScript
- ESLint
- Unit Tests
- E2E Tests
- Security (deps, secrets, semgrep)

## Checks

| Check | Command | Description |
|-------|---------|-------------|
| TypeScript | `npm run typecheck` | Static type checking |
| ESLint | `npm run lint` | Code quality and patterns |
| Unit Tests | `npm run test` | Vitest unit tests |
| E2E Tests | `npm run test:e2e` | Playwright browser tests |
| Lighthouse | `npm run perf:lighthouse` | Performance and accessibility |
| Dependency Audit | `npm run security:deps` | npm audit for vulnerabilities |
| Secret Scan | `npm run security:secrets` | Detect hardcoded secrets |
| Semgrep | `npm run security:semgrep` | Static security analysis |

## Known Issues & Burndown Plan

The codebase has pre-existing issues that need cleanup. These are tracked below with a burndown plan.

### Current Baseline (as of Dec 28, 2025)

| Check | Issue Count | Status | Owner | Target Date |
|-------|-------------|--------|-------|-------------|
| TypeScript | ~500 errors | 🔴 Needs work | TBD | Q1 2026 |
| ESLint | ~780 errors | 🔴 Needs work | TBD | Q1 2026 |
| Unit Tests | ~13 failures | 🟡 In progress | TBD | Jan 2026 |
| E2E Tests | 0 failures | ✅ Passing | - | - |
| Security | 0 critical | ✅ Passing | - | - |

### Burndown Strategy

1. **Phase 1: Stop the bleeding** (Immediate)
   - All new code must pass typecheck and lint
   - No new test failures allowed
   - CI runs all checks but only fails on core gate

2. **Phase 2: Fix critical paths** (Week 1-2)
   - Fix TypeScript errors in `src/app/` and `src/components/`
   - Fix failing unit tests in `tests/api/`
   - Target: 50% reduction

3. **Phase 3: Full cleanup** (Week 3-4)
   - Fix remaining TypeScript/ESLint errors
   - Enable strict gate in CI
   - Target: 0 errors

### Files Excluded from TypeScript

Currently excluded in `tsconfig.json`:
- `scripts/**` - Build/seed scripts (non-critical)
- `tests/**` - Test files (separate config possible)
- `prisma/seed.ts` - Database seeding

## Running Locally

### Quick Check (Default Gate)

```bash
npm run quality:gate
```

### Strict Check (All Checks)

```bash
npm run quality:gate:strict
```

### Individual Checks

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm run test

# E2E tests (requires app to be running or uses built-in server)
npm run test:e2e

# E2E tests with UI (for debugging)
npm run test:e2e:ui

# Lighthouse CI
npm run build && npm run perf:lighthouse

# Security checks
npm run security:deps
npm run security:secrets
npm run security:semgrep
```

## Pass/Fail Thresholds

| Check | Pass Threshold | Notes |
|-------|---------------|-------|
| TypeScript | 0 errors | Warnings allowed but should be addressed |
| ESLint | 0 errors | Warnings allowed but tracked |
| Unit Tests | 100% pass | All tests must pass |
| E2E Tests | 100% pass | All smoke tests must pass |
| Lighthouse Performance | >= 70 | Score out of 100 |
| Lighthouse Accessibility | >= 90 | Score out of 100 |
| Lighthouse Best Practices | >= 80 | Score out of 100 |
| LCP (Largest Contentful Paint) | <= 3000ms | Core Web Vital |
| FCP (First Contentful Paint) | <= 2000ms | Core Web Vital |
| npm audit | No high/critical | Moderate allowed with justification |
| Secret scan | 0 matches | Any match fails the build |
| Semgrep | 0 errors | Warnings require review |

## E2E Server Modes

Playwright can run E2E tests in two modes, depending on the environment:

### Local Development (Fast Mode)

Uses the Next.js development server for fast iteration:

```bash
# Playwright starts dev server automatically
npm run test:e2e

# OR reuse existing dev server for speed (add to .zshrc or run before tests)
export E2E_REUSE_SERVER=true
npm run dev &
npm run test:e2e
```

**Behavior:**
- Command: `npm run dev`
- Server: Next.js development mode with hot reload
- Reuse: Only if `E2E_REUSE_SERVER=true` (default: starts fresh)
- Best for: Rapid test iteration during development

### CI (Stable Mode)

Uses a production build for consistency and reproducibility:

```bash
# This is what CI runs internally
npm run start:e2e  # = npm run build && next start -p 3000
```

**Behavior:**
- Command: `npm run start:e2e` (builds then starts production server)
- Server: Next.js production mode
- Reuse: Never (`reuseExistingServer: false`)
- Best for: CI pipelines, release validation

**Why production mode in CI?**
- Eliminates dev-mode variance (hot reload, development warnings)
- Matches production behavior exactly
- Prevents stale server state after dependency upgrades
- More stable and deterministic

## E2E Test Authentication

### Local Development

1. Run tests (server starts automatically): `npm run test:e2e`
2. If tests require authentication:
   - Record auth state: `npx playwright codegen --save-storage=.auth/user.json http://localhost:3000/login`
   - Complete Google OAuth login in the browser that opens
   - Close the browser - state is saved to `.auth/user.json`
3. Re-run tests: `npm run test:e2e`

### CI Environment

In CI, tests use the `/api/e2e-auth` endpoint which creates a test session.

**Required environment variables:**
- `E2E_AUTH_ENABLED=true` - Enables the E2E auth endpoint
- `E2E_AUTH_SECRET` - Secret for authenticating E2E requests
- `DATABASE_URL` - Database connection for seeding test user
- `NEXTAUTH_SECRET` - NextAuth secret for JWT signing

**CI Workflow:**
1. `npm run seed:e2e` - Creates/updates e2e@loopwell.test user
2. Auth setup calls `/api/e2e-auth` with secret header
3. Endpoint creates JWT session cookie
4. Tests run with authenticated session

**Security:**
- `/api/e2e-auth` returns 404 unless all guards pass:
  - `E2E_AUTH_ENABLED === "true"`
  - `NODE_ENV !== "production"`
  - `VERCEL_ENV !== "production"`
  - Valid `x-e2e-secret` header

## CI/CD Integration

The quality gate runs automatically on pull requests via GitHub Actions:

```yaml
# .github/workflows/quality-gate.yml
on:
  pull_request:
    branches: [main, develop]
```

### Required Secrets for CI

| Secret | Purpose |
|--------|---------|
| `E2E_AUTH_SECRET` | Secret for E2E auth endpoint |
| `DATABASE_URL` | Test database connection |
| `NEXTAUTH_SECRET` | NextAuth JWT secret |

### CI Job Summary

| Job | Required | Blocks PR |
|-----|----------|-----------|
| E2E Tests | Yes | Yes |
| Dependency Audit | Yes | Yes |
| Secret Scan | Yes | Yes |
| TypeScript | No | No (known issues) |
| ESLint | No | No (known issues) |
| Unit Tests | No | No (known issues) |
| Lighthouse | No | No (informational) |
| Semgrep | No | No (optional) |

## What to Do When Checks Fail

### E2E Test Failures

```bash
# Run with UI for debugging
npm run test:e2e:ui

# Run specific test
npm run test:e2e -- tests/e2e/todos.spec.ts

# View trace on failure
npx playwright show-trace test-results/*/trace.zip

# Re-record auth state (if session expired)
npx playwright codegen --save-storage=.auth/user.json http://localhost:3000/login
```

### Dependency Audit Failures

```bash
# View vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# If breaking changes, update manually:
npm update <package-name>
```

### Secret Scan Failures

```bash
# View matches
./scripts/scan-secrets.sh

# Fixes:
# - Move secrets to environment variables
# - Add to .env.local (never commit)
# - If false positive, add to scan-secrets.sh exclusions
```

### TypeScript Errors (Burndown)

```bash
# View all errors
npm run typecheck

# Focus on specific directory
npx tsc --noEmit --project tsconfig.json 2>&1 | grep "src/app/"
```

### ESLint Errors (Burndown)

```bash
# View errors
npm run lint

# Auto-fix where possible
npm run lint -- --fix
```

## Adding New Tests

### E2E Tests (Playwright)

Add to `tests/e2e/` directory:

```typescript
import { test, expect } from '@playwright/test'
import { waitForPageReady } from './helpers/page-ready'

test('new feature works', async ({ page }) => {
  await page.goto('/new-feature')
  await waitForPageReady(page)
  await expect(page.getByTestId('feature-element')).toBeVisible()
})
```

**Best practices:**
- Use `data-testid` attributes for stable selectors
- Use helper functions from `tests/e2e/helpers/page-ready.ts`
- Avoid `waitForTimeout` - use `expect().toBeVisible()` or `waitForResponse()`
- Test user flows, not implementation details

### Unit Tests (Vitest)

Add to `tests/` directory:

```typescript
import { describe, it, expect } from 'vitest'

describe('New Feature', () => {
  it('should work correctly', () => {
    expect(true).toBe(true)
  })
})
```

## Performance Budgets

| Metric | Budget | Measured On |
|--------|--------|-------------|
| JS Bundle (main) | < 200KB gzipped | Production build |
| LCP | < 3s | Login, Home pages |
| FID | < 100ms | All interactive pages |
| CLS | < 0.1 | All pages |

## Next Improvements

1. Burn down TypeScript errors to 0
2. Burn down ESLint errors to 0
3. Fix failing unit tests
4. Enable `quality:gate:strict` as default
5. Add visual regression testing (Percy or similar)
6. Add API contract testing
7. Add load/stress testing for critical endpoints
8. Integrate with monitoring (Sentry, DataDog)
9. Add code coverage thresholds
