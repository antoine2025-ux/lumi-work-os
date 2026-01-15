# Loopbrain Questions Roadmap (Org-backed)

## Overview

This document tracks the implementation status of Loopbrain's question-answering capabilities, all backed by Org v1 as a read-only context substrate.

## Implementation Status

### ✅ Implemented (Deterministic)

- **Q1**: Who owns this? (ProjectAccountability.owner)
  - Status: ✅ Complete
  - Endpoint: `GET /api/loopbrain/q1?projectId=...`
  - Implementation: `src/lib/loopbrain/q1.ts`

- **Q2**: Who decides this? (decision + escalation)
  - Status: ✅ Complete
  - Endpoint: `GET /api/loopbrain/q2?projectId=...`
  - Implementation: `src/lib/loopbrain/q2.ts`

- **Q3**: Who should be working on this right now? (constraints + candidates; optional ranking)
  - Status: ✅ Complete
  - Endpoint: `GET /api/loopbrain/org/q3?projectId=...`
  - Implementation: `src/lib/loopbrain/reasoning/q3.ts`

- **Q4**: Do we have capacity in timeframe? (confidence-based feasibility)
  - Status: ✅ Complete
  - Endpoint: `GET /api/loopbrain/org/q4?projectId=...&start=...&end=...`
  - Implementation: `src/lib/loopbrain/reasoning/q4.ts`

### ✅ Implemented (Deterministic)

- **Q5**: Who is unavailable and when do they return? (availability windows)
  - Status: ✅ Complete
  - Endpoint: `GET /api/loopbrain/q5?personId=...&at=...`
  - Implementation: `src/lib/loopbrain/q5.ts`

- **Q8**: Is responsibility clear or fragmented? (accountability completeness)
  - Status: ✅ Complete
  - Endpoint: `GET /api/loopbrain/q8?projectId=...`
  - Implementation: `src/lib/loopbrain/q8.ts`

### ✅ Implemented (Meta-reasoning)

- **Q6**: Who can cover? (coverage + roles + team context)
  - Status: ✅ Complete
  - Endpoint: `GET /api/loopbrain/q6?projectId=...`
  - Implementation: `src/lib/loopbrain/q6.ts`

- **Q7**: Is this aligned with role responsibilities? (alignment read model)
  - Status: ✅ Complete
  - Endpoint: `GET /api/loopbrain/q7?projectId=...`
  - Implementation: `src/lib/loopbrain/q7.ts`

- **Q9**: Proceed / reassign / delay / request support (decision framing only; no automation)
  - Status: ✅ Complete
  - Endpoint: `GET /api/loopbrain/q9?projectId=...&start=...&end=...`
  - Implementation: `src/lib/loopbrain/q9.ts`
  - Dependencies: Q1-Q8 (synthesizes all questions)

## Response Schema

All questions follow a consistent response schema defined in `src/lib/loopbrain/types.ts`:

```typescript
type LoopbrainBaseResponse = {
  questionId: string;
  timeframe?: { start: string; end: string };
  assumptions: string[];
  constraints: string[];
  risks: string[];
  confidence: "high" | "medium" | "low";
  errors?: LoopbrainError[];
};
```

Question-specific fields extend this base:
- Q1: `owner: OwnerDecisionValue`
- Q2: `decision: OwnerDecisionValue, escalation: OwnerDecisionValue`
- Q3: `viableCandidates: Q3Candidate[], suggestedOrdering?: Q3RankedCandidate[]`
- Q4: `feasibility: Q4Feasibility, capacitySummary: Q4CapacitySummary`
- Q5: `personId: string, name?: string, currentStatus: "available" | "partial" | "unavailable", returnDate?: string, activeWindows: Array<...>`
- Q6: `projectId: string, primaryOwner: OwnerDecisionValue, backups: {...}, candidates: Array<...>`
- Q7: `projectId: string, ownerAlignment?: {...}, decisionAlignment?: {...}, notes: string[]`
- Q8: `projectId: string, status: "clear" | "fragmented" | "unknown", missing: Array<"owner" | "decision">`
- Q9: `projectId: string, timeframe?: {...}, decision: {action: Q9Action, explanation: string[]}, options: Q9Option[], evidence: {...}`

## Testing Strategy

1. **Unit tests**: Test reasoning functions in isolation
2. **Integration tests**: Test API endpoints with mock data
3. **Fixture-based tests**: Test all questions against shared Org fixtures
4. **End-to-end tests**: Test full question set against golden path scenario

## Next Steps

1. ✅ Implement Q1 + Q2 (fast wins, establish pattern)
2. ✅ Implement Q5 (availability answer)
3. ✅ Implement Q8 (fragmentation)
4. ✅ Implement Q6 (coverage)
5. ✅ Implement Q7 (alignment)
6. ✅ Implement Q9 (decision framing)
7. 🧪 Create fixture-based test suite
8. 🧪 Run comprehensive testing against golden path

## Next: Fixtures + Full-Suite Testing

All questions Q1–Q9 are now implemented. Next steps:

1. **Seed fixtures**: Create test orgs with:
   - Healthy org (complete accountability, capacity, availability)
   - Constrained org (partial data, tight capacity)
   - Insufficient org (missing key fields)

2. **Snapshot response schema**: Validate all endpoints return expected shapes

3. **End-to-end harness**: Run full test sweep for Q1–Q9 against fixtures

4. **Golden path validation**: Test against the Org golden path scenario

## Notes

- Q3/Q4 are already implemented; Q1/Q2 standardize the pattern
- All questions use Org v1 read models only (no mutations)
- Missing data is meaningful; questions must handle "unset" gracefully
- Confidence levels reflect data completeness, not correctness

