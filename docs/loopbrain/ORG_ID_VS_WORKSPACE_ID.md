# Loopbrain: orgId vs workspaceId Semantics

This document clarifies how **orgId** and **workspaceId** are used across Loopbrain-related Prisma models and APIs, and how to interpret them after the Org merge.

## Summary

- **Context store and query logs** use **workspaceId** only. They are always workspace-scoped.
- **Config, feedback, outcomes, rollout, and suggestion runs** use **orgId** in the schema. In the current app, **orgId is often set to the workspace id** when using the workspace fallback in `getOrgContext()`. For a single-workspace-per-tenant deployment, orgId and workspaceId refer to the same tenant.

## Models by scope

### Workspace-scoped (use `workspaceId`)

| Model | Key field | Used by |
|-------|------------|---------|
| **ContextItem** | workspaceId | context-engine, store, indexing |
| **ContextEmbedding** | workspaceId | embedding-service, embedding-repository |
| **ContextSummary** | workspaceId | context-engine, summary-repository |
| **OrgQnaLog** | workspaceId | org Q&A logging |
| **OrgLoopbrainQueryLog** | workspaceId | org query analytics |
| **OrgLoopbrainQuery** | workspaceId | org query telemetry |
| **OrgIntelligenceSnapshot** | workspaceId | intelligence + Loopbrain indexing |
| **OrgIssueResolution** | workspaceId | issue resolution reconciliation |

All Loopbrain context retrieval, semantic search, and org context sync/bundle APIs use **workspaceId** from the session (via `getUnifiedAuth` + `assertAccess`).

### Org-scoped in schema (use `orgId`)

| Model | Key field | Used by |
|-------|------------|---------|
| **OrgLoopBrainConfig** | orgId | selectEngine, /api/org/loopbrain/engines |
| **LoopBrainFeedback** | orgId | /api/org/loopbrain/feedback, issues/apply |
| **LoopBrainOutcome** | orgId | outcomes, /api/org/loopbrain/metrics |
| **OrgLoopBrainRollout** | orgId | rollout, isLoopBrainEnabledForUser |
| **OrgSuggestionRun** | orgId | issues/preview, metrics |

These tables are written and read via **getOrgContext()**, which returns `orgId` (and optionally `orgName`, `role`).

## How orgId is resolved

- **getOrgContext()** (used by `/api/org/loopbrain/*` routes) calls **getActiveOrgContext()** in `src/server/orgContext.ts`.
- **getActiveOrgContext()**:
  1. Tries **OrgMembership** (legacy Org): if the user has an active org, it returns that org’s `id` and `name`.
  2. **Fallback:** If no OrgMembership (or query fails), it uses the user’s **Workspace** membership and returns **`membership.workspace.id` as `orgId`** and the workspace name as `orgName`.

So in deployments that do not use the legacy Org/OrgMembership flow, **orgId in the LoopBrain* and OrgSuggestionRun tables is effectively the workspace id**. That is the intended behavior for “workspace = org” tenancy.

## Implications for Loopbrain v1

- **Single tenant per workspace:** No change needed. Treat orgId in config/feedback/outcomes/rollout as the tenant id (same as workspace id when using fallback).
- **Future multi-org:** If you introduce a real Org entity and multiple orgs per workspace (or multiple workspaces per org), you will need to:
  - Decide whether Loopbrain config/feedback/outcomes are per-org or per-workspace.
  - Migrate or dual-write so that existing rows keyed by “workspace id as orgId” are correctly attributed (e.g. backfill a real orgId or migrate tables to workspaceId).
- **Queries:** When joining or filtering LoopBrain* tables with workspace-scoped data (e.g. OrgPosition, which uses workspaceId), use the same id for “tenant” in both places when using the fallback (workspace.id === orgId).

## Verification checklist (reconnect to Org)

After an Org merge or schema change, verify:

1. **getOrgContext semantics**
   - [ ] `getActiveOrgContext()` in `src/server/orgContext.ts` still tries OrgMembership first, then workspace fallback.
   - [ ] When fallback is used, `orgId` returned is `membership.workspace.id` (so LoopBrain* tables keyed by orgId align with workspace-scoped data).

2. **Loopbrain config keying**
   - [ ] `/api/org/loopbrain/engines`, `rollout`, `feedback`, `metrics` use `getOrgContext(req)` and use `ctx.orgId` for Prisma queries. No stale references to a separate Org table that no longer matches the domain.

3. **Single source of truth**
   - [ ] Loopbrain person/team/department context is built from **OrgPosition**, **OrgTeam**, **OrgDepartment** (all workspace-scoped). No reads from legacy Org-only tables for Loopbrain context.

4. **Stale references**
   - [ ] Grep for `orgId` in `src/server/loopbrain/` and `src/app/api/org/loopbrain/`: ensure all uses expect orgId to be the value returned by getOrgContext (workspace id when fallback).

## References

- `src/server/orgContext.ts` — getActiveOrgContext (OrgMembership vs workspace fallback).
- `src/server/rbac.ts` — getOrgContext.
- `docs/ORG_FEATURE_CURRENT_STATE_AUDIT.md` — Org vs Workspace domain model and drift notes.
