# Loopbrain Q4 API Documentation

## Overview

Q4 answers: **"Do we actually have capacity to do this in the given timeframe?"**

This is a confidence-based feasibility assessment, not a yes/no answer.

## Endpoint

```
GET /api/loopbrain/org/q4
```

## Request

### Query Parameters

- `projectId` (string, **required**)
  - The project ID to assess capacity for

- `start` (ISO date string, optional)
  - Start date of the timeframe
  - Default: current date/time

- `end` (ISO date string, **required if `durationDays` missing**)
  - End date of the timeframe
  - Must be after `start`

- `durationDays` (number, **required if `end` missing**)
  - Duration in days from `start`
  - Must be positive

### Examples

```bash
# Using end date
GET /api/loopbrain/org/q4?projectId=proj_123&start=2025-01-01T00:00:00.000Z&end=2025-01-31T00:00:00.000Z

# Using duration
GET /api/loopbrain/org/q4?projectId=proj_123&durationDays=30

# Using default start (now)
GET /api/loopbrain/org/q4?projectId=proj_123&end=2025-01-31T00:00:00.000Z
```

## Response

### Success (200 OK)

```json
{
  "assessment": "likely_feasible" | "possibly_feasible" | "unlikely_feasible" | "insufficient_data",
  "confidence": "high" | "medium" | "low",
  "assumptions": ["string", ...],
  "capacitySummary": "string (qualitative description)",
  "risks": ["string", ...],
  "constraints": ["string", ...],
  "timeframe": {
    "start": "ISO date string",
    "end": "ISO date string"
  },
  "candidates": [
    {
      "personId": "string",
      "name": "string",
      "effectiveCapacityPct": 0.5,
      "notes": ["string", ...]
    }
  ]
}
```

### Error (4xx/5xx)

```json
{
  "errors": [
    {
      "code": "ERROR_CODE",
      "message": "Human-readable error message"
    }
  ]
}
```

## Response Fields

### `assessment`

One of:
- `likely_feasible` - Capacity comfortably exceeds minimum expectations
- `possibly_feasible` - Capacity exists but with tight margins or risks
- `unlikely_feasible` - Capacity clearly insufficient
- `insufficient_data` - Missing Org data prevents assessment

**Important**: Assessment is confidence-based, never yes/no.

### `confidence`

One of:
- `high` - Assessment is reliable
- `medium` - Assessment has some uncertainty
- `low` - Assessment is unreliable due to missing data

### `assumptions`

List of explicit assumptions made during assessment:
- Timeframe interpretation
- Which Org data was used
- Stability assumptions (e.g., "assuming allocations remain stable")

### `capacitySummary`

Qualitative description of capacity:
- "roughly one full-time equivalent, split between 2 people"
- "very limited capacity, concentrated in 1 person"
- Avoids precise hour counts unless Org explicitly stores them

### `risks`

List of identified risks:
- Capacity risks (e.g., "single-point dependency")
- Dependency risks (e.g., "heavy reliance on one contributor")
- Data gaps (e.g., "insufficient Org data")

### `constraints`

List of constraints affecting feasibility:
- Ownership issues
- Capacity limitations
- Availability gaps

### `timeframe`

The interpreted timeframe:
- `start`: ISO date string
- `end`: ISO date string

### `candidates`

List of viable candidates (if available):
- `personId`: Person identifier
- `name`: Person name
- `effectiveCapacityPct`: Effective capacity (0..1)
- `notes`: Additional notes

## Error Codes

### 400 Bad Request

- `MISSING_PROJECT_ID` - `projectId` parameter is required
- `MISSING_TIMEFRAME` - Either `end` or `durationDays` is required
- `INVALID_DATE` - Invalid date format (use ISO 8601)
- `INVALID_TIMEFRAME` - End date must be after start date
- `INVALID_DURATION` - `durationDays` must be a positive number

### 404 Not Found

- `PROJECT_NOT_FOUND` - Project does not exist in workspace

### 401 Unauthorized

- `UNAUTHORIZED` - Authentication required

### 500 Internal Server Error

- `INTERNAL_ERROR` - Server error during assessment

## Important Notes

1. **No default timeframe**: If `end` and `durationDays` are both missing, the API returns 400.

2. **Missing data vs. invalid input**:
   - Invalid timeframe → 400 error
   - Missing Org data → `assessment: "insufficient_data"` (200 OK)

3. **Never yes/no**: Assessment is always confidence-based. The API never returns binary answers.

4. **Non-binding**: Assessment does not commit to delivery or assign work.

## Testing

Use the test script:

```bash
# Basic test
pnpm test:q4 --projectId <ID> --end 2026-01-31T00:00:00.000Z

# With custom start
pnpm test:q4 --projectId <ID> --start 2025-12-01T00:00:00.000Z --end 2026-01-31T00:00:00.000Z

# Using duration
pnpm test:q4 --projectId <ID> --durationDays 30
```

## Version

- Spec version: Q4.v1
- Depends on: Org v1 + Q3 implementation

