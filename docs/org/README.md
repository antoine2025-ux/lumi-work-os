# Org Module Documentation

This directory contains documentation for the Org module, which provides organizational structure management, intelligence, and Loopbrain integration.

## Core Documentation

### Architecture & Guidelines
- **Engineering Ground Rules**: See root `Loopwell Org Module – Engineering Ground Rules.md` for architectural principles

### Loopbrain Integration
- **[Loopbrain Ingestion Contract (v1)](./LOOPBRAIN_INGESTION_CONTRACT_V1.md)**: Authoritative contract specification for Loopbrain Org context feed
- **[Loopbrain Ingestion Examples (v1)](./LOOPBRAIN_INGESTION_EXAMPLES_V1.md)**: Example payloads for common scenarios
- **[Loopbrain Ingestion Contract (v2)](./LOOPBRAIN_INGESTION_CONTRACT_V2.md)**: Draft v2 contract scaffold (for future breaking improvements)
- **[Loopbrain Ingestion Examples (v2)](./LOOPBRAIN_INGESTION_EXAMPLES_V2.md)**: Draft v2 example payloads

### Development
- **[Pre-Merge Checklist](./PRE_MERGE_CHECKLIST.md)**: Checklist for PRs touching Org module code

## Quick Links

- **Contract Endpoint**: `GET /api/org/loopbrain/context`
- **Health Check**: `GET /api/org/loopbrain/health`
- **Contract Version**: v1 (default), v2 (via `?version=v2` or `X-Loopbrain-Context-Version: v2` header)

## Key Principles

1. **Workspace Scoping**: All Org data is workspace-scoped via `workspaceId` (never `orgId`)
2. **Route Handlers Only**: No Server Actions in Org paths
3. **Strict Auth Pattern**: `getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma`
4. **Schema Truth**: No defensive fallbacks; schema requirements are enforced
5. **Contract Stability**: Loopbrain contract follows explicit versioning and backwards-compatibility rules
