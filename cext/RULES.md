# RULES.md — Loopwell Development Constraints

> **This file is mandatory context for every AI-assisted development session.**
> Read this before writing any code. These rules are non-negotiable.

---

## 1. Architecture Integrity

### Auth Stack — Every API Route, No Exceptions

```typescript
// This is the only acceptable pattern for authenticated routes:
const auth = await getUnifiedAuth(request);
assertAccess(auth, 'MEMBER'); // or ADMIN, OWNER — never skip
setWorkspaceContext(auth.workspaceId);
```

- **Never** create alternative auth helpers. Use `getUnifiedAuth` from `src/lib/unified-auth.ts`.
- **Never** skip `assertAccess`. Every route must enforce a minimum role.
- **Never** skip `setWorkspaceContext` on routes that touch Prisma.
- Manager-scoped operations use `assertManagerOrAdmin()` from `src/lib/auth/assertManagerAccess.ts`.

### Workspace Scoping — The Multi-Tenancy Wall

- Every new Prisma model with a `workspaceId` field **must** be added to `WORKSPACE_SCOPED_MODELS` in `src/lib/prisma/scopingMiddleware.ts`.
- **Never** use `prismaUnscoped` unless the query genuinely cannot have workspace context (e.g., OAuth token lookups, user resolution by email). Document the justification in a comment.
- If you're unsure whether a model needs workspace scoping: it does.
- **Dual defense required:** The scoping middleware (`WORKSPACE_SCOPING_ENABLED`) is a safety net. Application-layer `where: { workspaceId }` in queries is the primary defense. Always include both — never rely on just one.
- **Known gap:** The `Activity` model currently has no `workspaceId` field. Any new activity-related code must account for this isolation gap. Do not create new models without `workspaceId`.

### Service Layer Pattern

- API routes handle: auth, validation, response shaping.
- Business logic lives in `src/lib/` (module directories) or `src/server/`.
- **No direct Prisma queries in route handlers** beyond simple CRUD. Complex logic gets a service function.

### Stable Seams — Extra Caution Required

These files have high import counts. Changes require full test runs and explicit justification:

| File | What It Does |
|------|-------------|
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/unified-auth.ts` | Auth context for all routes |
| `src/middleware.ts` | Route protection |
| `src/server/authOptions.ts` | NextAuth configuration |
| `src/lib/prisma/scopingMiddleware.ts` | Workspace isolation (152 models) |
| `prisma/schema.prisma` | Data model (168 models — verify count before adding) |
| `src/lib/auth/assertAccess.ts` | RBAC enforcement |
| `src/lib/api-errors.ts` | Centralized error handling |
| `src/lib/validations/` | Zod schema library |
| `src/lib/events/` | Event system (activity, org, task, wiki events) |
| `src/components/providers.tsx` | Root provider stack (9 nested providers) |

If your task doesn't specifically require changing a stable seam, don't touch it.

---

## 2. Loopbrain-First Design

**Every feature you build must be AI-accessible.** This is Loopwell's competitive moat.

### Before Creating Any New Data Model, Answer:

1. How will Loopbrain query this data? (tool? context source? snapshot field?)
2. What questions can the AI answer with this data that it couldn't before?
3. Is the data structured and machine-readable, or is it an opaque blob?

### Rules:

- New data domains need either a Loopbrain tool in `src/lib/loopbrain/agent/tool-registry.ts` or a context source in `src/lib/loopbrain/context-sources/`. No data islands.
- Loopbrain evidence values must be shallow, JSON-serializable primitives or flat objects.
- **Never** modify canonical contracts in `src/lib/loopbrain/contract/` without explicit approval. These are versioned machine interfaces:
  - `answer-envelope.v0.ts` — Answer format spec
  - `blockerPriority.v0.ts` — Org readiness blockers
  - `goalIntelligence.v0.ts` — Goal reasoning contract
  - `questions.v0.ts` — Q1–Q9 pipeline definitions
  - `refusalActions.v0.ts` — Refusal handling
  - `validateAnswerEnvelope.ts` — Runtime validation
- `OrgSemanticSnapshotV0` is a machine contract. UI may read it, never extend it for display convenience.
- The agent loop (`agent-loop.ts`) is the sole execution path. Orchestrator deleted March 11, 2026. Shared utilities in `llm-caller.ts`.

### Policies Engine

The Policies engine (`LoopbrainPolicy`, `PolicyExecution`, `PolicyActionLog`) is Loopbrain-driven rule-based automation. Rules:

- Policies execute via Loopbrain's context and reasoning — they are not standalone CRON jobs with hardcoded logic.
- New policy types must define clear trigger conditions, action types, and rollback behavior.
- Policy executions must be logged to `PolicyActionLog` for auditability.
- `LoopbrainPendingAction` is the queue for actions awaiting approval — never auto-execute destructive actions.

---

## 3. Schema Discipline

### New Model Checklist

Every new Prisma model must have:

- [ ] `id String @id @default(uuid())`
- [ ] `workspaceId String` with `@relation(fields: [workspaceId], references: [id], onDelete: Cascade)` on the Workspace relation
- [ ] `createdAt DateTime @default(now())`
- [ ] `updatedAt DateTime @updatedAt`
- [ ] Index on `workspaceId` (at minimum)
- [ ] Added to `WORKSPACE_SCOPED_MODELS` in scoping middleware
- [ ] Considered for Loopbrain accessibility (Rule 2)

### Naming

- Models: PascalCase (`OrgPosition`, `WikiPage`)
- Fields: camelCase
- Files: kebab-case (`capacity-contract.ts`)
- Components: PascalCase (`PersonProfileClient.tsx`)
- Use `workspaceId` everywhere. **Never** use `orgId` as a field name for workspace reference. The legacy `orgId` pattern (~69 routes use `const orgId = workspaceId` fallback) is being migrated — do not add new instances.

### Migration Safety

- Never edit or delete existing migration files.
- Test migrations against a branch database before merging.
- If a migration requires data transformation, write it as a separate data migration script — not inline in the schema migration.

---

## 4. Security Baseline

### Non-Negotiable

- **Zod validation** on every POST, PUT, DELETE, and PATCH route. Schemas live in `src/lib/validations/`. Use `.parse()` or `.safeParse()` at the API boundary before any database operation. Current coverage is ~23% (102/498 routes) — every new route must raise this number, never lower it.
- **`handleApiError()`** wrapping every route's try/catch. Import from `src/lib/api-errors.ts`. Current coverage is ~56% — same principle applies.
- **No `as any`** to bypass type safety. Use `unknown` and narrow, or define the type. Existing `as any` casts are tech debt, not precedent.
- **No `catch (error: any)`**. Always `catch (error: unknown)`.
- **No `console.log` in production paths.** Use structured logging or remove.
- **No debug fetch calls** (e.g., `fetch('http://127.0.0.1:...')`) in committed code.
- ✅ `ignoreBuildErrors` removed (March 11, 2026). Run `tsc --noEmit` locally to verify type safety.
- **No unauthenticated mutation routes.** Known gap: `POST /api/migrations/blog` has no auth — do not follow this pattern.

### Prompt Injection Awareness

- External data (Gmail bodies, Slack messages, calendar descriptions, Google Drive content) must be sanitized/escaped before inclusion in LLM prompts.
- Never trust user-supplied content as instructions to Loopbrain.
- Policy executions that process external data must sanitize inputs before passing to the LLM reasoning layer.

---

## 5. Code Quality Gates

### Every PR Must Pass

```bash
npm run typecheck && npm run lint
```

### Changes Touching Stable Seams or Auth

```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

### Error Boundaries

- Every new page-level route should have a corresponding `error.tsx`.
- Every new layout should consider a `loading.tsx`.

### Client vs. Server

- **Server Components by default.** Only add `'use client'` when you need hooks, event handlers, or browser APIs.
- Use existing `src/components/ui/` primitives (shadcn/ui). Use `cn()` from `src/lib/utils` for className merging.
- Org components use design tokens from `src/components/org/ui/tokens.ts`.
- Use `cva` (class-variance-authority) for component variants.

---

## 6. What the AI Must NOT Do

### Scope Discipline

- **Do not refactor outside the scope of the current task.** If you see something worth improving, note it — don't fix it.
- **Do not create parallel patterns.** If an auth helper exists, use it. If a validation schema exists, extend it. If a component exists, reuse it. Search before creating.
- **Do not add new dependencies** (npm packages) without explicit approval.
- **Do not stub silently.** If something isn't implemented, throw `new Error('NOT_IMPLEMENTED: [description]')` or flag it with a `// TODO P[0-2]:` comment that includes severity.
- **Do not move files** without explicit approval. Import paths are widespread and breaking.

### Pattern Compliance

- Follow the existing API route pattern exactly. Don't invent variations.
- Follow the existing TanStack Query hook pattern for data fetching.
- Follow the existing Zod schema organization (`src/lib/validations/`).
- If the current task's module already has established patterns (check existing files first), match them.

### Communication

- After completing a phase, list exactly what changed: files created, files modified, models added.
- If you encounter an issue that blocks the task, stop and describe the blocker — don't work around it silently.
- If the task requires changing a stable seam, flag it before proceeding.

---

## 7. Extensibility Principle

Loopwell is building toward category dominance — not a niche tool. Every decision must support growth:

- **No module-to-module tight coupling.** Features communicate via API routes or shared service functions, not direct imports across module boundaries (exception: Loopbrain importing context builders is the canonical integration pattern).
- **No hardcoded limits that create scale ceilings.** If you're adding a limit, make it configurable.
- **Data model depth over feature breadth.** A rich, well-structured model that Loopbrain can reason over is more valuable than a quick UI feature with flat data.
- **Every new feature should make the whole system smarter.** If adding a feature doesn't create new data that Loopbrain can use, question whether the design is complete.
- **Integration pattern for new external services:** OAuth tokens stored in `Integration` model (workspace-scoped) → service functions in `src/lib/integrations/[service]/` → API routes in `src/app/api/integrations/[service]/`. Follow the existing Slack/Gmail/Drive pattern.
- **Event emission after mutations.** If a mutation changes state that other modules care about (task completed, person added, wiki page updated), emit an event via `src/lib/events/`. This is how the activity feed, real-time updates, and future Loopbrain triggers stay in sync.

### Current Scale Awareness

The system is at 498 API routes, 168 Prisma models, and 70 dashboard pages. At this scale:
- Naming collisions are real — always check for existing models/routes/components before creating.
- Import path changes cascade widely — never rename or move files without approval.
- New modules (like Policies, Performance, One-on-Ones) must follow established infrastructure patterns from day one, not retrofit later.

---

## Quick Reference: Import Paths

```typescript
// Auth & Security
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { assertManagerOrAdmin } from '@/lib/auth/assertManagerAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

// Database
import { prisma } from '@/lib/db'

// Validation (extend existing schemas, don't create new files unless new domain)
import { PersonCreateSchema } from '@/lib/validations/org'
import { WikiPageSchema } from '@/lib/validations/wiki'
// Also: '@/lib/validations/common', '@/lib/validations/tasks', '@/lib/validations/onboarding'
// PM-specific: '@/lib/pm/schemas'

// Events (emit after mutations)
import { emit } from '@/lib/events/emit'
// Event definitions in: '@/lib/events/activityEvents', '@/lib/events/orgEvents'

// UI
import { cn } from '@/lib/utils'
// shadcn/ui components from '@/components/ui/'
// Org tokens from '@/components/org/ui/tokens'
```

---

*Last updated: March 2026. This file is the source of truth for development constraints. If a rule here conflicts with existing code, the rule wins — the existing code is tech debt.*
