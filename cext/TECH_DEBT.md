# TECH_DEBT.md — Loopwell Technical Debt Tracker

> **Single source of truth for all known technical debt.**
> Each item has enough context to pick up cold. Updated after each sweep or audit.
> Items move to DONE when fixed — don't delete them, so we have a record.

---

## How to Use This File

- Before starting any cleanup work, check here first
- Items are grouped by priority: P0 (blocks launch), P1 (pre-YC), P2 (post-launch)
- Some items have dependencies — check before starting
- After fixing an item, move it to the DONE section at the bottom with the date

---

## P0 — Must Fix Before MVP Launch

### `orgId` fallback pattern (tiered)
- **Tier B (code bugs): FIXED March 11, 2026** — Routes writing `{ orgId: workspaceId }` to models that only have `workspaceId` in the schema. 38 `as any` casts eliminated, 7 files fixed, 1 `@ts-nocheck` removed. Also fixed PersonSkill creating records with phantom `skill` field (should be `skillId` FK to Skill model), and PersonAvailability import using phantom unique constraint.
- **Tier A (schema): FIXED March 11, 2026** — Dropped `Project.orgId` and `OrgInvitation.orgId` columns via migration `20260311120000_remove_legacy_orgid_fields`. All code references updated to use `workspaceId` only. **Note:** The `Org` model itself still exists (referenced by OrgMembership, AuditLogEntry, Role) — that's a separate, larger cleanup.
- **Tier C (parameter naming): Still open** — server/lib function parameter names use `orgId`. Cosmetic, no runtime impact.
- **Effort remaining:** Tier C: 1-2 hours.
- **Risk:** Low for Tier C.

### `WORKSPACE_SCOPING_ENABLED` defaults to `false`
- **What:** The Prisma scoping middleware that enforces multi-tenant isolation is disabled by default. Application-layer `where: { workspaceId }` is the only defense.
- **Why it matters:** A missed `where` clause = cross-tenant data leak. The middleware is the safety net. A reviewer who finds it disabled will question every isolation claim.
- **Fix:** Set `WORKSPACE_SCOPING_ENABLED=true` in production environment variables. Test all critical flows first.
- **Effort:** 1 hour (set env var + smoke test critical routes)
- **Risk:** Medium — could surface queries that accidentally omit workspace scoping. That's the point — find them now, not in production.
- **Dependencies:** Verify all 152 models in `WORKSPACE_SCOPED_MODELS` are correct.




---

## P1 — Fix Before YC Review

### `as any` — complex Prisma types (~42 instances)
- **What:** Prisma queries with complex `include` statements return deeply nested types that don't match function signatures expecting simpler types. Developers cast with `as any` to silence the mismatch.
- **Why it matters:** TypeScript can't catch mismatches if a Prisma include changes. Bugs surface at runtime instead of compile time. No security impact — purely developer experience.
- **Fix:** Define typed result interfaces using `Prisma.ProjectGetPayload<typeof queryWithIncludes>` for each complex query. Or define manual interfaces matching the include shape.
- **Effort:** 15-20 minutes per file, ~42 files = ~12 hours total.
- **Risk:** Low — type-level only, no runtime changes.
- **Dependencies:** None. Can be done file by file in spare time.
- **Files:** See `as any` audit report (March 2026) — PRISMA-TYPE Sub-cluster C list.

### Orchestrator deletion
- **What:** `orchestrator.ts` is 5,400 lines of dead code behind `LOOPBRAIN_LEGACY=true` flag. The agent loop replaced it March 2, 2026.
- **Why it matters:** Dead code confuses search results, inflates codebase metrics, and risks someone accidentally adding features to it.
- **Fix:** Delete `orchestrator.ts`. Remove the `LOOPBRAIN_LEGACY` branch in the chat route. Clean up any imports.
- **Effort:** 30 minutes.
- **Risk:** Low — code is already unused. Keep a git tag before deletion as a rollback reference.
- **Dependencies:** Validate that all orchestrator modes have equivalents in the agent loop or scenario handlers. See conversation from March 2026 for mode-by-mode verification.

### Agent tool triple registration → auto-dispatch (ADR-008)
- **What:** Adding a new Loopbrain agent tool requires registering it in 3 files: `tool-schemas.ts`, `tool-registry.ts`, and the `executeReadTool` switch in `agent-loop.ts`. Missing any one causes silent failure.
- **Why it matters:** Every new tool risks the same bug we hit with `readWikiPage`. Slows development and causes debugging headaches.
- **Fix:** Replace the manual switch in `agent-loop.ts` with `toolRegistry.get(toolName).execute(args, ctx)`. Three tools already use this pattern — extend to all, delete the switch.
- **Effort:** 1-2 hours.
- **Risk:** Medium — touching the agent loop could break working tools. Test all tools after refactor.
- **Dependencies:** None.

### pgvector search placeholder
- **What:** `store/embedding-repository.ts` has vector search stubbed. Semantic search returns placeholder results.
- **Why it matters:** Loopbrain's wiki/doc search is keyword-only, not semantic. Limits answer quality for questions about document content.
- **Fix:** Wire the pgvector similarity search query using the existing embeddings.
- **Effort:** 2-3 hours.
- **Risk:** Low.
- **Dependencies:** Embeddings must be populated for workspace documents (check if the indexing pipeline runs).

### Load testing
- **What:** Never done. No baseline for how the system performs under concurrent load.
- **Why it matters:** 50 concurrent users hitting bootstrap + Loopbrain + real-time could surface connection pool exhaustion, slow queries, or memory leaks.
- **Fix:** Set up k6 or Artillery against staging. Establish baseline for: dashboard bootstrap, Loopbrain chat, wiki page load, project list.
- **Effort:** 1-2 days.
- **Risk:** May surface issues that need fixing.
- **Dependencies:** Staging environment must exist.

### Dependency audit
- **What:** `npm audit` has never been run systematically. Transitive dependencies may have known CVEs.
- **Why it matters:** A security reviewer will run `npm audit` as their first step.
- **Fix:** Run `npm audit`, address Critical and High CVEs, document accepted Low/Medium risks.
- **Effort:** 2-4 hours depending on findings.
- **Risk:** May require package upgrades that break compatibility.
- **Dependencies:** None.

### Infrastructure documentation
- **What:** Vercel, Railway, and Supabase configs are manual (dashboard clicks). No ENV var manifest or deployment runbook.
- **Why it matters:** Bus factor of 1. If Tony is unavailable, nobody can deploy or debug infrastructure.
- **Fix:** At minimum: document all environment variables, deployment steps, and service dependencies. Ideally: Terraform or Pulumi for infrastructure as code.
- **Effort:** 1 day for docs, 3-5 days for IaC.
- **Risk:** None for docs. IaC has migration risk.
- **Dependencies:** None.

---

## P2 — Post-Launch Improvements

### Yjs dual import issue
- **What:** Two copies of Yjs are loaded in the Next.js server, causing `instanceof` checks to fail. The Hocuspocus provider connects but never reaches "synced" state from server-side code.
- **Why it matters:** Blocks the live-streaming wiki drafting UX (Loopbrain writing into a page in real-time while the user watches). DB fallback works but no streaming.
- **Fix:** Add `resolve.alias` in webpack/bundler config to force a single Yjs instance. Or deduplicate via `npm dedupe` / package.json `overrides`.
- **Effort:** 1-3 hours to diagnose and fix.
- **Risk:** Low — bundler config change.
- **Dependencies:** None.

### Structured logging (Pino)
- **What:** Logging is ad-hoc `console.log` / `console.error`. No structured format, no log levels, no correlation IDs.
- **Why it matters:** Production debugging requires searchable, structured logs. Current logging is noise.
- **Fix:** Set up Pino with JSON output. Replace all console.log with logger.info/warn/error. Add request correlation IDs.
- **Effort:** 2-3 days.
- **Risk:** Low.
- **Dependencies:** Remove `console.log` first (P0 item).

### Error monitoring (Sentry)
- **What:** No error tracking in production. Errors are logged to stdout and lost.
- **Why it matters:** You won't know about production errors until users report them.
- **Fix:** Integrate Sentry. Add to error boundaries, API routes, and the agent loop.
- **Effort:** 1 day.
- **Risk:** None.
- **Dependencies:** None.

### E2E test coverage
- **What:** Playwright tests exist but coverage is minimal. Critical flows (onboarding, wiki CRUD, task CRUD, Loopbrain Q&A) need E2E coverage.
- **Why it matters:** Confidence that deployments don't break user-facing flows.
- **Fix:** Write Playwright tests for the 5 critical flows.
- **Effort:** 3-5 days.
- **Risk:** None.
- **Dependencies:** Test environment with seed data.

### Real-time collaboration auth hardening
- **What:** Hocuspocus `onAuthenticate` currently trusts `data.token` as userId. No JWT verification, no workspace isolation check.
- **Why it matters:** Anyone who guesses a userId can connect to any document's collaboration session.
- **Fix:** Verify JWT in `onAuthenticate`, check workspace membership, reject unauthorized connections.
- **Effort:** 2-3 hours.
- **Risk:** Low.
- **Dependencies:** JWT secret must be available to the Railway collab server.

---

## DONE — Completed Items

### ✅ `orgId` Tier A — schema migration (March 11, 2026)
- **Was:** `Project.orgId` and `OrgInvitation.orgId` columns existed in schema; ~69 routes used OR/fallback patterns.
- **Now:** Both columns dropped via migration `20260311120000_remove_legacy_orgid_fields`. All code uses `workspaceId` only. Org model retained (OrgMembership, AuditLogEntry, Role still reference it).

### ✅ `console.log` cleanup (March 11, 2026)
- **Was:** ~834 console statements in production paths (src/app/api/, src/lib/, src/server/)
- **Now:** ~588 remaining — all intentional. ~246 debug logs removed across ~58 files.
- **What was done:** Full sweep of all production paths. Removed debug/flow logs (console.log for tracing, duplicate console.error in catch blocks that also call handleApiError). Kept: startup/init logs with clear prefixes ([DB INIT], [PRISMA], [Hocuspocus], [Socket]), sole error handlers in catch blocks, and NODE_ENV/DEBUG-guarded dev logs. `npm run typecheck` passes clean after changes.

### ✅ handleApiError coverage (March 10, 2026)
- **Was:** 65.7% (327/498)
- **Now:** 90.5% (447/494) — 100% of eligible routes
- **What was done:** 3-round sweep, ~112 files modified. 47 excluded routes are auth/cron/webhook/dev/streaming with intentional patterns.

### ✅ Genuinely unprotected routes (March 10, 2026)
- **Was:** 7 routes with no auth
- **Now:** 0
- **What was done:** Deleted 4 test route directories. Added auth to org-context-diagnostics + 8 embed routes.

### ✅ Zod validation — user-facing mutations (March 10, 2026)
- **Was:** ~23% coverage
- **Now:** ~60% of mutating routes, 100% of user-facing mutations
- **What was done:** 8-phase sweep creating 19 validation files. Strategy: validate all user input, skip internal/webhook/empty-body. Decision documented in ARCHITECTURE_DECISIONS.md §9.

### ✅ `catch (error: any)` → `catch (error: unknown)` (March 10, 2026)
- **Was:** Unknown count
- **Now:** 0
- **What was done:** Global sweep, 34 files updated, 24 files needed type guards for .message/.stack/.code access.

### ✅ `as any` — security-relevant and easy-type casts (March 10, 2026)
- **Was:** 178 total
- **Now:** ~123 remaining (52 fixed: 23 easy-type, 5 easy-unknown, 8 body-parsing security, 6 nextAuthUser, 8 Prisma Json, 6 library gaps)
- **Remaining:** 58 blocked on orgId migration, ~42 complex Prisma types (P1), 3 debug/test
- **What was done:** 2-batch sweep across 35 files. All security-relevant casts eliminated.

### ✅ `ignoreBuildErrors: true` removed (March 11, 2026)
- **Was:** `next.config.ts` had `ignoreBuildErrors: true`, hiding build errors
- **Now:** Removed. `npm run build` passes clean (with `NODE_OPTIONS="--max-old-space-size=8192"` for heap size).
- **What was done:** Removed the `typescript: { ignoreBuildErrors: true }` block from `next.config.ts`. Build succeeded with 0 TypeScript errors. The build requires increased heap size due to the large codebase (~1,877 TS/TSX files, 162 Prisma models, 439 API routes). `npm run typecheck` also passes clean.

### ✅ `@ts-nocheck` files removed (March 11, 2026)
- **Was:** 2 files with `@ts-nocheck` disabling all type checking (`src/app/api/onboarding/plans/route.ts`, `src/app/api/onboarding/tasks/[id]/route.ts`)
- **Now:** Both files fully type-checked with 0 errors
- **What was done:**
  - **File 1 (`plans/route.ts`)**: Fixed 7 type errors
    1. Schema field mismatch: `employeeId` → `userId` (Prisma model uses `userId`)
    2. Schema field mismatch: `name` → `title` (Prisma model uses `title`)
    3. Template field mismatch: `durationDays` → `duration` (Prisma model uses `duration`)
    4. Relation mismatch: `employee` → `users` (Prisma relation name)
    5. Relation mismatch: `tasks` → `onboarding_tasks` (template tasks relation name)
    6. Task creation logic: Changed from creating tasks directly to creating `onboarding_task_assignments` (the actual task instances with status tracking)
    7. Added required fields: `id` and `updatedAt` for task assignments
    8. Implicit `any` types: Added explicit type annotation for `taskAssignmentsData` array
  - **File 2 (`tasks/[id]/route.ts`)**: Fixed 5 type errors
    1. Enum mismatch: `DONE` → `COMPLETED` (TaskStatus enum uses `COMPLETED`)
    2. Added missing enum value: `SKIPPED` to schema (exists in TaskStatus enum)
    3. Model mismatch: Route was trying to update `OnboardingTask` (template) instead of `onboarding_task_assignments` (instance)
    4. Relation mismatch: `plan` → `onboarding_plans` (Prisma relation name)
    5. Field mismatch: Removed `title`/`description` from schema (these belong to template task, not assignment)
    6. Added `notes` field (exists on assignment model)
    7. Removed duplicate Zod error handling (already handled by `handleApiError`)
  - Both files now follow the correct data model: `OnboardingTemplate` → `OnboardingTask` (template tasks) → `onboarding_task_assignments` (user-specific task instances with status/completion tracking)

### ✅ Activity model `workspaceId` (March 9, 2026)
- **Was:** Activity model missing workspaceId — flagged as P1 isolation gap
- **Now:** Fixed (was actually resolved before the session — verified all 6 layers)

### ✅ `currentMemberRole` hardcoded null (March 9, 2026)
- **Was:** `/api/org/current` returned `currentMemberRole: null`
- **Now:** Returns actual role from auth context

### ✅ Capacity issues pipeline disconnected (March 9, 2026)
- **Was:** `deriveCapacityIssues` never called from production pipeline. OVERALLOCATED_PERSON and UNAVAILABLE_OWNER evidence fields were empty stubs.
- **Now:** Fully wired with batch-fetched allocations and availability data. Capacity issue types flow through production issues pipeline.

---

*Last updated: March 11, 2026.*
*Update this file after every debt fix or audit.*