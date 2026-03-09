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
| `src/lib/prisma/scopingMiddleware.ts` | Workspace isolation (144 models) |
| `prisma/schema.prisma` | Data model (168 models) |
| `src/lib/auth/assertAccess.ts` | RBAC enforcement |
| `src/lib/api-errors.ts` | Centralized error handling |
| `src/lib/validations/` | Zod schema library |

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
  - `blockerPriority.v0.ts`
  - `questions.v0.ts`
  - `answer-envelope.v0.ts`
- `OrgSemanticSnapshotV0` is a machine contract. UI may read it, never extend it for display convenience.
- The agent loop (`agent-loop.ts`) is the default execution path. The legacy orchestrator (`orchestrator.ts`) is a fallback only — do not add features to it.

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
- Use `workspaceId` everywhere. **Never** use `orgId` as a field name for workspace reference. The legacy `orgId` pattern (43 occurrences across 20 files) is being migrated — do not add new instances.

### Migration Safety

- Never edit or delete existing migration files.
- Test migrations against a branch database before merging.
- If a migration requires data transformation, write it as a separate data migration script — not inline in the schema migration.

---

## 4. Security Baseline

### Non-Negotiable

- **Zod validation** on every POST, PUT, DELETE, and PATCH route. Schemas live in `src/lib/validations/`. Use `.parse()` or `.safeParse()` at the API boundary before any database operation.
- **`handleApiError()`** wrapping every route's try/catch. Import from `src/lib/api-errors.ts`.
- **No `as any`** to bypass type safety. Use `unknown` and narrow, or define the type. Existing `as any` casts (47 occurrences) are tech debt, not precedent.
- **No `catch (error: any)`**. Always `catch (error: unknown)`.
- **No `console.log` in production paths.** Use structured logging or remove.
- **No debug fetch calls** (e.g., `fetch('http://127.0.0.1:...')`) in committed code.
- `ignoreBuildErrors: true` in `next.config.ts` is a known P0 — do not rely on it. Run `tsc --noEmit` locally.

### Prompt Injection Awareness

- External data (Gmail bodies, Slack messages, calendar descriptions) must be sanitized/escaped before inclusion in LLM prompts.
- Never trust user-supplied content as instructions to Loopbrain.

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

// Validation (extend existing schemas, don't create new files)
import { PersonCreateSchema } from '@/lib/validations/org'
import { WikiPageSchema } from '@/lib/validations/wiki'

// UI
import { cn } from '@/lib/utils'
// shadcn/ui components from '@/components/ui/'
// Org tokens from '@/components/org/ui/tokens'
```

---

*Last updated: March 9, 2026. This file is the source of truth for development constraints. If a rule here conflicts with existing code, the rule wins — the existing code is tech debt.*
