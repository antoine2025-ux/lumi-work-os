# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Loopwell (`lumi-work-os`) is a full-stack workplace operating system for intelligent internal documentation and organizational management. It features an AI context engine called **Loopbrain** that understands organizational structure and answers contextual questions about the org.

**Stack:** Next.js 15 (App Router), React 19, TypeScript (strict), Prisma + PostgreSQL, NextAuth.js 4 (JWT sessions), Tailwind CSS + shadcn/ui, TanStack Query + Zustand, OpenAI + pgvector, Socket.io, Zod validation.

## Commands

```bash
# Development
npm run dev                # Dev server on port 3000
npm run dev:turbo          # Dev server with Turbopack

# Build
npm run build              # prisma generate + next build

# Type checking & linting
npm run typecheck          # tsc --noEmit
npm run lint               # ESLint

# Testing
npm run test               # Vitest unit tests
npm run test:watch         # Vitest watch mode
npm run test:e2e           # Playwright E2E tests
npm run test:e2e:ui        # Playwright with UI

# Database
npm run db:push            # Push schema to DB (development, no migration)
npm run db:migrate:deploy  # Deploy pending migrations (production)
npx prisma studio          # Open Prisma Studio GUI

# Quality gates
npm run quality:gate       # E2E + security deps + secrets scan
npm run quality:gate:strict # typecheck + lint + test + E2E + security
```

## Architecture

### Dependency Hierarchy (do not create circular imports)

```
Foundation:   src/lib/db.ts (Prisma client singleton, 200+ consumers)
    ↑
Auth:         src/lib/unified-auth.ts → src/server/authOptions.ts
    ↑
Permissions:  src/lib/auth/assertAccess.ts, src/lib/permissions.ts
    ↑
Application:  API routes, server components, client components
```

### Multi-Tenant Workspace Scoping

All data is workspace-scoped. `src/lib/prisma/scopingMiddleware.ts` intercepts Prisma queries and injects `workspaceId` filters automatically. New workspace-scoped models must be added to `WORKSPACE_SCOPED_MODELS` in that file. Use `prismaUnscoped` only for auth operations that lack workspace context.

### Authentication Flow

Single entry point: `getUnifiedAuth(request?)` from `src/lib/unified-auth.ts`. Returns `{ user, workspaceId, isAuthenticated }` with request-level caching. Route protection in `src/middleware.ts`. Protected routes: `/home`, `/projects`, `/wiki`, `/todos`, `/settings`, `/my-tasks`, `/calendar`, `/ask`, `/org`.

### API Route Pattern

All API routes follow this structure:
1. `getUnifiedAuth(request)` for authentication
2. `assertAccess()` for authorization
3. `setWorkspaceContext()` for Prisma scoping
4. Zod schema validation for inputs
5. `handleApiError()` for error responses

Key imports:
```typescript
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { handleApiError } from '@/lib/api-errors'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { cn } from '@/lib/utils'
```

### Loopbrain (AI Context Engine)

Located in `src/lib/loopbrain/`. Orchestrates AI queries about organizational data using intent routing, context bundling, and evidence-based answers.

**Canonical contracts** in `src/lib/loopbrain/contract/` are single sources of truth:
- `blockerPriority.v0.ts` — Org readiness blockers (reuse everywhere, do not duplicate)
- `questions.v0.ts` — Loopbrain question definitions
- `answer-envelope.v0.ts` — Answer format spec

**OrgSemanticSnapshotV0** is a machine contract, not a UI model. UI may display snapshot data but never reinterpret or reformat it. Do not add snapshot fields for UI convenience.

### Org Module

`src/lib/org/` (76 files) handles people, teams, departments, positions, capacity planning, decision domains, responsibility profiles, and issue detection. UI surfaces under `/org` (40+ pages). Key file: `src/lib/org/data.server.ts` loads all org data.

## Stable Seams

These files are high-import-count shared dependencies. Changes require extra caution, full test runs, and explicit justification:

| File | Purpose |
|------|---------|
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/unified-auth.ts` | Auth context for all routes |
| `src/middleware.ts` | Route protection |
| `src/server/authOptions.ts` | NextAuth configuration |
| `src/lib/prisma/scopingMiddleware.ts` | Workspace isolation |
| `prisma/schema.prisma` | Data model (100+ models) |

## Conventions

- **Server Components by default**; mark Client Components with `'use client'`
- **`any` is forbidden** without explicit justification
- Use existing `src/components/ui/` primitives (shadcn/ui); use `cn()` for className merging
- Org components use design tokens from `src/components/org/ui/tokens.ts`
- Use `cva` (class-variance-authority) for component variants
- Loopbrain evidence values must be shallow, JSON-serializable primitives or flat objects — no opaque blobs
- Every feature must expose structured, machine-readable data for Loopbrain compatibility
- Validate inputs with Zod at API boundaries
- Database models should have `id` (uuid), `workspaceId`, `createdAt`, `updatedAt`, appropriate indexes, and `onDelete: Cascade` for workspace relation

## Verification

After implementing changes, run at minimum:
```bash
npm run typecheck && npm run lint
```

For changes touching stable seams or core flows, run the full suite:
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```
