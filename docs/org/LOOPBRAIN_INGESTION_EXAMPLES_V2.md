# Loopbrain Ingestion Examples (Org) — v2 (Draft)

## Example — v2 Requested

**Request:**
```
GET /api/org/loopbrain/context?version=v2
```

Or via header:
```
GET /api/org/loopbrain/context
X-Loopbrain-Context-Version: v2
```

**Response:**
```json
{
  "context": {
    "generatedAt": "2025-01-01T00:00:00.000Z",
    "version": "v2",
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

**Note:**
- v2 currently mirrors v1 content, but carries `version: "v2"`.
- Structure will diverge from v1 when breaking improvements are made.

## Contract Reference
See `LOOPBRAIN_INGESTION_CONTRACT_V2.md` for the full contract specification.

