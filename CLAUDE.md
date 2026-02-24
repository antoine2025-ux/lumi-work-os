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
2. `assertAccess()` for authorization (role hierarchy: VIEWER < MEMBER < ADMIN < OWNER)
3. `setWorkspaceContext()` for Prisma scoping
4. Zod schema validation for inputs
5. `handleApiError()` for error responses (maps Forbidden→403, not found→404, Prisma P2025→404)

Zod schemas live in `src/lib/validations/` (`common.ts`, `org.ts`, `wiki.ts`, `tasks.ts`, `onboarding.ts`). PM-specific schemas in `src/lib/pm/schemas.ts`. Always validate at API boundaries using `.parse()` or `.safeParse()`.

Key imports:
```typescript
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { handleApiError } from '@/lib/api-errors'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { assertManagerOrAdmin } from '@/lib/auth/assertManagerAccess'
import { cn } from '@/lib/utils'
// Zod schemas
import { PersonCreateSchema } from '@/lib/validations/org'
```

### RBAC Role Matrix

| Action | Required Role |
|--------|--------------|
| View own profile, tasks, todos | `VIEWER` |
| View workspace content (projects, wiki, goals) | `VIEWER` |
| Create/edit content (projects, tasks, wiki, goals) | `MEMBER` |
| Use AI chat / Loopbrain | `MEMBER` |
| Invite members | `ADMIN` |
| Manage org structure (departments, teams, positions) | `ADMIN` |
| Manage people (create, archive, update, reassign) | `ADMIN` |
| Manage workspace settings | `ADMIN` |
| Manage roles and permissions | `OWNER` |
| Delete workspace | `OWNER` |

Manager-scoped access: use `assertManagerOrAdmin()` from `src/lib/auth/assertManagerAccess.ts` for operations restricted to a person's direct manager or workspace admins. It checks ADMIN+ role first, then falls back to `OrgPosition.parentId` manager relationship.

### Onboarding Flow

- **Routes:** `/onboarding/[step]` (steps 1–5), layout at `src/app/onboarding/layout.tsx`
- **API:** `/api/onboarding/progress` (GET/POST)
- **Middleware gates:** no workspace → `/onboarding/1`, workspace but incomplete → `/onboarding/1`
- **JWT token** carries `isFirstTime` flag (no extra DB query per request)
- **Schemas:** `src/lib/validations/onboarding.ts`
- **Redirect shim:** `/welcome` → `/onboarding/1` (backward-compatible)

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
| `prisma/schema.prisma` | Data model (162 models) |
| `src/lib/auth/assertAccess.ts` | RBAC enforcement for all routes (290 routes) |
| `src/lib/api-errors.ts` | Centralized error handling (246 routes) |
| `src/lib/validations/` | Zod schema library (85 routes) |
| `src/lib/auth/assertManagerAccess.ts` | Manager-scoped access helper |

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

### Phase 2 Metrics (Feb 24, 2026) — Full Audit

See `CODEBASE_AUDIT_2026-02-24.md` for full findings. See `LEVEL4_ARCHITECTURE.md` for roadmap.

> Zod and handleApiError counts use call-site methodology (.parse/.safeParse grep) in Feb 24. Feb 20 used broader import-presence methodology — not directly comparable.

| Metric | Feb 17 Baseline | Feb 20 | Feb 24 Current |
|--------|----------------|--------|----------------|
| Auth (`getUnifiedAuth`) | 260/427 (61%) | 335/430 (78%) | 326/439 (74%) |
| RBAC (`assertAccess`) | 222/427 (52%) | 282/430 (66%) | 290/439 (66%) |
| Workspace scoping (`setWorkspaceContext`) | 228/427 (53%) | 228/430 (53%) | **296/439 (67%)** |
| Error handling (`handleApiError`) | 179/427 (42%) | 335/430* | 246/439 (56%)* |
| Zod validation | 85/427 (20%) | 335/430* | 102/439 (23%)* |
| Test files | 56 | 66 | 66 |
| Prisma models | 150 | 160 | **162** (79 in WORKSPACE_SCOPED_MODELS) |
| TS/TSX files | — | 1,950 | 1,877 |
| API routes | 427 | 430 | **439** |

#### P0 Issues (fix immediately)
1. **43 models missing from WORKSPACE_SCOPED_MODELS** — schema grew without middleware sync; includes `OrgDepartment`, `OrgTeam`, `Todo`, `PersonAvailability`, `DecisionDomain`, `CapacityContract`, `OrgInvitation`, `LeaveRequest` and 35 more — add to `scopingMiddleware.ts`
2. **`$queryRawUnsafe` with string interpolation** in `src/lib/simple-auth.ts:260,376,441` and `src/server/org/people/write.ts:82,149` — replace with parameterized queries

#### P1 Issues (next sprint)
- Projects epic/timeline/files views not wired (`projects/[id]/page.tsx:672`)
- OrgChart department context/hiring/reorg unpopulated (`OrgChartClient.tsx:74-79`)
- People filters (Leaders/New/Recently Changed) incomplete (`PeoplePageClient.tsx:372,389,393`)
- `orgId` fallback pattern in 138 API route occurrences — migrate to clean `workspaceId`

#### Resolved Since Feb 20
- ✅ 8 P0 scoping models added (FeatureFlag, Activity, ContextItem, ContextEmbedding, ContextSummary, ProjectDocumentation, ProjectAccountability, CustomFieldDef)
- ✅ Slack webhook HMAC-SHA256 signature verification + replay prevention
- ✅ Manager relationships: `PersonManagerLink` model with FK + time windows
- ✅ Invite system end-to-end wired with email sending + user-status detection
- ✅ Wiki AI `extract_tasks` and `tag_pages` actions wired (`wiki-ai-assistant.tsx:1107,1133`)
- ✅ `setWorkspaceContext` coverage +14pp (228→296 routes)
- ✅ Landing page: mobile-responsive, 500 lines, 23 components

#### Known Stable Seam Updates
- `prisma/schema.prisma` now has **162 models** (not 150)
- `src/lib/auth/assertAccess.ts` now covers **290 routes** (not 222)
- `src/lib/api-errors.ts` now covers **246 routes** (call-site count)
- Loopbrain: all Q1-Q9 pipelines fully implemented (~41,357 lines, 144 files in `src/lib/loopbrain/`)
