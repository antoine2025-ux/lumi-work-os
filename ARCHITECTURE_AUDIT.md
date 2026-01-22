# Architecture Audit - Loopwell Codebase

**Date:** 2025-01-XX  
**Purpose:** Complete system mapping and verification of stabilization fixes  
**Status:** In Progress

---

## Executive Summary

This audit maps the complete system architecture, verifies recent stabilization fixes, and identifies remaining risks. The codebase uses Next.js 15 App Router with NextAuth.js for authentication, Prisma for database access, and implements multi-tenant workspace isolation.

**Key Findings:**
- ✅ Auth config consolidated to single source (`src/server/authOptions.ts`)
- ✅ Redirect logic centralized (`src/lib/redirect-handler.ts`)
- ✅ Prisma clients consolidated (`src/lib/db.ts`)
- ⚠️ Workspace scoping middleware disabled (manual filtering required)
- ⚠️ Activity model migration exists but needs verification
- ❓ Redirect fixes not yet verified with test cases

---

## 1. System Map

### 1.1 Frontend Routing

**Framework:** Next.js 15.5.9 (App Router)

**Route Structure:**
```
src/app/
├── (dashboard)/          # Protected routes (require auth + workspace)
│   ├── DashboardLayoutClient.tsx  # Layout with auth checks
│   ├── home/             # Home dashboard
│   ├── projects/         # Project management
│   ├── org/              # Organization management
│   └── invites/[token]/  # Invite acceptance
├── api/                  # API routes (Next.js API routes)
│   ├── auth/[...nextauth]/  # NextAuth handler
│   ├── projects/         # Project CRUD
│   ├── tasks/            # Task CRUD
│   └── ...
├── login                 # Public login page
├── welcome               # First-time user onboarding
└── (public routes)       # Landing, blog, etc.
```

**Routing Flow:**
1. Request hits `src/middleware.ts` (runs on all routes except API/static)
2. Middleware validates workspace slug format (`/w/[slug]/...`)
3. Middleware checks for auth token (lightweight)
4. Request proceeds to route handler
5. Layout components (`DashboardLayoutClient`, `home/layout`) check auth state
6. Client-side redirect handler (`src/lib/redirect-handler.ts`) makes redirect decisions

### 1.2 Auth Lifecycle

**Authentication Provider:** NextAuth.js 4.24.11 with Google OAuth

**Auth Config Location:** `src/server/authOptions.ts` (single source of truth)

**Session Strategy:** JWT (no database sessions)

**Auth Flow:**
```
1. User visits /login
2. NextAuth redirects to Google OAuth
3. Google callback → /api/auth/callback/google
4. NextAuth signIn callback (src/server/authOptions.ts:54)
   - Upserts user in database (prismaUnscoped.user.upsert)
   - Returns true to allow sign-in
5. NextAuth JWT callback (src/server/authOptions.ts:157)
   - Stores user.id in token.sub
   - Fetches workspace membership
   - Stores workspaceId, role, isFirstTime in token
6. NextAuth session callback (src/server/authOptions.ts:122)
   - Reads token.sub → session.user.id
   - Reads token.workspaceId → session.user.workspaceId
   - Returns session object
7. Session stored in HTTP-only cookie (next-auth.session-token)
8. Client receives session via useSession() hook
```

**Session Storage:**
- **Server:** JWT in HTTP-only cookie (`next-auth.session-token`)
- **Client:** NextAuth session object (via `useSession()` hook)
- **No localStorage/sessionStorage for auth state** (except redirect workarounds, which should be removed)

**Session Read Points:**
1. **Middleware** (`src/middleware.ts:35`): `getToken()` - lightweight token check
2. **API Routes** (`src/lib/unified-auth.ts:96`): `getServerSession(authOptions)` - full session
3. **Server Components**: `getServerSession(authOptions)` - full session
4. **Client Components**: `useSession()` from `next-auth/react` - client session

### 1.3 API Boundaries

**API Route Pattern:**
```typescript
export async function GET(request: NextRequest) {
  // 1. Get auth context
  const auth = await getUnifiedAuth(request)
  
  // 2. Assert workspace access
  await assertAccess({ 
    userId: auth.user.userId, 
    workspaceId: auth.workspaceId 
  })
  
  // 3. Set workspace context (if scoping enabled)
  setWorkspaceContext(auth.workspaceId)
  
  // 4. Query with workspaceId filter
  const data = await prisma.model.findMany({
    where: { workspaceId: auth.workspaceId }
  })
  
  // 5. Return response
  return NextResponse.json(data)
}
```

**Key Functions:**
- `getUnifiedAuth(request)`: Resolves session + workspace context
- `assertAccess()`: Validates workspace membership
- `setWorkspaceContext()`: Sets context for scoped Prisma (currently disabled)

### 1.4 Database Schema Ownership

**ORM:** Prisma 6.17.0  
**Database:** PostgreSQL  
**Schema File:** `prisma/schema.prisma` (2534 lines, 56+ models)

**Prisma Client:**
- **Main Export:** `src/lib/db.ts` exports `prisma` and `prismaUnscoped`
- **Scoped Client:** `src/lib/prisma/scoped-prisma.ts` (disabled by default)
- **Legacy Client:** `src/lib/prisma.ts` (DELETED ✅)

**Workspace-Scoped Models:** 40+ models require `workspaceId` filter:
- Project, Task, Epic, Milestone
- WikiPage, WikiChunk, WikiEmbed, etc.
- Activity (✅ now has workspaceId field)

**Multi-Tenancy Pattern:**
- All workspace-scoped models have `workspaceId String` field
- All queries must filter by `workspaceId: auth.workspaceId`
- Workspace membership validated via `WorkspaceMember` table

### 1.5 Background Jobs

**Current Status:** No dedicated background job system identified

**Async Operations:**
- Context updates (`upsertTaskContext`, `upsertProjectContext`) - fire-and-forget
- No queue system (e.g., Bull, BullMQ)
- No cron jobs identified

---

## 2. Environment Map

### 2.1 Local Development

**Database:**
- `DATABASE_URL`: PostgreSQL connection string (local or remote)
- `DIRECT_URL`: Direct connection (bypasses pooler, for migrations)

**Auth:**
- `NEXTAUTH_URL`: `http://localhost:3000` (default)
- `NEXTAUTH_SECRET`: Local secret
- `GOOGLE_CLIENT_ID`: OAuth client ID
- `GOOGLE_CLIENT_SECRET`: OAuth client secret

**Features:**
- `PRISMA_WORKSPACE_SCOPING_ENABLED`: `false` (default)
- `NODE_ENV`: `development`

### 2.2 Staging/Production

**Database:**
- `DATABASE_URL`: Supabase pooler connection (with `pooler.supabase.com`)
- `DIRECT_URL`: Direct Supabase connection (for migrations)

**Auth:**
- `NEXTAUTH_URL`: Production domain (e.g., `https://app.loopwell.ai`)
- `NEXTAUTH_SECRET`: Production secret
- `GOOGLE_CLIENT_ID`: Production OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Production OAuth client secret

**Features:**
- `PRISMA_WORKSPACE_SCOPING_ENABLED`: `false` (should be enabled after audit)
- `NODE_ENV`: `production`

**Callback URLs:**
- Google OAuth: `${NEXTAUTH_URL}/api/auth/callback/google`
- Verified in `src/server/authOptions.ts:47`

### 2.3 Environment Variable Safety

**Migration Safety:**
- ✅ `prisma migrate deploy` only runs in production (not `dev`)
- ⚠️ No explicit guardrails against running migrations on wrong database
- ✅ Development checks in `src/lib/db.ts:136` warn about wrong database patterns

---

## 3. Data Flows

### 3.1 Login → Session → Workspace Selection → Routing

```
1. User clicks "Sign in with Google"
   → Redirects to Google OAuth
   
2. Google callback → /api/auth/callback/google
   → NextAuth signIn callback creates/updates user
   → NextAuth JWT callback stores workspaceId in token
   → NextAuth session callback returns session
   → Cookie set: next-auth.session-token
   
3. NextAuth redirects to callbackUrl or /home
   
4. Client receives session via useSession()
   → UserStatusProvider reads session.user.workspaceId
   → If missing, fetches from /api/auth/user-status
   
5. Redirect handler checks:
   - If unauthenticated → /login
   - If no workspace → /welcome (or /invites/[token] if pending)
   - If authenticated + workspace → allow access
   
6. User navigates to protected route
   → Middleware validates slug format
   → Layout checks auth state
   → API routes call getUnifiedAuth() → assertAccess()
```

### 3.2 API Request Flow

```
1. Client makes API request
   → Includes cookies (next-auth.session-token)
   
2. API route handler:
   → getUnifiedAuth(request)
     → getServerSession(authOptions) [reads cookie]
     → Queries user + workspace membership
     → Returns AuthContext
   
3. assertAccess()
   → Validates WorkspaceMember record
   → Throws 403 if unauthorized
   
4. Business logic
   → Queries Prisma with workspaceId filter
   → Returns data
   
5. Response
   → JSON payload
   → Includes request ID header
```

---

## 4. Single Source of Truth

### 4.1 Auth Config

**Location:** `src/server/authOptions.ts` ✅

**Used By:**
- NextAuth route: `src/app/api/auth/[...nextauth]/route.ts`
- Server-side: `getServerSession(authOptions)` in `unified-auth.ts`
- All API routes via `getUnifiedAuth()`

**Status:** ✅ Consolidated (removed duplicate `src/lib/auth.ts`)

### 4.2 Redirect Rules

**Location:** `src/lib/redirect-handler.ts` ✅

**Used By:**
- `src/components/auth-wrapper.tsx`
- `src/app/(dashboard)/DashboardLayoutClient.tsx`
- `src/app/home/layout.tsx`

**Status:** ✅ Centralized (removed hardcoded workspace IDs and sessionStorage workarounds)

**Remaining Issues:**
- ⚠️ Some sessionStorage flags may still exist (need audit)
- ❓ Not yet verified with test cases

### 4.3 Workspace Scoping Enforcement

**Location:** `src/lib/prisma/scoped-prisma.ts` (disabled)

**Current State:**
- Feature flag: `PRISMA_WORKSPACE_SCOPING_ENABLED=false`
- Manual filtering required: `where: { workspaceId: auth.workspaceId }`
- No automatic enforcement

**Status:** ⚠️ Disabled (needs audit before re-enabling)

---

## 5. Remaining Risks

### 5.1 High Priority

1. **Workspace Scoping Disabled**
   - Risk: Developer forgets `workspaceId` filter → data leak
   - Mitigation: Manual code review, audit script created
   - Action: Complete audit, then re-enable scoping

2. **Redirect Logic Not Verified**
   - Risk: Infinite loops or wrong redirects still possible
   - Mitigation: Test matrix needed (see below)
   - Action: Create and run test cases

3. **Activity Migration Not Verified**
   - Risk: Migration may fail on existing data
   - Mitigation: Test on fresh DB and existing DB
   - Action: Run migration tests

### 5.2 Medium Priority

1. **Multiple Session Read Points**
   - Risk: Session state desync between client/server
   - Mitigation: Single source (NextAuth session)
   - Status: ✅ Consolidated, but needs verification

2. **No Background Job System**
   - Risk: Long-running operations block requests
   - Mitigation: Fire-and-forget for non-critical ops
   - Action: Monitor performance

---

## 6. Verification Status

| Component | Status | Evidence |
|-----------|--------|---------|
| Auth config consolidation | ✅ | Single file: `src/server/authOptions.ts` |
| Redirect logic centralization | ✅ | Single file: `src/lib/redirect-handler.ts` |
| Prisma client consolidation | ✅ | Legacy file deleted, imports updated |
| Activity model workspaceId | ✅ | Schema updated, migration exists |
| Redirect test cases | ❌ | **Not yet created** |
| Auth desync verification | ❌ | **Not yet verified** |
| Migration safety | ❌ | **Not yet tested** |
| Workspace scoping audit | ⚠️ | Script created, not run |

---

## Next Steps

1. **Create Redirect Test Matrix** (see separate document)
2. **Verify Auth Consistency** (see separate document)
3. **Test Migrations** (see separate document)
4. **Run Workspace Scoping Audit** (see separate document)
5. **Build/Lint/Typecheck Verification** (see separate document)

---

**Document Status:** Initial draft - awaiting verification results
