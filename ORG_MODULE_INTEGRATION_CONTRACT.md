# Loopwell 2.0 Org Module Integration Contract

**Document Purpose:** This contract defines the canonical technical and architectural requirements that any Org module implementation MUST comply with to merge into Loopwell 2.0. This document is shared verbatim with developers implementing the Org module.

**Last Updated:** 2025-01-XX  
**Target System:** Loopwell 2.0 (current codebase)

---

## 1. Canonical Tenant & Auth Model

### Single Canonical Tenant Identifier

**Answer:** `workspaceId` (string, CUID format)

**Explicit Statement:** `orgId` is **NOT** a valid concept in Loopwell 2.0. The system uses `workspaceId` as the single canonical tenant identifier. Any Org module implementation must use `workspaceId` exclusively.

### Source Location

**File Path:** `src/lib/unified-auth.ts`

**Function Name:** `getUnifiedAuth(request?: NextRequest)`

**Return Type:** `AuthContext` interface:
```typescript
interface AuthContext {
  user: UnifiedAuthUser
  workspaceId: string  // ← Canonical tenant identifier
  isAuthenticated: boolean
  isDevelopment: boolean
}
```

### Usage Pattern (Mandatory)

All modules MUST retrieve `workspaceId` using this exact pattern:

```typescript
import { getUnifiedAuth } from '@/lib/unified-auth'

// In API route handlers:
export async function GET(request: NextRequest) {
  const auth = await getUnifiedAuth(request)
  const workspaceId = auth.workspaceId  // ← Use this, never from request body/params
  // ...
}
```

### Resolution Priority

`getUnifiedAuth()` resolves `workspaceId` in this order:
1. URL path slug: `/w/[workspaceSlug]/...` (highest priority)
2. URL query params: `?workspaceId=...` or `?projectId=...` (maps to workspace)
3. Header: `x-workspace-id`
4. User's default workspace (first membership by `joinedAt`)

**Critical Rule:** `workspaceId` is **NEVER** accepted from client request body or unvalidated query parameters. It MUST come from `getUnifiedAuth()` which validates workspace membership.

### Helper Functions

**File Path:** `src/lib/unified-auth.ts`

- `getUnifiedAuth(request?: NextRequest): Promise<AuthContext>` - Primary function
- `validateWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean>` - Validation helper
- `getUserWorkspaceRole(userId: string, workspaceId: string): Promise<string | null>` - Role lookup

---

## 2. Canonical Backend Interaction Pattern

### Preferred Pattern: Route Handlers (Not Server Actions)

**Answer:** Loopwell 2.0 uses **Next.js Route Handlers** (API routes), NOT Server Actions.

**Concrete Example:** `src/app/api/org/positions/route.ts`

**Pattern Structure:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  // 1. Authenticate and get workspace context
  const auth = await getUnifiedAuth(request)
  
  // 2. Assert workspace access
  await assertAccess({
    userId: auth.user.userId,
    workspaceId: auth.workspaceId,
    scope: 'workspace',
    requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']
  })
  
  // 3. Set workspace context for Prisma middleware
  setWorkspaceContext(auth.workspaceId)
  
  // 4. Execute Prisma queries (automatically scoped by middleware)
  const data = await prisma.orgPosition.findMany({
    where: { workspaceId: auth.workspaceId }
  })
  
  // 5. Return response
  return NextResponse.json(data)
}
```

### Patterns That Must NOT Be Introduced

**DO NOT:**
- Use Server Actions (`"use server"` directives)
- Accept `workspaceId` from request body
- Skip `assertAccess()` calls
- Skip `setWorkspaceContext()` calls
- Use `prismaUnscoped` unless explicitly required (auth flows only)
- Create new authentication mechanisms
- Bypass workspace scoping middleware

---

## 3. Canonical Prisma + DB Expectations

### Org-Adjacent Models in Schema

**File Path:** `prisma/schema.prisma`

**Existing Models:**
- `OrgPosition` (lines 487-521) - Has `workspaceId`, `teamId`, `parentId`, hierarchical structure
- `OrgTeam` (lines 440-459) - Has `workspaceId`, `departmentId`
- `OrgDepartment` (lines 422-438) - Has `workspaceId`
- `OrgAuditLog` (lines 523-538) - Has `workspaceId`, `userId`
- `RoleCard` (lines 461-485) - Has `workspaceId`, optional `positionId` relation

**Key Observations:**
- All models use `workspaceId` (NOT `orgId`)
- Models follow hierarchical structure: `OrgDepartment` → `OrgTeam` → `OrgPosition`
- `OrgPosition` supports parent-child relationships via `parentId`
- All models have `workspaceId` as required foreign key to `Workspace`

### Naming Conventions

**Models:** PascalCase (e.g., `OrgPosition`, `OrgTeam`)

**Fields:** camelCase (e.g., `workspaceId`, `parentId`, `isActive`)

**IDs:**
- Primary keys: `id` (String, `@default(cuid())`)
- Foreign keys: `{model}Id` (e.g., `workspaceId`, `teamId`, `parentId`)

**Relations:**
- Use explicit `@relation` annotations
- Cascade deletes: `onDelete: Cascade` for workspace-scoped data
- Nullable relations: `onDelete: SetNull` for optional references

**Enums:** PascalCase (e.g., `WorkspaceRole`, `ProjectStatus`)

### Constraints

**Required Fields:**
- All workspace-scoped models MUST have `workspaceId: String` field
- All models MUST have `createdAt: DateTime @default(now())`
- All models MUST have `updatedAt: DateTime @updatedAt`

**Indexes:**
- Composite indexes on `[workspaceId, ...]` for common query patterns
- Unique constraints where appropriate (e.g., `@@unique([workspaceId, name])`)

### Migration Expectations

**Missing Tables:**
- **Answer: NO** - Missing tables are NOT acceptable at merge time.
- All Org-related tables MUST exist in the Prisma schema before merge.
- Migrations MUST be provided and tested.

**Defensive Fallback Code:**
- **Answer: NO** - Defensive fallback code is NOT allowed.
- The system expects all Org models to exist and be properly scoped.
- If a model doesn't exist, the code MUST fail fast with clear error messages.
- Do NOT add `if (modelExists) { ... }` guards - the model MUST exist.

**Migration Process:**
1. Add models to `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_org_models`
3. Verify migrations in `prisma/migrations/`
4. Test with existing workspace data

---

## 4. Canonical UI System

### UI Primitives Location

**Directory:** `src/components/ui/`

**Available Components:**
- `table.tsx` - Table primitives (Table, TableHeader, TableBody, TableRow, TableCell)
- `dialog.tsx` - Modal dialogs (Dialog, DialogContent, DialogHeader, DialogTitle)
- `button.tsx` - Button components
- `card.tsx` - Card containers
- `input.tsx` - Form inputs
- `select.tsx` - Dropdown selects
- `badge.tsx` - Badge components
- `avatar.tsx` - Avatar components
- And more...

**Import Pattern:**
```typescript
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
```

### Patterns to Reuse

**Layouts:**
- Dashboard layout: `src/app/(dashboard)/layout.tsx` - Provides header, main content area
- Wiki layout: `src/components/wiki/wiki-layout.tsx` - Sidebar navigation pattern

**Styling:**
- **Framework:** Tailwind CSS (utility-first)
- **Design System:** "Calm Productivity" philosophy (see `UI_DESIGN_STRATEGY.md`)
- **Color Palette:** Soft blue (#3B82F6) primary, warm gray (#6B7280) secondary
- **Spacing:** 8px grid system

**Component Patterns:**
- Use shadcn/ui components from `src/components/ui/`
- Follow existing table patterns (see `src/app/api/org/positions/route.ts` for data structure)
- Use Dialog for modals, not custom modal implementations
- Use Card for content containers

### What Must NOT Be Duplicated

**DO NOT:**
- Create new table components - use `src/components/ui/table.tsx`
- Create new modal/dialog systems - use `src/components/ui/dialog.tsx`
- Create new button styles - use `src/components/ui/button.tsx`
- Duplicate layout structures - extend existing layouts
- Create new design systems - follow Tailwind + existing UI components
- Add new CSS frameworks or styling libraries

---

## 5. Loopbrain Contract (Non-Negotiable)

### ContextObject Definition

**File Path:** `src/lib/context/context-types.ts`

**Interface:**
```typescript
export interface ContextObject {
  id: string                    // Required: Unique identifier
  type: ContextObjectType       // Required: Entity type
  title: string                 // Required: Human-readable title
  summary: string               // Required: Short description
  tags: string[]                // Required: Array of tags (can be empty)
  ownerId?: string              // Optional: Owner/responsible person ID
  status?: string               // Optional: Normalized status
  updatedAt: Date               // Required: Last update timestamp
  relations: ContextRelation[]  // Required: Array of relations (can be empty)
  metadata?: Record<string, unknown>  // Optional: Additional data
}
```

**Supported Types:**
```typescript
export type ContextObjectType =
  | 'project'
  | 'page'
  | 'task'
  | 'role'      // ← Org positions map to this
  | 'person'    // ← Org people map to this
  | 'meeting'
  | 'workspace'
  | 'team'      // ← Org teams map to this
```

### Mandatory Fields

**Required (MUST be present):**
- `id` - Entity ID (string)
- `type` - One of the supported ContextObjectType values
- `title` - Human-readable name/title
- `summary` - Short description (1-2 sentences)
- `tags` - Array of strings (can be empty `[]`)
- `updatedAt` - Date object (use `updatedAt` from model, fallback to `createdAt`)
- `relations` - Array of ContextRelation objects (can be empty `[]`)

**Optional (MAY be present):**
- `ownerId` - User ID of owner/responsible person
- `status` - Normalized status string (e.g., 'active', 'inactive')
- `metadata` - Additional entity-specific data

### Update Propagation

**Storage:**
- ContextObjects are stored in `ContextItem` table (`prisma/schema.prisma` lines 1176-1193)
- Storage function: `saveContextItem()` in `src/lib/loopbrain/store/context-repository.ts`
- Format: Serialized as JSON in `data` field

**Indexing:**
- After any Org entity mutation (create/update/delete), the corresponding ContextObject MUST be saved
- Use `indexOne()` from `src/lib/loopbrain/indexing/indexer.ts` to trigger indexing
- Indexing is non-blocking (use `.catch()` for error handling)

**Example Pattern:**
```typescript
// After creating/updating OrgPosition:
const contextObject: ContextObject = {
  id: position.id,
  type: 'role',
  title: position.title,
  summary: `Role: ${position.title} in ${team.name}`,
  tags: position.requiredSkills,
  updatedAt: position.updatedAt,
  relations: [
    { type: 'team', id: position.teamId, label: 'team' },
    { type: 'workspace', id: position.workspaceId, label: 'workspace' }
  ],
  metadata: { level: position.level, isActive: position.isActive }
}

await saveContextItem({
  contextId: position.id,
  workspaceId: position.workspaceId,
  type: 'role',
  title: position.title,
  summary: contextObject.summary,
  data: contextObject
})

// Trigger indexing (non-blocking)
indexOne({
  contextId: position.id,
  workspaceId: position.workspaceId,
  type: 'role'
}).catch(err => logger.error('Indexing failed', err))
```

**When Updates Must Propagate:**
- Immediately after create operations
- Immediately after update operations
- Immediately after delete operations (or mark as deleted in ContextObject)
- Do NOT batch updates - each mutation triggers its own ContextObject update

---

## 6. Merge Constraints

### Merge-Sensitive Areas

**High-Conflict Files (Coordination Required):**

1. **Authentication System:**
   - `src/lib/unified-auth.ts` - Core auth logic
   - `src/lib/auth.ts` - NextAuth configuration
   - **Risk:** Org module should NOT modify these files

2. **Prisma Schema:**
   - `prisma/schema.prisma` - Database schema
   - **Risk:** Schema changes must be coordinated to avoid conflicts
   - **Solution:** Org models should be additive only (new models, no modifications to existing models)

3. **Workspace Scoping:**
   - `src/lib/prisma/scopingMiddleware.ts` - Workspace scoping logic
   - `WORKSPACE_SCOPED_MODELS` array - List of scoped models
   - **Risk:** Org models must be added to this array
   - **Solution:** Add Org models to `WORKSPACE_SCOPED_MODELS` array

4. **Loopbrain Context Engine:**
   - `src/lib/loopbrain/context-engine.ts` - Context retrieval
   - `src/lib/context/context-builders.ts` - ContextObject builders
   - **Risk:** Org context must integrate with existing context system
   - **Solution:** Add Org context builders following existing patterns

5. **Access Control:**
   - `src/lib/auth/assertAccess.ts` - Permission checks
   - **Risk:** Org-specific permissions may need new access patterns
   - **Solution:** Extend `assertAccess()` with Org-specific scopes if needed

### Read-Only vs Feature-Flagged Org

**Question:** Is a read-only or feature-flagged Org acceptable at merge time?

**Answer:** **YES, feature-flagged Org is acceptable** at merge time, provided:

1. **Feature Flag Implementation:**
   - Use `FeatureFlag` model (`prisma/schema.prisma` lines 891-904)
   - Flag key: `org-module-enabled` (or similar)
   - Workspace-scoped flags are supported

2. **Read-Only Mode:**
   - If Org is read-only at merge, all read operations MUST work
   - Write operations can be disabled via feature flag
   - UI should gracefully handle disabled write operations

3. **Migration Requirements:**
   - All database migrations MUST be complete
   - All Prisma models MUST exist in schema
   - Feature flag can control UI visibility and write operations

4. **Testing Requirements:**
   - Read operations MUST be tested with feature flag enabled
   - Write operations can be tested separately
   - Integration with Loopbrain context MUST work

---

## Canonical Rules Summary

### Bulletproof Rules (No Ambiguity)

1. **Tenant Identifier:** Use `workspaceId` exclusively. `orgId` does not exist.
2. **Auth Pattern:** Always use `getUnifiedAuth(request)` to get `workspaceId`. Never accept it from client.
3. **Backend Pattern:** Use Route Handlers (API routes), NOT Server Actions.
4. **Access Control:** Always call `assertAccess()` before data operations.
5. **Workspace Scoping:** Always call `setWorkspaceContext(workspaceId)` before Prisma queries.
6. **Prisma Models:** All Org models MUST have `workspaceId` field and be added to `WORKSPACE_SCOPED_MODELS`.
7. **ContextObject:** All Org entities MUST be convertible to ContextObject and indexed.
8. **UI Components:** Use existing components from `src/components/ui/`. Do not duplicate.
9. **Migrations:** All database tables MUST exist before merge. No defensive fallbacks.
10. **Naming:** Follow existing conventions (PascalCase models, camelCase fields).

---

## Do / Don't List for Org Module

### DO

- ✅ Use `workspaceId` from `getUnifiedAuth(request)`
- ✅ Call `assertAccess()` before all data operations
- ✅ Call `setWorkspaceContext()` before Prisma queries
- ✅ Add Org models to `WORKSPACE_SCOPED_MODELS` array
- ✅ Implement ContextObject conversion for all Org entities
- ✅ Use existing UI components from `src/components/ui/`
- ✅ Follow existing API route patterns
- ✅ Add proper Prisma indexes for query performance
- ✅ Use feature flags for gradual rollout
- ✅ Provide complete database migrations

### DON'T

- ❌ Use `orgId` - it doesn't exist
- ❌ Accept `workspaceId` from request body or unvalidated params
- ❌ Skip `assertAccess()` calls
- ❌ Skip `setWorkspaceContext()` calls
- ❌ Use Server Actions instead of Route Handlers
- ❌ Create new UI component libraries
- ❌ Add defensive fallback code for missing models
- ❌ Modify existing auth system files
- ❌ Skip ContextObject indexing
- ❌ Create new authentication mechanisms
- ❌ Use `prismaUnscoped` unless in auth flows
- ❌ Duplicate existing UI patterns

---

## Non-Negotiable Constraints

1. **Workspace Scoping:** All Org data MUST be scoped to `workspaceId`. No cross-workspace data access.
2. **ContextObject Compliance:** All Org entities MUST implement ContextObject interface and be indexed.
3. **Access Control:** All Org operations MUST go through `assertAccess()` with appropriate role requirements.
4. **Database Schema:** All Org models MUST exist in Prisma schema with proper relations and indexes.
5. **UI Consistency:** All Org UI MUST use existing component library and design system.
6. **API Consistency:** All Org endpoints MUST follow existing Route Handler patterns.
7. **Error Handling:** All errors MUST be properly logged and return appropriate HTTP status codes.
8. **Type Safety:** All code MUST be fully typed with TypeScript (no `any` types except where necessary).

---

## Assumptions & Open Questions

### Assumptions

1. **Org Module Scope:** Assumes Org module includes positions, teams, departments, and related entities.
2. **Integration Points:** Assumes Org module will integrate with:
   - Workspace membership system
   - Project assignment system
   - Loopbrain context system
3. **Data Model:** Assumes Org structure follows hierarchy: Department → Team → Position.
4. **Permissions:** Assumes Org operations follow existing workspace role hierarchy (VIEWER < MEMBER < ADMIN < OWNER).

### Open Questions (To Be Resolved Before Merge)

1. **Org-Specific Permissions:** Are there Org-specific permission requirements beyond workspace roles? (e.g., can a MEMBER manage org structure, or only ADMIN+?)
2. **Position Assignment:** How does position assignment integrate with project assignments? Are they separate or linked?
3. **Audit Logging:** Should all Org mutations be logged to `OrgAuditLog`? What level of detail is required?
4. **Bulk Operations:** Are bulk Org operations (e.g., bulk position creation) required? If so, what are the performance requirements?
5. **Org Hierarchy Limits:** Are there limits on org hierarchy depth? Maximum team size? Maximum positions per team?
6. **Migration Strategy:** For existing workspaces, how should Org data be initialized? Empty structure, or migration from existing data?
7. **Feature Flag Rollout:** What is the rollout plan for the feature flag? Per-workspace or global?
8. **ContextObject Relations:** What relations should Org ContextObjects include? (e.g., position → team → department → workspace)

---

## File Reference Quick Index

### Critical Files for Org Integration

- `src/lib/unified-auth.ts` - Auth and workspace resolution
- `src/lib/auth/assertAccess.ts` - Access control
- `src/lib/prisma/scopingMiddleware.ts` - Workspace scoping
- `prisma/schema.prisma` - Database schema
- `src/lib/context/context-types.ts` - ContextObject definition
- `src/lib/loopbrain/store/context-repository.ts` - ContextObject storage
- `src/components/ui/` - UI component library
- `src/app/api/org/positions/route.ts` - Example API route pattern

---

**End of Contract Document**

