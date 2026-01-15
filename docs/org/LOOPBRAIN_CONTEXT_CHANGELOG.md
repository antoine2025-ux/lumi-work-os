# Loopbrain Context Feed Changelog

This changelog tracks changes to:
- `GET /api/org/loopbrain/context`
- Loopbrain ingestion contract docs/tests
- Any derived fields that affect payload meaning

## Entry Format
```
YYYY-MM-DD — [Patch | Minor | Major] — Summary
- What changed
- Why
- Backwards compatibility impact
- Tests updated
```

## v1 (Current)

### 2025-12-27 — Minor — Initial v1 contract documentation + contract test
- Introduced `LOOPBRAIN_INGESTION_CONTRACT_V1.md`
- Introduced `LOOPBRAIN_INGESTION_EXAMPLES_V1.md`
- Added org:loopbrain:contract test
- **Backwards compatibility**: N/A (initial version)
- **Tests**: Contract test added

### 2025-12-27 — Minor — Added v2 negotiation scaffold (v1 default remains)
- Added v2 types, builder, and validator scaffolds
- Added version negotiation (header `X-Loopbrain-Context-Version: v2` or query `?version=v2`)
- v1 remains default response when no version specified
- Created `LOOPBRAIN_INGESTION_CONTRACT_V2.md` (draft)
- Created `LOOPBRAIN_INGESTION_EXAMPLES_V2.md` (draft)
- Added org:loopbrain:contract:v2 test
- **Backwards compatibility**: v1 unchanged, v2 available via explicit request
- **Tests**: v2 contract test scaffold added

---

_(Add new entries above this line as changes are made)_

