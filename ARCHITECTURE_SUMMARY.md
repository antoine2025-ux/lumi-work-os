# Loopwell 2.0 Architecture Summary: Workspaces & Multi-Tenancy

**Date**: Generated from codebase analysis  
**Purpose**: Map current architecture for implementing production-grade multi-user workspaces

---

## 1. Prisma Models and Data Isolation

### Workspace/Organization/Tenant Models

**File**: `prisma/schema.prisma`

#### `Workspace` (lines 105-138)
- **Key fields**: `id`, `name`, `slug` (unique), `description`, `logo`, `ownerId`, `createdAt`, `updatedAt`
- **Relationships**: 
  - `owner`: User (via `ownerId`)
  - `members`: WorkspaceMember[] (many-to-many with User)
- **Purpose**: Primary tenant/organization container

#### `WorkspaceMember` (lines 140-153)
- **Key fields**: `id`, `workspaceId`, `userId`, `role` (WorkspaceRole enum), `joinedAt`
- **Unique constraint**: `[workspaceId, userId]`
- **Indexes**: `userId`, `[userId, workspaceId]`
- **Purpose**: Membership table linking users to workspaces with roles
- **Roles**: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`

### Domain Models Scoped to Workspace

**All models below have `workspaceId: String` field:**

- **Wiki**: `WikiPage`, `WikiChunk`, `wiki_workspaces`
- **Projects**: `Project`, `Task`, `Epic`, `Milestone`
- **Org Structure**: `OrgDepartment`, `OrgTeam`, `OrgPosition`, `RoleCard`, `OrgAuditLog`
- **Workflows**: `Workflow`, `WorkflowInstance`
- **Onboarding**: `OnboardingTemplate`, `OnboardingPlan`
- **Templates**: `ProjectTemplate`, `TaskTemplate`
- **Integrations**: `Integration`, `Migration`, `FeatureFlag`
- **Chat**: `ChatSession`
- **Loopbrain Context**: `ContextItem`, `ContextEmbedding`, `ContextSummary`

### Models WITHOUT `workspaceId` (Not Workspace-Scoped)

**Auth/User Models** (NextAuth standard):
- `User` - Global user account
- `Account` - OAuth provider accounts
- `Session` - NextAuth sessions
- `VerificationToken` - Email verification

**Child Models** (scoped via parent):
- `Subtask` - Scoped via `Task` → `Project` → `workspaceId`
- `TaskComment` - Scoped via `Task` → `Project` → `workspaceId`
- `TaskHistory` - Scoped via `Task` → `Project` → `workspaceId`
- `WikiAttachment` - Scoped via `WikiPage` → `workspaceId`
- `WikiComment` - Scoped via `WikiPage` → `workspaceId`
- `WikiVersion` - Scoped via `WikiPage` → `workspaceId`
- `WikiEmbed` - Scoped via `WikiPage` → `workspaceId`
- `WikiPagePermission` - Scoped via `WikiPage` → `workspaceId`
- `WikiFavorite` - Scoped via `WikiPage` → `workspaceId`
- `wiki_page_views` - Scoped via `WikiPage` → `workspaceId`
- `wiki_ai_interactions` - Scoped via `WikiPage` → `workspaceId`
- `ProjectMember` - Scoped via `Project` → `workspaceId`
- `ProjectWatcher` - Scoped via `Project` → `workspaceId`
- `ProjectAssignee` - Scoped via `Project` → `workspaceId`
- `ProjectDailySummary` - Scoped via `Project` → `workspaceId`
- `ProjectDocumentation` - Scoped via `Project` → `workspaceId`
- `CustomFieldDef` - Scoped via `Project` → `workspaceId`
- `CustomFieldVal` - Scoped via `Task` → `Project` → `workspaceId`
- `TaskTemplateItem` - Scoped via `TaskTemplate` → `workspaceId`
- `OnboardingTask` - Scoped via `OnboardingTemplate` → `workspaceId`
- `onboarding_task_assignments` - Scoped via `OnboardingPlan` → `workspaceId`
- `WorkflowAssignment` - Scoped via `WorkflowInstance` → `workspaceId`
- `ChatMessage` - Scoped via `ChatSession` → `workspaceId`

**Global Models**:
- `Activity` - **NO workspaceId** - Global activity feed (potential data leak risk)
- `BlogPost` - **NO workspaceId** - Public blog posts (intentional global)

### Current Tenant Model Summary

**Single tenant concept**: `Workspace` is the only tenant/organization model.

**Multi-tenancy status**: **Partially implemented** - Most domain models have `workspaceId`, but:
- `Activity` model lacks `workspaceId` (global activity feed)
- Some models rely on parent relationships for scoping (acceptable pattern)
- Workspace membership enforced via `WorkspaceMember` table

**Data isolation pattern**: 
- Explicit `workspaceId` filtering in queries
- Membership validation via `WorkspaceMember` table
- Prisma scoping middleware exists but is **disabled** (see `src/lib/db.ts:49-59`)

---

## 2. Auth, Session, and User ↔ Workspace Linkage

### NextAuth Configuration

**File**: `src/lib/auth.ts`  
**Route handler**: `src/app/api/auth/[...nextauth]/route.ts`

#### Session Callbacks
- **JWT callback** (lines 53-64): Stores `id`, `email`, `name`, `accessToken`, `refreshToken`, `expiresAt`
- **Session callback** (lines 44-51): Adds `user.id`, `accessToken`, `refreshToken`, `expiresAt` to session
- **No workspaceId in session/JWT**: Workspace context is resolved server-side per request

#### User Model
- **Model**: Prisma `User` (from `prisma/schema.prisma`)
- **Key fields**: `id`, `email` (unique), `name`, `emailVerified`, `image`, `createdAt`, `updatedAt`
- **Relations**: `workspaceMemberships: WorkspaceMember[]`, `ownedWorkspaces: Workspace[]`

### Workspace Resolution

**File**: `src/lib/unified-auth.ts`

#### `getUnifiedAuth(request?: NextRequest)`
- Returns `AuthContext` with `workspaceId` and `user.userId`
- **Priority order** for resolving `workspaceId`:
  1. URL query param `workspaceId` (validated via membership)
  2. URL query param `projectId` → derive `workspaceId` from project
  3. Header `x-workspace-id` (validated via membership)
  4. User's first workspace membership (default)
  5. Create default workspace if none exists (via `createDefaultWorkspaceForUser`)

#### `resolveActiveWorkspaceIdWithMember()`
- Validates workspace access via `WorkspaceMember.findUnique()` before returning
- Returns both `workspaceId` and `workspaceMember` (role) in one query

### Auth Helpers

**File**: `src/lib/auth-helpers.ts`
- `getAuthenticatedUser()`: Fetches user with `workspaceMemberships` included
- `getCurrentWorkspace()`: Returns first workspace from memberships (legacy helper)

**File**: `src/lib/auth/assertAccess.ts`
- `assertAccess()`: Validates workspace membership and role requirements
- `assertWorkspaceAccess()`: Wrapper for workspace-only checks
- `assertProjectAccess()`: Validates project access via workspace membership

**No workspace enforcement in auth callbacks**: Workspace context is resolved per-request, not stored in session.

---

## 3. API Layer: How Requests are Scoped

### Common Pattern Across API Routes

**Standard flow**:
1. Call `getUnifiedAuth(request)` → get `auth.workspaceId` and `auth.user.userId`
2. Call `assertAccess()` → validate workspace membership
3. Call `setWorkspaceContext(auth.workspaceId)` → set Prisma middleware context (currently disabled)
4. Query with explicit `where: { workspaceId: auth.workspaceId }`

### Projects/Spaces API

**File**: `src/app/api/projects/route.ts`

#### GET `/api/projects`
- **Auth**: `getUnifiedAuth(request)` → `auth.workspaceId`
- **Access check**: `assertAccess({ userId, workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })`
- **Data filtering**: `where: { workspaceId: auth.workspaceId }` (line 73)
- **Context setting**: `setWorkspaceContext(auth.workspaceId)` (line 40)

#### POST `/api/projects`
- **Same auth/access pattern**
- **Data creation**: `workspaceId: auth.workspaceId` (line 269)
- **Membership**: Creator added as `ProjectMember` with `OWNER` role

### Wiki/Docs API

**File**: `src/app/api/wiki/pages/route.ts`

#### GET `/api/wiki/pages`
- **Auth**: `getUnifiedAuth(request)`
- **Access check**: `assertAccess({ scope: 'workspace', requireRole: ['MEMBER'] })`
- **Data filtering**: `where: { workspaceId: auth.workspaceId, isPublished: true }` (lines 55-58, 61-64)
- **Context setting**: `setWorkspaceContext(auth.workspaceId)` (line 24)

#### POST `/api/wiki/pages`
- **Same pattern**
- **Slug uniqueness**: Enforced per workspace via `workspaceId_slug` unique constraint (line 197)

### Workspace API

**File**: `src/app/api/workspaces/route.ts`

#### GET `/api/workspaces`
- **Returns**: Single workspace array (current limitation - only returns user's first workspace)
- **Auth**: `getUnifiedAuth(request)`
- **Filtering**: Returns workspace where user is member (line 16-24)
- **Note**: Does NOT return all user's workspaces - only first one

### Org/People API

**Pattern**: Similar to projects/wiki - uses `getUnifiedAuth()` + `assertAccess()` + explicit `workspaceId` filtering

### Dashboard API

**Pattern**: Same as above - workspace-scoped queries

### Middleware-Based Access Control

**File**: `src/middleware.ts`

**Current behavior**: 
- **No workspace/tenant enforcement**
- Only handles request logging and adds `x-request-id` header
- Does NOT validate workspace access or enforce tenant boundaries

**Matcher**: Excludes `/api`, `/_next/static`, `/_next/image`, `favicon.ico`

---

## 4. Frontend: Current Workspace Concept in UI

### Workspace Provider

**File**: `src/lib/workspace-context.tsx`

#### `WorkspaceProvider` Component
- **State**: `currentWorkspace`, `userRole`, `workspaces[]`, `isLoading`
- **Storage**: `localStorage.getItem('currentWorkspaceId')` (line 99)
- **Loading**: Fetches from `/api/workspaces` (line 92)
- **Role loading**: Fetches from `/api/workspaces/${workspaceId}/user-role` (line 110)

#### `useWorkspace()` Hook
- Returns `WorkspaceContextType` with:
  - `currentWorkspace: Workspace | null`
  - `userRole: WorkspaceRole | null`
  - `workspaces: Workspace[]`
  - `switchWorkspace(workspaceId: string)`
  - Permission helpers (`canManageWorkspace`, `canManageUsers`, etc.)

### Current Workspace Storage

- **Client-side**: `localStorage.getItem('currentWorkspaceId')`
- **Server-side**: Resolved per-request via `getUnifiedAuth()` (URL params → header → default)
- **No URL routing**: Workspace ID not in URL path (e.g., no `/workspace/[slug]/projects`)

### Frontend Data Fetching

**Example**: `src/app/(dashboard)/projects/[id]/page.tsx`
- Uses `useWorkspace()` hook (line 36)
- Fetches project data via API (which filters by `auth.workspaceId` server-side)
- **No explicit workspaceId in API calls**: Relies on server-side auth context

### Workspace Selection UI

**Current state**: 
- Workspace stored in `localStorage`
- `switchWorkspace()` updates `localStorage` and refetches role
- **No workspace switcher UI visible** in analyzed files (may exist elsewhere)

---

## 5. Loopbrain and Context Scoping

### Loopbrain Orchestrator

**File**: `src/lib/loopbrain/orchestrator.ts`

#### Workspace Context Handling
- **Request type**: `LoopbrainRequest` includes `workspaceId: string` (line 25)
- **Source**: Always from `auth.workspaceId` (never from client) - see `src/app/api/loopbrain/chat/route.ts:49`
- **Comment**: "Multi-tenant safety: Always use workspaceId from auth, ignore any from client" (line 48)

#### Context Loading
- `loadSpacesContextForRequest()`: Uses `req.workspaceId` for all queries
- `getWorkspaceContext()`: Fetches workspace-scoped data
- `getProjectContext()`: Validates `workspaceId` matches project's workspace (line 1513 in `context-engine.ts`)

### Context Engine

**File**: `src/lib/loopbrain/context-engine.ts`

#### Workspace Scoping
- `getUnifiedContext()`: Requires `workspaceId` parameter (line 810)
- `getProjectContextObject()`: Filters by `workspaceId` in query (line 1513)
- `getWorkspaceContextObjects()`: Filters all queries by `workspaceId`

### Context Store (Database)

**File**: `prisma/schema.prisma` (lines 1156-1218)

#### Models
- `ContextItem`: Has `workspaceId` field (line 1159)
- `ContextEmbedding`: Has `workspaceId` field (line 1188)
- `ContextSummary`: Has `workspaceId` field (line 1208)

**Indexes**: All have `@@index([workspaceId, ...])` for multi-tenant queries

### Loopbrain API Routes

**File**: `src/app/api/loopbrain/chat/route.ts`

#### POST `/api/loopbrain/chat`
- **Auth**: `getUnifiedAuth(request)` (line 38)
- **Access check**: `assertAccess({ scope: 'workspace', requireRole: ['MEMBER'] })` (lines 41-46)
- **WorkspaceId**: Always from `auth.workspaceId`, never from request body (line 49)
- **Request building**: `workspaceId` and `userId` from auth (lines 111-112)

**No cross-tenant context risks**: Loopbrain always uses `workspaceId` from auth context, validated via `assertAccess()`.

---

## 6. MVP Multi-Tenant Readiness and Risks

### Verdict: **Partially Multi-Tenant, Inconsistent Enforcement**

The codebase has **workspace-scoped data models** and **application-level access control**, but lacks **defense-in-depth** and has **critical gaps**.

### Top 5 Risks for Production Multi-User Workspaces

#### 1. **CRITICAL: Activity Model Not Workspace-Scoped**
- **File**: `prisma/schema.prisma` - `Activity` model (lines 787-800)
- **Issue**: No `workspaceId` field - global activity feed across all workspaces
- **Risk**: Data leak - users could see activities from other workspaces
- **Impact**: High - violates tenant isolation

#### 2. **CRITICAL: Prisma Scoping Middleware Disabled**
- **File**: `src/lib/db.ts:49-59`
- **Issue**: Scoping middleware commented out with TODO: "Re-enable scoping middleware once Prisma $use issue is resolved"
- **Risk**: No automatic `workspaceId` filtering - relies entirely on manual `where` clauses
- **Impact**: High - one missed `where` clause = data leak

#### 3. **HIGH: Workspace API Only Returns First Workspace**
- **File**: `src/app/api/workspaces/route.ts:42`
- **Issue**: `GET /api/workspaces` returns single workspace array, not all user's workspaces
- **Risk**: Users cannot switch between multiple workspaces
- **Impact**: Medium - blocks multi-workspace UX

#### 4. **MEDIUM: No Middleware-Level Tenant Enforcement**
- **File**: `src/middleware.ts`
- **Issue**: Middleware only handles logging, no workspace validation
- **Risk**: No early rejection of unauthorized workspace access
- **Impact**: Medium - relies on per-route checks (defense-in-depth missing)

#### 5. **MEDIUM: Workspace Selection Stored in localStorage**
- **File**: `src/lib/workspace-context.tsx:99`
- **Issue**: Current workspace stored client-side only
- **Risk**: Client can manipulate `localStorage` to access wrong workspace (mitigated by server-side validation)
- **Impact**: Low-Medium - server validates, but UX confusion possible

### Additional Technical Debt

#### Inconsistent Patterns
- Some routes use `assertAccess()`, others may have manual checks
- `setWorkspaceContext()` called but middleware disabled (no-op)
- Workspace resolution logic duplicated in `unified-auth.ts`

#### Missing Features
- No workspace switcher UI component (may exist but not found)
- No workspace slug in URL routing (e.g., `/workspace/[slug]/projects`)
- No workspace-level settings/configuration API

#### Database-Level Protection
- **RLS enabled** on all tables (per `DATA_ISOLATION_ASSESSMENT.md`)
- **But**: Prisma uses service role which bypasses RLS
- **Impact**: RLS protects direct DB access, not Prisma queries

### Surprising Coupling

1. **Project → Workspace**: Projects always belong to one workspace (good)
2. **Wiki → Workspace**: Wiki pages scoped to workspace (good)
3. **Tasks → Workspace**: Tasks have both `projectId` AND `workspaceId` (redundant but safe)
4. **Activity → None**: Activity model has no workspace scoping (bad)

### Recommendations for Production Implementation

1. **Add `workspaceId` to `Activity` model** - Critical fix
2. **Re-enable Prisma scoping middleware** - Defense-in-depth
3. **Update `/api/workspaces` to return all user's workspaces** - Multi-workspace support
4. **Add workspace slug to URL routing** - Better UX and explicit context
5. **Add middleware-level workspace validation** - Early rejection of unauthorized access
6. **Audit all API routes** - Ensure 100% use `assertAccess()` + explicit `workspaceId` filtering

---

## Summary Statistics

- **Total Prisma models**: 56
- **Models with `workspaceId`**: ~35 (core domain models)
- **Models without `workspaceId`**: ~21 (auth models, child models, Activity, BlogPost)
- **API routes using `assertAccess()`**: 100+ (per `DATA_ISOLATION_ASSESSMENT.md`)
- **API routes calling `setWorkspaceContext()`**: 93 (per same doc)
- **Workspace roles**: 4 (OWNER, ADMIN, MEMBER, VIEWER)
- **Project roles**: 4 (OWNER, ADMIN, MEMBER, VIEWER)

---

**End of Architecture Summary**
