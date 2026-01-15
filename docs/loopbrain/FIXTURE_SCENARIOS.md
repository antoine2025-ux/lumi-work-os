# Loopbrain Fixture Scenarios

This document explains the fixture org and projects created by `prisma/seed/loopbrain_fixtures.ts` for testing Loopbrain Q1–Q9 endpoints.

## Fixture Org Structure

**Org**: "Loopbrain Fixtures Org"

### Roles
- **Product Manager**
  - OWNERSHIP: "Product"
  - DECISION: "Product"
  - EXECUTION: "Planning"
- **Engineering Manager**
  - OWNERSHIP: "Engineering"
  - DECISION: "Engineering"
  - EXECUTION: "Delivery"
- **Engineer**
  - EXECUTION: "Delivery"

### People
- **Alex** (Product Manager) - Team: Product
- **Sam** (Engineering Manager) - Team: Engineering
- **Dana** (Engineer) - Team: Engineering
- **Chris** (Engineer) - Team: Engineering

### Availability
- **Dana**: UNAVAILABLE from 2025-12-20 to 2026-01-10
- **Chris**: PARTIAL (0.5) from 2025-12-16 to 2026-02-01

## Fixture Projects

### Project A: "Payments Migration" (Healthy-ish)

**Accountability**:
- Owner: Product Manager (role)
- Decision: Engineering Manager (role)
- Escalation: Sam (person)

**Allocations**:
- Sam: 0.3 ongoing
- Chris: 0.2 ongoing

**Expected Q1–Q9 Results**:
- **Q1**: Owner = Product Manager role ✅
- **Q2**: Decision = Engineering Manager role, Escalation = Sam ✅
- **Q3**: Candidates include Sam, Chris (allocated), Alex (owner role) ✅
- **Q4**: Possibly/likely feasible (depending on timeframe) ✅
- **Q5**: (N/A - person-scoped)
- **Q6**: Candidates from same role, team, allocations ✅
- **Q7**: Owner aligned (Product Manager owns "Product"), Decision aligned ✅
- **Q8**: Clear (owner + decision set) ✅
- **Q9**: Likely "proceed" or "possibly_feasible" ✅

**Purpose**: Validates complete accountability and reasonable capacity.

---

### Project B: "Incident Hardening" (Constrained)

**Accountability**:
- Owner: Sam (person)
- Decision: Sam (person)
- No escalation set

**Allocations**:
- Sam: 0.8 ongoing (overallocated)
- Dana: 0.6 ongoing (but Dana unavailable 2025-12-20 to 2026-01-10)

**Expected Q1–Q9 Results**:
- **Q1**: Owner = Sam ✅
- **Q2**: Decision = Sam, Escalation = unset (constraint) ⚠️
- **Q3**: Candidates constrained (Sam overallocated, Dana unavailable) ⚠️
- **Q4**: Unlikely feasible for tight timeframes (overallocation + unavailable) ⚠️
- **Q5**: Dana unavailable, return date = 2026-01-10 ✅
- **Q6**: Limited candidates (same team: Chris) ⚠️
- **Q7**: Person-based accountability (not evaluated) ℹ️
- **Q8**: Clear (owner + decision set) ✅
- **Q9**: Likely "delay" or "request_support" due to capacity constraints ⚠️

**Purpose**: Validates capacity constraints, overallocation detection, and availability impact.

---

### Project C: "New Market Expansion" (Insufficient Data)

**Accountability**:
- Owner: Product Manager (role)
- Decision: Not set ❌
- No escalation

**Allocations**:
- None

**Expected Q1–Q9 Results**:
- **Q1**: Owner = Product Manager role ✅
- **Q2**: Decision = unset (constraint) ❌
- **Q3**: Candidates from owner role (Alex) ✅
- **Q4**: Insufficient data (no allocations, no timeframe context) ❌
- **Q5**: (N/A - person-scoped)
- **Q6**: Candidates from same role ✅
- **Q7**: Owner aligned ✅
- **Q8**: Fragmented (missing decision authority) ❌
- **Q9**: Likely "reassign" (missing decision authority) or "insufficient_data" ❌

**Purpose**: Validates handling of missing accountability fields and insufficient data scenarios.

---

### Project D: "Legacy Cleanup" (Role Misalignment)

**Accountability**:
- Owner: Product Manager (role)
- Decision: Product Manager (role)
- No escalation

**Allocations**:
- None

**Expected Q1–Q9 Results**:
- **Q1**: Owner = Product Manager role ✅
- **Q2**: Decision = Product Manager role ✅
- **Q3**: Candidates from owner role ✅
- **Q4**: Insufficient data (no allocations) ⚠️
- **Q5**: (N/A - person-scoped)
- **Q6**: Candidates from same role ✅
- **Q7**: Potential misalignment (Product Manager responsibilities don't include "Legacy") ⚠️
- **Q8**: Clear (owner + decision set) ✅
- **Q9**: Likely "proceed" with alignment risk noted ⚠️

**Purpose**: Validates role alignment detection when project domain doesn't match role responsibilities.

## Test Scenarios Summary

| Project | Accountability | Capacity | Alignment | Expected Q9 Action |
|---------|---------------|----------|-----------|-------------------|
| Payments Migration | ✅ Complete | ✅ Reasonable | ✅ Aligned | Proceed |
| Incident Hardening | ⚠️ Missing escalation | ❌ Constrained | ℹ️ Person-based | Delay/Request Support |
| Market Expansion | ❌ Missing decision | ❌ Unknown | ✅ Aligned | Reassign/Insufficient Data |
| Legacy Cleanup | ✅ Complete | ⚠️ Unknown | ⚠️ Misaligned | Proceed (with risk) |

## Usage

1. **Seed fixtures**: `SEED_LOOPBRAIN_FIXTURES=true npm run seed`
2. **Run test sweep**: `npm run sweep:loopbrain`
3. **Verify results**: Check that each project returns expected Q1–Q9 responses

## Notes

- All dates are fixed (ISO 8601) for deterministic testing
- Fixture IDs are saved to `loopbrain-fixtures.json` for test scripts
- Projects are designed to exercise different code paths in Q1–Q9
- Missing data is intentional to test constraint handling

