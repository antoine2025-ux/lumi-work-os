# Loopwell Architecture Overview

This document describes how the Loopwell application is structured today. It serves as a reference for developers working in parallel to understand the system boundaries and stable seams.

**Last Updated:** February 2026

---

## Table of Contents

1. [App Router](#app-router)
2. [Authentication](#authentication)
3. [Data Layer](#data-layer)
4. [API Layer](#api-layer)
5. [UI System](#ui-system)
6. [Core Stable Seams](#core-stable-seams)
7. [Workspace Behavior Locations](#workspace-behavior-locations)

---

## App Router

Loopwell uses Next.js 15 App Router with the following structure:

### Route Groups

| Group | Purpose | Location |
|-------|---------|----------|
| `(dashboard)` | Authenticated dashboard routes | `src/app/(dashboard)/` |

### Layout Hierarchy

```
Root Layout (src/app/layout.tsx)
├── Providers (SessionProvider, ThemeProvider, etc.)
├── Analytics & SpeedInsights
└── Children
    │
    ├── Landing Layout (src/app/landing/layout.tsx)
    │   └── Public landing page
    │
    ├── Home Layout (src/app/home/layout.tsx)
    │   ├── Auth check (client-side)
    │   ├── Header
    │   └── LoopbrainAssistantProvider
    │
    ├── Blog Layout (src/app/blog/layout.tsx)
    │   └── Blog Admin Layout (src/app/blog/admin/layout.tsx)
    │       └── Admin auth check (requireBlogAdmin)
    │
    ├── Org Layout (src/app/org/layout.tsx) [Server Component]
    │   ├── Feature flag checks
    │   ├── Server-side auth & org permission context
    │   └── OrgPermissionsProvider
    │
    └── Dashboard Layout (src/app/(dashboard)/layout.tsx) [Client Component]
        ├── Auth check (useSession)
        ├── Workspace check (useUserStatusContext)
        └── DashboardLayoutClient
            ├── Header (lazy loaded)
            ├── LoopbrainAssistantProvider
            └── TaskSidebar
            │
            ├── Wiki Layout (src/app/(dashboard)/wiki/layout.tsx)
            │   └── WikiLayout component wrapper
            │
            └── Workspace Slug Layout (src/app/(dashboard)/w/[workspaceSlug]/layout.tsx)
                ├── Workspace validation
                └── Workspace Org Layout
```

### Page Count by Area

| Area | Approximate Count | Examples |
|------|-------------------|----------|
| Dashboard core | 20+ | `/ask`, `/projects`, `/wiki`, `/todos`, `/settings` |
| Workspace-scoped | 30+ | `/w/[workspaceSlug]/projects`, `/w/[workspaceSlug]/org/*` |
| Org Center | 40+ | `/org/people`, `/org/structure`, `/org/intelligence` |
| Blog | 5 | `/blog`, `/blog/[slug]`, `/blog/admin/*` |
| Public | 10+ | `/`, `/landing`, `/login`, `/about`, `/welcome` |
| **Total** | **114+** | |

### Loading & Error Patterns

- **loading.tsx**: Only `src/app/org/insights/loading.tsx` uses Next.js loading states
- **error.tsx**: Only `src/app/org/error.tsx` uses Next.js error boundaries
- **Pattern**: Most routes rely on client-side loading states in components

---

## Authentication

### Configuration

| File | Purpose |
|------|---------|
| `src/server/authOptions.ts` | Main NextAuth configuration |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth API route handler |
| `src/middleware.ts` | Route protection |

### Strategy

- **Session Strategy**: JWT (no database sessions)
- **Providers**: Google OAuth (primary), E2E Test Credentials (dev only)
- **Session Storage**: HTTP-only cookie (`next-auth.session-token`)

### Auth Boundaries

#### Middleware Layer (`src/middleware.ts`)

Protected routes requiring authentication:
- `/home`, `/projects`, `/wiki`, `/todos`, `/settings`, `/my-tasks`, `/calendar`, `/ask`, `/org`

Behavior:
- Unauthenticated → redirects to `/login` with `callbackUrl`
- Authenticated without workspace (`isFirstTime === true`) → redirects to `/welcome`
- Auth routes (`/login`, `/register`) → redirects authenticated users to `/home`

#### Layout-Level Auth

| Layout | Type | Auth Method |
|--------|------|-------------|
| `(dashboard)/layout.tsx` | Client | `useSession()` |
| `home/layout.tsx` | Client | `useSession()` |
| `org/layout.tsx` | Server | `getServerSession(authOptions)` |
| `blog/admin/layout.tsx` | Server | `requireBlogAdmin()` |

### Session Reading

**Server-side:**
```typescript
// API routes
const auth = await getUnifiedAuth(request)

// Server components
const session = await getServerSession(authOptions)
```

**Client-side:**
```typescript
// Via hook
const { data: session } = useSession()

// Via context
const { workspaceId, userRole } = useUserStatusContext()
```

---

## Data Layer

### Prisma Schema

**Location:** `prisma/schema.prisma`

**Model Count:** 80+ models organized into domains:

| Domain | Models | Examples |
|--------|--------|----------|
| Auth & Users | 4 | `User`, `Account`, `Session`, `VerificationToken` |
| Workspace & Org | 10+ | `Workspace`, `WorkspaceMember`, `OrgDepartment`, `OrgTeam`, `OrgPosition` |
| Project Management | 15+ | `Project`, `Task`, `Epic`, `Milestone`, `Subtask`, `TaskComment` |
| Wiki & Knowledge | 10+ | `WikiPage`, `WikiChunk`, `WikiAttachment`, `WikiComment` |
| Loopbrain Context | 5 | `ContextItem`, `ContextEmbedding`, `ContextSummary` |
| Capacity & Availability | 5+ | `PersonAvailability`, `CapacityContract`, `WorkAllocation` |
| Work Intake | 5+ | `WorkRequest`, `DecisionDomain`, `DecisionAuthority` |

### Database Access

**Primary Client:** `src/lib/db.ts`

```typescript
import { prisma } from '@/lib/db'

// Scoped client (when feature flag enabled)
export const prisma = ...

// Unscoped client (for scripts/background jobs)
export const prismaUnscoped = ...
```

### Workspace Scoping

**Middleware:** `src/lib/prisma/scopingMiddleware.ts`

- **Status**: Feature-flagged via `PRISMA_WORKSPACE_SCOPING_ENABLED` (disabled by default)
- **When Enabled**: Automatically adds `workspaceId` to queries for 43 workspace-scoped models
- **Current Practice**: Explicit `where: { workspaceId }` filters in all queries

**Workspace-Scoped Models (44 total):**
- Project, Task, Epic, Milestone, WikiPage, WikiChunk
- ChatSession, ChatMessage, FeatureFlag, Integration
- Workflow, WorkflowInstance, OnboardingTemplate, OnboardingPlan
- Activity, CustomFieldDef, CustomFieldVal, TaskHistory
- ContextItem, ContextEmbedding, ContextSummary
- ... and more

### Data Access Patterns

1. **Direct Prisma Queries** (most common)
2. **Repository Pattern** (Loopbrain context system)
3. **Optimized Query Helpers** (`src/lib/db-optimization.ts`)
4. **Scoped Queries** (when feature flag enabled)

---

## API Layer

### Route Count

**Total:** 233+ API route files under `src/app/api/`

### Major API Areas

| Area | Routes | Examples |
|------|--------|----------|
| Core | 20+ | `/api/projects`, `/api/todos`, `/api/workspaces`, `/api/wiki/pages` |
| Org | 100+ | `/api/org/people`, `/api/org/teams`, `/api/org/work/requests` |
| AI/Assistant | 20+ | `/api/ai/chat`, `/api/loopbrain/*`, `/api/assistant/*` |
| Auth | 5 | `/api/auth/[...nextauth]`, `/api/auth/user-status` |

### Authentication Pattern

Standard pattern for authenticated routes:

```typescript
export async function GET(request: NextRequest) {
  try {
    // 1. Get auth context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })
    
    // 3. Set workspace context (for Prisma scoping)
    setWorkspaceContext(auth.workspaceId)
    
    // 4. Query with explicit workspaceId filter
    const data = await prisma.model.findMany({
      where: { workspaceId: auth.workspaceId }
    })
    
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, request)
  }
}
```

### Input Validation Patterns

Three patterns exist in the codebase:

| Pattern | Usage | Example |
|---------|-------|---------|
| **Zod Schema** (preferred) | ~30% of routes | `/api/todos`, `/api/projects` |
| **Manual Validation** | ~50% of routes | `/api/org/work/requests` |
| **Minimal/None** | ~20% of routes | Some GET routes |

**Recommendation:** Use Zod for all new routes.

### Error Handling

**Standardized:** `handleApiError()` from `src/lib/api-errors.ts`

```typescript
// Response format
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "requestId": "req_123"
  }
}
```

**Note:** Not all routes use this pattern yet. Standardization is ongoing.

---

## UI System

### Base Components

**Location:** `src/components/ui/`

**Count:** 30 shadcn/ui-style components

| Component | Purpose |
|-----------|---------|
| `button.tsx` | Button with variants (default, destructive, outline, secondary, ghost, link) |
| `card.tsx` | Card with CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `dialog.tsx` | Modal dialog (Radix Dialog) |
| `sheet.tsx` | Side sheet/drawer |
| `input.tsx`, `textarea.tsx` | Form inputs |
| `select.tsx` | Select dropdown |
| `tabs.tsx` | Tab navigation |
| `table.tsx` | Table components |
| `skeleton.tsx`, `skeletons.tsx` | Loading skeletons |
| `tooltip.tsx`, `popover.tsx` | Overlays |
| ... | |

### Feature Components

| Area | Location | Count |
|------|----------|-------|
| Organization | `src/components/org/` | 289+ files |
| Projects | `src/components/projects/` | 20+ |
| Wiki | `src/components/wiki/` | 27 |
| Tasks | `src/components/tasks/` | 9 |
| Layout | `src/components/layout/` | 7 |
| Assistant | `src/components/assistant/` | 10+ |
| Kanban | `src/components/kanban/` | 5+ |

### Design System

**Framework:** Tailwind CSS with shadcn/ui patterns

**Key Utilities:**
- `cn()` from `src/lib/utils.ts` - className merging
- `cva` from `class-variance-authority` - variant management

**Design Tokens:** `src/components/org/ui/tokens.ts`

**Color System:**
- CSS variables for theming (defined in `globals.css`)
- Dark mode via `class` strategy
- Custom tokens: `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`

---

## Core Stable Seams

These modules are imported by many files and must be treated as stable interfaces. Changes require careful review.

| Module | Imports | Risk Level | Purpose |
|--------|---------|------------|---------|
| `src/lib/db.ts` | 200+ | **High** | Prisma singleton |
| `src/lib/unified-auth.ts` | 100+ | **High** | Auth context for API routes |
| `src/lib/utils.ts` | 100+ | Medium | `cn()` utility |
| `src/middleware.ts` | N/A | **High** | Route protection |
| `src/server/authOptions.ts` | 20+ | **High** | NextAuth configuration |
| `src/lib/prisma/scopingMiddleware.ts` | 5 | **High** | Workspace isolation |
| `src/lib/workspace-context.tsx` | 50+ | Medium | Client workspace state |
| `src/lib/orgPermissions.ts` | 50+ | Medium | Org permission checking |
| `src/lib/api-errors.ts` | 40+ | Low | Error handling |

### Change Guidelines

Before modifying any stable seam:

1. **Understand the blast radius** - How many files import this module?
2. **Maintain backward compatibility** - Don't break existing callers
3. **Add tests** - Especially for auth and permission changes
4. **Coordinate with team** - Changes may affect parallel work

---

## Workspace Behavior Locations

### Workspace Creation

| Component | Location |
|-----------|----------|
| API Route | `POST /api/workspaces` (`src/app/api/workspaces/route.ts`) |
| UI Modal | `src/components/ui/workspace-creation-modal.tsx` |
| Onboarding | `src/lib/workspace-onboarding.ts` |

### Workspace Deletion

| Component | Location |
|-----------|----------|
| API Route | `DELETE /api/workspaces/[workspaceId]` (`src/app/api/workspaces/[workspaceId]/route.ts`) |
| Settings Page | `src/app/(dashboard)/w/[workspaceSlug]/settings/page.tsx` |
| Danger Zone | `src/components/org/danger-zone.tsx` |

### Workspace Switching

| Component | Location |
|-----------|----------|
| Context Provider | `src/lib/workspace-context.tsx` |
| Account Menu | `src/components/layout/workspace-account-menu.tsx` |

### Logout

| Component | Location |
|-----------|----------|
| Account Menu | `src/components/layout/workspace-account-menu.tsx` |
| User Status Provider | `src/providers/user-status-provider.tsx` |

### Session Management

| Component | Location |
|-----------|----------|
| Auth Options | `src/server/authOptions.ts` |
| Unified Auth | `src/lib/unified-auth.ts` |
| Middleware | `src/middleware.ts` |
| Redirect Handler | `src/lib/redirect-handler.ts` |

---

## Quick Reference

### Adding a New Feature

1. **Page**: `src/app/(dashboard)/[feature]/page.tsx`
2. **API**: `src/app/api/[feature]/route.ts`
3. **Components**: `src/components/[feature]/`
4. **Types**: `src/types/[feature].ts`

### Key Imports

```typescript
// Database
import { prisma } from '@/lib/db'

// Auth (API routes)
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'

// Auth (client)
import { useSession } from 'next-auth/react'
import { useWorkspace } from '@/lib/workspace-context'

// UI utilities
import { cn } from '@/lib/utils'

// Error handling
import { handleApiError } from '@/lib/api-errors'
```

### Running Checks

```bash
npm run typecheck    # TypeScript validation
npm run lint         # ESLint
npm run test         # Unit tests (Vitest)
npm run test:e2e     # E2E tests (Playwright)
```
