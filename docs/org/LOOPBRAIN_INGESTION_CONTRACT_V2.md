# Loopbrain Ingestion Contract (Org) — v2 (Draft)

## Status
Draft scaffold to support future breaking improvements without breaking v1 ingestion.

## Endpoint Negotiation
- **Default**: v1
- **Request v2**:
  - Header: `X-Loopbrain-Context-Version: v2`
  - OR query: `?version=v2`

## Current v2 Shape
For now, v2 mirrors v1 fields and values, but carries:
- `version: "v2"`

This file will be updated when v2 diverges from v1.

## Compatibility Rules
- v1 remains the default until a formal migration plan is executed.
- v2 may introduce breaking changes relative to v1, but must remain internally consistent and validated.
- When v2 shape is finalized, update this document with complete field specifications and invariants.

## Related Documentation
- v1 Contract: `LOOPBRAIN_INGESTION_CONTRACT_V1.md`
- Examples: `LOOPBRAIN_INGESTION_EXAMPLES_V2.md`
- Changelog: `LOOPBRAIN_CONTEXT_CHANGELOG.md`

