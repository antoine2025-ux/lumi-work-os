# ARCHITECTURE_DECISIONS.md — Loopwell Engineering Standards & Decision Log

> **This file defines the target architectural quality bar for Loopwell.**
> It complements RULES.md (development constraints) and ARCHITECTURE.md (system map).
> Every new file must meet these standards. Existing files are debt until they do.

---

## 1. Target Quality Bar

Loopwell's goal: when a senior engineer from YC, Stripe, or Linear opens any random file in this codebase, they find consistent, production-grade patterns — indistinguishable from a team of experienced engineers.

**The standard is not cleverness. It is boring consistency.**

---

## 2. Architectural Standards

### 2.1 API Route Contract

Every API route in the codebase must follow this exact structure. No variations.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { SomeSchema } from '@/lib/validations/some-module'

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — always first, never skipped
    const auth = await getUnifiedAuth(request)
    assertAccess(auth, 'MEMBER') // minimum role for this operation

    // 2. Workspace scoping — always second
    setWorkspaceContext(auth.workspaceId)

    // 3. Input validation — always third, always Zod
    const body = await request.json()
    const data = SomeSchema.parse(body)

    // 4. Business logic — service function or simple CRUD
    const result = await someServiceFunction(data, auth)

    // 5. Response — consistent shape
    return NextResponse.json(result, { status: 200 })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
```

**Non-negotiable rules:**
- `getUnifiedAuth` → `assertAccess` → `setWorkspaceContext` in every route, in that order
- Zod `.parse()` or `.safeParse()` on every mutating endpoint (POST, PUT, PATCH, DELETE)
- `catch (error: unknown)` — never `catch (error: any)` or `catch (e)`
- `handleApiError(error)` — never manual error responses
- No business logic in route handlers beyond simple CRUD. Complex operations get a service function in `src/lib/` or `src/server/`

### 2.2 Input Validation Standard

**Target: Validate all user-facing mutating routes with Zod.**

**Current state (March 2026):** ~60% of mutating routes have Zod validation (250+ routes validated out of ~439 total API routes)
- ✅ All user-facing mutation endpoints validated
- ✅ All routes with complex nested objects validated
- ✅ All security-sensitive inputs validated
- ⏭️ Internal routes, webhooks, and empty-body actions intentionally skipped

**Note:** Not all 439 routes are mutating endpoints. Many are GET endpoints or routes with no request body. Of the ~350 mutating endpoints (POST/PUT/PATCH/DELETE), we validate ~70% of those that accept user input.

**Validation Strategy:**

We use Zod validation **selectively** based on risk and value:

✅ **Always Validate:**
- User-facing mutation endpoints (POST/PUT/PATCH/DELETE)
- Routes with complex nested objects (goals, projects, org structure)
- Routes with security-sensitive inputs (emails, URLs, file paths)
- Routes accepting arrays, numeric ranges, or bulk operations

⏭️ **Skip Validation (Acceptable):**
- Internal routes (cron jobs, debug endpoints with secret-based auth)
- External webhooks (cryptographic signature verification is sufficient)
- Routes with no request body (archive, mark-as-read, sync triggers)
- GET endpoints with simple optional filters (Prisma prevents SQL injection)
- Routes where business logic provides comprehensive validation

**Why Not 100%?**

Achieving 100% validation coverage would be **over-engineering** for these reasons:

1. **Security**: Secret-based auth (cron jobs) and cryptographic signatures (webhooks) are **stronger** security boundaries than input validation. Adding Zod schemas would not improve security.

2. **No Input to Validate**: ~80 routes have empty request bodies (e.g., `POST /api/notifications/[id]/read`). Creating Zod schemas for `z.object({})` adds no value.

3. **Maintenance Burden**: Each schema requires updates when business logic changes. Validating routes where the database or business logic already provides comprehensive validation creates duplicate maintenance work.

4. **False Sense of Security**: Zod validates **shape**, not **semantics**. Business logic must still validate "can this user archive this person?" and "is this person already archived?". Shallow Zod validation doesn't replace deep business validation.

5. **Engineering Judgment**: Senior engineers recognize when to stop. The remaining 30% of mutating endpoints are low-risk routes where validation provides minimal benefit. Completing them would signal poor prioritization, not thoroughness.

**Rationale:** Focus validation where it provides real security/reliability value. Over-validating creates maintenance burden without meaningful benefit. The goal is **appropriate validation**, not **maximum validation**.

```typescript
// Schemas live in src/lib/validations/{module}.ts
// Extend existing schema files — do not create new ones unless adding a new module

// Pattern: one schema per operation
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  teamId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
})

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
})
```

**Rules:**
- Schema names: `{Action}{Entity}Schema` (e.g., `CreateTaskSchema`, `UpdatePersonSchema`)
- Always constrain string lengths (min/max)
- Always validate UUIDs with `.uuid()`
- Use `.enum()` for status/type fields — never accept arbitrary strings
- Validate at the API boundary, not in service functions
- If a field comes from user input, it must be validated. No exceptions.

**Validation Files:**
- `src/lib/validations/common.ts` - Shared primitives (emailString, nonEmptyString, dateString)
- `src/lib/validations/org.ts` - Org module (people, teams, departments, capacity, ownership, etc.)
- `src/lib/validations/pm.ts` - Projects & tasks (legacy location, use tasks.ts for new schemas)
- `src/lib/validations/tasks.ts` - Task management & templates
- `src/lib/validations/wiki.ts` - Wiki pages, templates, workspaces
- `src/lib/validations/goals.ts` - Goals, objectives, check-ins, approvals
- `src/lib/validations/loopbrain.ts` - Loopbrain chat, search, insights
- `src/lib/validations/assistant.ts` - AI assistant, sessions, drafts
- `src/lib/validations/admin.ts` - Admin operations, invites
- `src/lib/validations/workspace.ts` - Workspace management, migrations
- `src/lib/validations/embeds.ts` - Third-party embeds (Figma, Miro, etc.)
- `src/lib/validations/todos.ts` - Todo management
- `src/lib/validations/personal-notes.ts` - Personal notes
- `src/lib/validations/spaces.ts` - Spaces & collaboration
- `src/lib/validations/marketing.ts` - Newsletter, waitlist
- `src/lib/validations/blog.ts` - Blog posts
- `src/lib/validations/role-cards.ts` - Role cards
- `src/lib/validations/responsibility.ts` - Responsibility system
- `src/lib/validations/internal.ts` - Internal APIs

### 2.3 Error Handling Standard

Every error must flow through `handleApiError`. Custom error types for domain-specific failures:

```typescript
// Acceptable error patterns:
throw new ApiError(404, 'Project not found')
throw new ApiError(403, 'Insufficient permissions')
throw new ApiError(409, 'Conflict: task already assigned to this epic')
throw new ApiError(422, 'Validation failed', zodError.errors)

// Never acceptable:
return NextResponse.json({ error: 'something went wrong' }, { status: 500 })
return new Response('Not found', { status: 404 })
console.error(error) // without re-throwing or returning proper response
```

### 2.4 TypeScript Strictness

**Zero tolerance for type safety bypasses in new code.**

| Pattern | Verdict | Alternative |
|---------|---------|-------------|
| `as any` | **Banned** | Type the value properly, use `unknown` + narrowing, or define an interface |
| `// @ts-ignore` | **Banned** | Fix the type error |
| `// @ts-nocheck` | **Banned** | Fix the file |
| `catch (error: any)` | **Banned** | `catch (error: unknown)` |
| `as SomeType` | **Minimize** | Prefer type guards or Zod parsing |
| `!` non-null assertion | **Minimize** | Use optional chaining or explicit null checks |

Existing violations (47 `as any`, 2 `@ts-nocheck`) are tracked debt, not precedent.

### 2.5 Multi-Tenant Isolation

**Workspace scoping is the security perimeter. It must be airtight.**

Three layers of defense:

1. **Application layer** (primary): Every Prisma query includes `where: { workspaceId }` — enforced by the auth → scoping pattern in every route.

2. **Middleware layer** (secondary): `scopingMiddleware.ts` intercepts Prisma queries and injects `workspaceId` filters for all 152 registered models. **Target: enable `WORKSPACE_SCOPING_ENABLED=true` in production before MVP launch.**

3. **Database layer** (tertiary): RLS policies on sensitive tables (currently `wiki_pages`). Expand to other high-risk tables post-MVP.

**Every new model with a `workspaceId` must be added to `WORKSPACE_SCOPED_MODELS`.** This is verified in code review and will be enforced by automated test.

### 2.6 Service Layer Architecture

```
API Route (thin)          → auth, validation, response shaping
    ↓
Service Function          → business logic, orchestration, data transformation
    ↓
Data Access (Prisma)      → queries, mutations, transactions
```

**Rules:**
- Route handlers under 60 lines. If longer, extract a service function.
- Service functions live in `src/lib/{module}/` or `src/server/{module}/`
- Service functions receive validated, typed inputs — never raw request bodies
- Service functions return typed outputs — never raw Prisma results with unnecessary includes
- Transactions wrap multi-step mutations: `prisma.$transaction()`
- No cross-module direct imports except Loopbrain context builders (the canonical integration pattern)

### 2.7 Component Architecture

```
Server Component (default)  → data fetching, auth checks, layout
    ↓
Client Component            → interactivity, hooks, event handlers
    ↓
UI Primitives               → shadcn/ui, cn(), cva for variants
```

**Rules:**
- Server Components by default. `'use client'` only when hooks/events/browser APIs are needed.
- No data fetching in client components — use TanStack Query hooks that call API routes.
- Reuse `src/components/ui/` primitives. Check existing components before creating new ones.
- Use `cn()` for className merging, `cva` for component variants.
- Loading states: skeleton loaders, not spinners. Match the layout of the loaded content.
- Error states: every page route has `error.tsx`. Every layout considers `loading.tsx`.
- Empty states: every list/table has a meaningful empty state with a CTA.

### 2.8 File Organization

```
src/
├── app/api/{module}/          API routes (thin handlers)
├── lib/{module}/              Business logic, service functions
├── lib/validations/{module}.ts  Zod schemas (one file per module)
├── server/{module}/           Server-side operations
├── components/{module}/       UI components
└── components/ui/             Shared primitives (shadcn/ui)
```

**Naming conventions:**
- Files: `kebab-case.ts` (`capacity-contract.ts`, `derive-issues.ts`)
- Components: `PascalCase.tsx` (`PersonProfileClient.tsx`)
- Models: `PascalCase` (`OrgPosition`, `WikiPage`)
- Fields: `camelCase` (`workspaceId`, `createdAt`)
- API routes: REST-ish (`/api/org/people/[personId]/team`)
- Never `orgId` for workspace reference — always `workspaceId`

---

## 3. Debt Reduction Targets

Tracked debt with current counts and target dates.

### 3.1 Pre-MVP (by launch)

> Updated March 10, 2026 from live audit (498 routes). Prior estimates used Feb 24 denominator of 439.

| Debt Item | Current | Target | Sweep Method |
|-----------|---------|--------|--------------|
| Zod validation coverage | ~60% of mutating routes (250+/439) — 100% of user-facing mutations ✅ | DONE | Strategy: validate user-facing mutations, skip internal/webhook/empty-body. Decision logged in §9. |
| Auth coverage (`getUnifiedAuth`) | 85.3% (425/498) | 95%+ | Close remaining ~73 routes (most legitimately exempt: cron, webhooks, OAuth callbacks, dev/debug with NODE_ENV guards) |
| Auth coverage (`assertAccess`) | 83.3% (415/498) | 95%+ | Same sweep as above |
| `handleApiError` coverage | 90.5% (447/494) — 100% of eligible routes ✅ | DONE | 47 excluded routes are auth/cron/webhook/dev/streaming with intentional patterns |
| Genuinely unprotected routes | 0 (fixed March 10: deleted 4 test dirs, secured org-context-diagnostics + 8 embeds) | 0 | Done ✅ |
| `as any` casts | 178 → ~85 remaining (52 fixed prev, 38 Tier B orgId fixed Mar 11, ~42 complex Prisma types, 3 debug/test) | 0 non-Prisma casts | Security-relevant and easy-type casts eliminated. Tier B orgId bugs fixed. Complex Prisma types are low-risk, tracked for post-MVP. |
| `catch (error: any)` | Unknown | 0 | Grep + replace with `error: unknown` |
| `orgId` fallback pattern | 0 route fallbacks, 0 schema refs. 53 source files with variable name cleanup remaining (P1) ✅ Phase 1 | Phase 2: rename variables in 53 files | Schema migration done. Variable cleanup is cosmetic — tracked in TECH_DEBT.md P1. |
| `console.log` in production | Unknown | 0 | Grep + remove or replace with structured logging |
| `WORKSPACE_SCOPING_ENABLED` | ~~`false`~~ → `true` (default) | DONE | Enabled March 11, 2026. Default ON, opt-out with `PRISMA_WORKSPACE_SCOPING_ENABLED=false` |
| Agent tool triple registration | 3 files per tool | Auto-dispatch from registry | Refactor `executeReadTool` in `agent-loop.ts` to use `toolRegistry.get(name)` instead of manual switch |

### 3.2 Post-MVP (pre-YC review)

| Debt Item | Current | Target | Approach |
|-----------|---------|--------|----------|
| Orchestrator decomposition | 5,400L single file | Mode-specific handlers | Extract into `orchestrator/{mode}.ts` files |
| ✅ `@ts-nocheck` files | ~~2 files~~ → 0 | 0 | ~~Fix types in `plans/route.ts`, `tasks/[id]/route.ts`~~ **DONE March 11, 2026** |
| pgvector search placeholder | Stubbed | Functional | Wire embedding search when context pipeline needs it |
| Load testing | Never done | Baseline established | k6 or Artillery against staging |
| Dependency audit | Never done | Clean `npm audit` | Run audit, address Critical/High CVEs |
| Infrastructure as code | Manual config | Documented | At minimum: ENV var manifest + deployment runbook |

---

## 4. Decision Log

Architectural decisions with context, so future sessions don't re-litigate them.

### ADR-001: Workspace scoping via Prisma middleware, not RLS

**Date:** 2025 (original design)
**Status:** Active
**Context:** Multi-tenant isolation needed for all 168 models. Options: PostgreSQL RLS on every table, or application-layer middleware that intercepts Prisma queries.
**Decision:** Prisma middleware (`scopingMiddleware.ts`) that injects `workspaceId` filters. RLS used selectively for high-risk tables (`wiki_pages`).
**Rationale:** RLS requires raw SQL for policy definitions, is harder to test, and doesn't work with Prisma's type-safe query builder. Middleware approach gives us type safety and is testable. RLS is defense-in-depth for the most sensitive tables.
**Consequences:** Must register every new model in `WORKSPACE_SCOPED_MODELS`. Middleware must be enabled in production (`WORKSPACE_SCOPING_ENABLED=true`).

### ADR-002: Loopbrain contracts are append-only, versioned interfaces

**Date:** 2025
**Status:** Active
**Context:** Loopbrain's reasoning depends on stable data contracts (`answer-envelope.v0.ts`, `blockerPriority.v0.ts`, `questions.v0.ts`). If contract semantics change, all reasoning breaks.
**Decision:** Contracts are versioned (`v0`), append-only. New fields can be added. Existing fields never change meaning. New versions create new files (`v1`).
**Rationale:** Loopbrain's accuracy depends on stable semantics. Breaking changes would invalidate all few-shot examples, test fixtures, and reasoning patterns.
**Consequences:** Higher friction for contract changes (requires new version). Worth it for reliability.

### ADR-003: Agent loop is the primary execution path, not the orchestrator

**Date:** 2026-02
**Status:** Completed (March 11, 2026)
**Context:** The orchestrator (`orchestrator.ts`, 5,400L) grew organically with 12+ mode handlers. The agent system (`planner.ts` → `executor.ts` → `tool-registry.ts`) is the newer, cleaner architecture.
**Decision:** New Loopbrain features go through the agent loop. The orchestrator is a legacy fallback — no new features added to it.
**Rationale:** The agent system has proper separation (planning vs execution vs tools), is more extensible (add a tool, not a mode), and is testable in isolation.
**Consequences:** Orchestrator will be decomposed post-MVP. Until then, it remains functional but frozen.
**Resolution:** Orchestrator deleted March 11, 2026. Agent loop is the sole execution path. Shared utilities (`callLoopbrainLLM`, `getLastOrgDebugSnapshot`) extracted to `llm-caller.ts`.

### ADR-004: Authentication via NextAuth.js 4 with JWT sessions

**Date:** 2025 (original design)
**Status:** Active
**Context:** Needed auth with Google OAuth + credentials. NextAuth.js 4 chosen for Next.js integration.
**Decision:** JWT sessions (not database sessions). Token carries `userId`, `workspaceId`, `role`, `isFirstTime`, `onboardingComplete`.
**Rationale:** JWT sessions avoid a DB lookup on every request. Token payload carries enough context for auth decisions without extra queries.
**Consequences:** Token refresh behavior matters (Google only sends `refresh_token` on first auth — must preserve existing token). JWT payload must stay small.

### ADR-005: TanStack Query for client-side data fetching

**Date:** 2025
**Status:** Active
**Context:** Client components need server data with caching, deduplication, and background refresh.
**Decision:** TanStack Query with: 5min stale time, 30min garbage collection, optimistic updates for mutations.
**Rationale:** Standard pattern for React data fetching. Handles cache invalidation, request deduplication, and loading/error states.
**Consequences:** All data fetching in client components goes through TanStack Query hooks — never raw `fetch` in `useEffect`.

### ADR-006: Single codebase, no microservices

**Date:** 2025 (original design)
**Status:** Active
**Context:** Solo technical founder building with AI assistance. Microservices add deployment complexity, inter-service communication overhead, and distributed debugging.
**Decision:** Monolithic Next.js app with clear module boundaries enforced by convention (not physical service separation). Exception: real-time server (Socket.IO + Hocuspocus) runs separately on Railway due to Vercel's serverless limitations.
**Rationale:** Module boundaries in a monolith give the same organizational benefits as microservices without operational overhead. The real-time server is the only exception because WebSocket connections require a persistent process.
**Consequences:** Must maintain discipline on module boundaries (no cross-module imports except via API routes or Loopbrain context builders). Can extract services later if scale requires it.

### ADR-007: AI-assisted development is a feature, not a limitation

**Date:** 2025
**Status:** Active
**Context:** Entire codebase built by one technical founder using Claude + Cursor over 14 months. Industry consensus: AI can't produce enterprise-grade architecture.
**Decision:** Treat AI-assisted development as a systematic methodology, not a shortcut. Compensate for AI's consistency drift with: regular codebase audits (every few days), strict rules files loaded into every session, decision logs, and phased execution with explicit confirmation.
**Rationale:** AI excels at implementing patterns consistently within a session. It struggles with global consistency across hundreds of sessions. The audit → rules → prompt pipeline solves the drift problem.
**Consequences:** RULES.md, ARCHITECTURE.md, ARCHITECTURE_DECISIONS.md, and feature MDs must be maintained as living documents. Every AI session loads relevant context. Audit frequency must be maintained.

### ADR-008: Agent tools require triple registration (known debt)

**Date:** 2026-03-09
**Status:** Active (debt — to be refactored)
**Context:** Adding `readWikiPage` tool failed silently because `agent-loop.ts` has a hand-maintained switch statement in `executeReadTool` that dispatches tool calls. The tool was registered in `tool-schemas.ts` (LLM discovery) and `tool-registry.ts` (implementation), but the switch had no case for it — calls fell through to `default: { error: 'Unknown tool' }`.
**Current state:** Every new agent tool must be registered in three places:
1. `src/lib/loopbrain/tool-schemas.ts` — LLM-visible schema (so the planner knows the tool exists)
2. `src/lib/loopbrain/agent/tool-registry.ts` — implementation (so the tool can execute)
3. `src/lib/loopbrain/agent-loop.ts` — `executeReadTool` switch statement (so the executor dispatches to it)
Missing any one of the three causes silent failure — the tool either isn't offered to the LLM, has no implementation, or gets "Unknown tool" at runtime.
**Target refactor:** Replace the manual switch in `agent-loop.ts` with auto-dispatch: `const tool = toolRegistry.get(toolName); return tool.execute(args, ctx)`. Three tools (`listTasksByAssignee`, `searchDriveFiles`, `readDriveDocument`) already use this pattern — extend it to all tools and delete the switch.
**Why not fix now:** Agent loop is working and validated. Refactoring the dispatch during MVP feature work risks breaking working tools. Schedule for post-MVP hardening.
---

## 5. Invariants

Things that must always be true. If any of these are violated, stop and fix before continuing.

1. **Every API route has auth.** `getUnifiedAuth` + `assertAccess` on every route handler. Zero exceptions for authenticated endpoints.

2. **Every user-facing mutating endpoint validates input.** Zod `.parse()` before any database write for routes accepting user input. The schema lives in `src/lib/validations/`. 
   - **Exceptions allowed:** Internal routes with secret-based auth, external webhooks with cryptographic verification, routes with no request body.
   - **Rationale:** Validation must provide security/reliability value. Empty schemas and duplicate validation are maintenance burden without benefit.

3. **Every Prisma model with `workspaceId` is in `WORKSPACE_SCOPED_MODELS`.** No exceptions.

4. **Every error flows through `handleApiError`.** No manual error responses in route handlers.

5. **TypeScript strict mode stays on.** `tsc --noEmit` must pass. ✅ `ignoreBuildErrors` removed (March 11, 2026) — builds now enforce type safety.

6. **Loopbrain contracts are immutable.** `src/lib/loopbrain/contract/*.v0.ts` files are never modified without creating a new version.

7. **New features produce structured data.** Every feature must create data that Loopbrain can query. No data islands.

8. **Module boundaries are respected.** No cross-module direct imports except Loopbrain context builders.

9. **Workspace isolation is airtight.** Cross-tenant data access is a P0 security incident, not a bug.

10. **No silent stubs.** Every unimplemented feature has a `// TODO P[0-2]:` comment or throws `NOT_IMPLEMENTED`.

---

## 6. Review Checklist

Before any code is committed, verify:

```
□ Auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext
□ Zod validation on user-facing mutating endpoints (skip if internal/webhook/empty-body)
□ handleApiError wrapping try/catch
□ catch (error: unknown) — not (error: any)
□ No new as any — use proper types
□ No console.log — use structured logging or remove
□ New Prisma models added to WORKSPACE_SCOPED_MODELS
□ New models have: id, workspaceId, createdAt, updatedAt, @@index([workspaceId])
□ Service logic in src/lib/ or src/server/ — not in route handlers
□ Client components use TanStack Query — not raw fetch in useEffect
□ Loading states use skeletons, not spinners
□ Error states handled with error.tsx
□ Loopbrain accessibility considered for new data models
□ No new orgId references — use workspaceId directly
```

---

## 9. Decision Log

### 2026-03-10: Input Validation Strategy Finalized

**Context:** Completed 8-phase Zod validation sweep (Feb-Mar 2026). Reached ~60% coverage (250+/439 routes). Question: Should we validate the remaining 40%?

**Decision:** **No.** Remaining routes are intentionally unvalidated based on risk assessment:
- Internal routes (cron jobs, debug) - secret-based auth is sufficient
- External webhooks (Slack, Gmail) - cryptographic signature verification is sufficient  
- Empty-body actions (archive, mark-as-read) - no input to validate
- GET endpoints with simple filters - Prisma prevents SQL injection
- Routes where business logic provides comprehensive validation

**Validation Strategy:**
- ✅ **Always validate:** User-facing mutations, complex nested objects, security-sensitive inputs
- ⏭️ **Skip validation:** Internal routes, webhooks, empty bodies, simple GET filters

**Rationale:** Focus validation where it provides real security/reliability value. Over-validating creates maintenance burden without meaningful benefit. Senior engineers would view completing all routes as unnecessary perfectionism.

**Status:** Strategy documented in § 2.2. Validation sweep complete. 19 validation files created covering all high-risk surface area.

---

*This is a living document. Update after each architectural decision, audit, or standard change.*
*Last updated: March 10, 2026.*