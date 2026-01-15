# Loopbrain Ingestion Examples (Org) — v1

These examples illustrate the LoopbrainOrgContextV1 payload structure for common scenarios.

## Example A — Empty Org (fresh workspace)

```json
{
  "context": {
    "generatedAt": "2025-01-01T00:00:00.000Z",
    "version": "v1",
    "readiness": {
      "ready": false,
      "items": [
        { "key": "people_added", "complete": false, "meta": { "peopleCount": 0 } },
        { "key": "structure_defined", "complete": false, "meta": { "teamCount": 0, "deptCount": 0 } },
        { "key": "ownership_assigned", "complete": false, "meta": { "unownedEntities": 0 } },
        { "key": "reporting_defined", "complete": true, "meta": { "missingManagers": 0 } },
        { "key": "availability_set", "complete": false, "meta": { "availabilityUnknown": 0, "availabilityStale": 0 } }
      ]
    },
    "orgCounts": {
      "people": 0,
      "teams": 0,
      "departments": 0,
      "unownedEntities": 0,
      "missingManagers": 0,
      "availabilityUnknown": 0,
      "availabilityStale": 0
    },
    "intelligence": {
      "snapshot": null,
      "rollups": null,
      "topFindings": []
    },
    "recommendations": {
      "snapshot": null,
      "topActions": []
    }
  }
}
```

**Notes:**
- `readiness.ready` is `false` because `people_added.complete` is `false`
- `reporting_defined.complete` is `true` because with 0-1 people, reporting lines are not required
- All arrays are empty (not `null`)

## Example B — Ready Org (illustrative)

```json
{
  "context": {
    "generatedAt": "2025-01-02T00:00:00.000Z",
    "version": "v1",
    "readiness": {
      "ready": true,
      "items": [
        { "key": "people_added", "complete": true, "meta": { "peopleCount": 12 } },
        { "key": "structure_defined", "complete": true, "meta": { "teamCount": 3, "deptCount": 1 } },
        { "key": "ownership_assigned", "complete": true, "meta": { "unownedEntities": 0 } },
        { "key": "reporting_defined", "complete": true, "meta": { "missingManagers": 0 } },
        { "key": "availability_set", "complete": true, "meta": { "availabilityUnknown": 0, "availabilityStale": 0 } }
      ]
    },
    "orgCounts": {
      "people": 12,
      "teams": 3,
      "departments": 1,
      "unownedEntities": 0,
      "missingManagers": 0,
      "availabilityUnknown": 0,
      "availabilityStale": 0
    },
    "intelligence": {
      "snapshot": {
        "id": "snap_abc123",
        "createdAt": "2025-01-02T00:00:00.000Z",
        "source": "on_demand",
        "findingCount": 4
      },
      "rollups": {
        "totals": { "findings": 4 },
        "bySignal": {
          "MANAGEMENT_LOAD": 2,
          "OWNERSHIP_RISK": 1,
          "STRUCTURAL_GAP": 1
        },
        "bySeverity": {
          "HIGH": 1,
          "MEDIUM": 2,
          "LOW": 1
        }
      },
      "topFindings": [
        {
          "signal": "MANAGEMENT_LOAD",
          "severity": "HIGH",
          "entityType": "PERSON",
          "entityId": "pos_123",
          "title": "Management load",
          "explanation": "Alice manages 10 direct reports.",
          "evidence": { "directReportCount": 10, "positionId": "pos_123", "userId": "user_456" }
        }
      ]
    },
    "recommendations": {
      "snapshot": {
        "id": "snap_abc123",
        "createdAt": "2025-01-02T00:00:00.000Z"
      },
      "topActions": [
        {
          "id": "rec_789",
          "actionType": "REVIEW_MANAGEMENT_LOAD",
          "title": "Review management load",
          "description": "Alice manages 10 direct reports.",
          "severity": "HIGH",
          "entityType": "PERSON",
          "entityId": "pos_123",
          "fixHref": "/org/people/pos_123",
          "sourceFinding": { /* full finding object */ }
        }
      ]
    }
  }
}
```

**Notes:**
- All readiness items are `complete: true`, so `readiness.ready` is `true`
- `topFindings` and `topActions` contain actual objects (truncated for brevity)
- IDs and counts are illustrative; actual values depend on current org state
- `snapshot` objects are present when at least one snapshot exists

## Example C — Partially Complete Org

```json
{
  "context": {
    "generatedAt": "2025-01-03T00:00:00.000Z",
    "version": "v1",
    "readiness": {
      "ready": false,
      "items": [
        { "key": "people_added", "complete": true, "meta": { "peopleCount": 5 } },
        { "key": "structure_defined", "complete": true, "meta": { "teamCount": 2, "deptCount": 1 } },
        { "key": "ownership_assigned", "complete": false, "meta": { "unownedEntities": 1 } },
        { "key": "reporting_defined", "complete": false, "meta": { "missingManagers": 2 } },
        { "key": "availability_set", "complete": false, "meta": { "availabilityUnknown": 3, "availabilityStale": 0 } }
      ]
    },
    "orgCounts": {
      "people": 5,
      "teams": 2,
      "departments": 1,
      "unownedEntities": 1,
      "missingManagers": 2,
      "availabilityUnknown": 3,
      "availabilityStale": 0
    },
    "intelligence": {
      "snapshot": null,
      "rollups": null,
      "topFindings": []
    },
    "recommendations": {
      "snapshot": null,
      "topActions": []
    }
  }
}
```

**Notes:**
- Some readiness items are incomplete, so `readiness.ready` is `false`
- No snapshot exists yet, so `intelligence.snapshot` and `recommendations.snapshot` are `null`
- Arrays remain empty (not `null`) even when no data exists

## Contract Reference
See `LOOPBRAIN_INGESTION_CONTRACT_V1.md` for the full contract specification.

