# Loopbrain Testing Guide

This document describes how to test Loopbrain Q1–Q9 endpoints.

## Test Suite Overview

The Loopbrain test suite includes:
1. **Fixture seed** - Creates deterministic test data
2. **Integration sweep** - Calls all endpoints and prints a report
3. **Snapshot tests** - Validates response schemas remain stable

## Quick Start

### 1. Seed Fixtures

```bash
npm run seed:loopbrain
```

This creates:
- One org with 4 projects (healthy, constrained, insufficient, misaligned)
- People with availability windows
- Roles with responsibilities
- Project allocations

Fixture IDs are saved to `loopbrain-fixtures.json`.

### 2. Run Integration Sweep

```bash
# Start dev server first
npm run dev

# In another terminal, run sweep
npm run sweep:loopbrain
```

The sweep calls all Q1–Q9 endpoints and prints a formatted report.

### 3. Run Snapshot Tests

```bash
# Start dev server first
npm run dev

# Run snapshot tests
npm run test:loopbrain:snap
```

Snapshot tests validate that response schemas remain stable. If responses change, update snapshots with:

```bash
npm run test:loopbrain:snap:update
```

## Test Scenarios

### Project A: Payments Migration (Healthy)
- Complete accountability (owner + decision)
- Reasonable allocations
- Expected: Q1–Q9 all return high confidence

### Project B: Incident Hardening (Constrained)
- Overallocation (Sam 0.8, Dana 0.6)
- Dana unavailable during timeframe
- Expected: Q4 returns "unlikely_feasible", Q9 suggests "delay" or "request_support"

### Project C: Market Expansion (Insufficient)
- Missing decision authority
- No allocations
- Expected: Q2/Q8 show constraints, Q4 returns "insufficient_data"

### Project D: Legacy Cleanup (Misaligned)
- Product Manager owns "Legacy" project
- Role responsibilities don't include "Legacy"
- Expected: Q7 shows misalignment

## CI Integration

The Loopbrain test suite runs automatically on:
- Pull requests that modify Loopbrain code
- Pushes to `main` or `develop` branches

See `.github/workflows/loopbrain-tests.yml` for CI configuration.

## Troubleshooting

### Fixtures not found
```bash
# Re-seed fixtures
npm run seed:loopbrain
```

### Snapshots out of date
```bash
# Update snapshots after intentional changes
npm run test:loopbrain:snap:update
```

### Server not running
```bash
# Start dev server
npm run dev
```

### Database connection errors
```bash
# Ensure database is running
# Check DATABASE_URL environment variable
```

## Test Files

- `prisma/seed/loopbrain_fixtures.ts` - Fixture seed script
- `scripts/sweep-loopbrain.mjs` - Integration sweep script
- `src/lib/loopbrain/__tests__/loopbrain.snapshots.test.ts` - Snapshot tests
- `src/lib/loopbrain/testing/normalize.ts` - Response normalization utilities

## Normalization

Snapshot tests normalize dynamic fields to ensure deterministic snapshots:
- IDs → `<ID>`, `<PROJECT_ID>`, `<PERSON_ID>`
- Dates → `<DATE>`
- Arrays sorted deterministically

This prevents flaky tests from changing IDs or timestamps.

