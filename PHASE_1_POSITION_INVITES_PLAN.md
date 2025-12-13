# Phase 1: Position-Based Invites Foundation — Implementation Plan

## Overview

Implement the data model and API foundation for position-based invites. This phase adds schema changes, creates a new endpoint for position-based invite creation, and modifies existing endpoints to support position assignment with full atomicity and single-occupant enforcement.

**Scope**: Backend API only. No UI changes in this phase.

---

## 1. Prisma Schema + Migration

### 1.1. Schema Changes

**File**: `prisma/schema.prisma`

**New Enum**: Add before `WorkspaceInvite` model (around line 1113, after `WorkspaceRole` enum)

**Model**: `WorkspaceInvite` (lines 157-175)

**Changes**:
- Add new enum: `ViewerScopeType` (WORKSPACE_READONLY, TEAM_READONLY, PROJECTS_ONLY)
- Add `positionId String?` field (nullable for backward compatibility)
- Add `viewerScopeType ViewerScopeType?` field (nullable, typed enum instead of String)
- Add `viewerScopeRefId String?` field (nullable, reference ID for scoped viewer access)
- Add `createdByRole WorkspaceRole?` field (nullable, defense-in-depth for OWNER invites)
- Add optional relation: `position OrgPosition? @relation(fields: [positionId], references: [id], onDelete: SetNull)`
- Add indexes:
  - `@@index([positionId], map: "idx_invites_position")`
  - `@@index([workspaceId, email, revokedAt, acceptedAt, expiresAt], map: "idx_invites_pending_lookup")`
  - `@@index([workspaceId, positionId], map: "idx_invites_workspace_position")`
- Keep existing indexes unchanged

**New Enum** (add before WorkspaceInvite model):
```prisma
enum ViewerScopeType {
  WORKSPACE_READONLY
  TEAM_READONLY
  PROJECTS_ONLY
}
```

**Updated Model**:
```prisma
model WorkspaceInvite {
  id              String        @id @default(cuid())
  workspaceId     String
  email           String        @db.VarChar(255)
  role            WorkspaceRole @default(MEMBER)
  token           String        @unique
  expiresAt       DateTime
  acceptedAt      DateTime?
  revokedAt       DateTime?
  createdAt       DateTime      @default(now())
  createdByUserId String
  
  // NEW FIELDS
  positionId      String?              // Links invite to position (nullable for backward compatibility)
  viewerScopeType ViewerScopeType?     // Typed enum (not String)
  viewerScopeRefId String?             // Reference ID (e.g., teamId for TEAM_READONLY)
  createdByRole   WorkspaceRole?       // Defense-in-depth: role of creator at invite creation time
  
  // Relations
  createdBy       User          @relation("InviteCreator", fields: [createdByUserId], references: [id], onDelete: Cascade)
  workspace       Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  position        OrgPosition?  @relation(fields: [positionId], references: [id], onDelete: SetNull) // NEW
  
  @@index([workspaceId, email], map: "idx_invites_workspace_email")
  @@index([workspaceId, revokedAt, acceptedAt], map: "idx_invites_workspace_status")
  @@index([token], map: "idx_invites_token")
  @@index([positionId], map: "idx_invites_position") // NEW
  @@index([workspaceId, email, revokedAt, acceptedAt, expiresAt], map: "idx_invites_pending_lookup") // NEW
  @@index([workspaceId, positionId], map: "idx_invites_workspace_position") // NEW
  @@map("workspace_invites")
}
```

**Model**: `OrgPosition` (no changes needed)
- Already has `userId String?` field (single-occupant model exists)
- No unique constraint needed (enforced at application level per workspace)

**New Enum**: `ViewerScopeType`
- Values: `WORKSPACE_READONLY`, `TEAM_READONLY`, `PROJECTS_ONLY`
- Used for typed viewer scope instead of free-form String
- Stored as PostgreSQL enum type

**Defense-in-Depth**: `createdByRole` field
- Stores the role of the invite creator at creation time
- Used to validate OWNER invites at acceptance time
- Prevents privilege escalation if creator's role changes after invite creation
- Preferred approach: Store on invite (simpler than accept-time check)

### 1.2. Migration File

**File**: `prisma/migrations/[timestamp]_add_position_invites/migration.sql`

**Migration Name**: `add_position_invites`

**SQL**:
```sql
-- Create ViewerScopeType enum
CREATE TYPE "ViewerScopeType" AS ENUM ('WORKSPACE_READONLY', 'TEAM_READONLY', 'PROJECTS_ONLY');

-- Add positionId column (nullable for backward compatibility)
ALTER TABLE "workspace_invites" 
ADD COLUMN "positionId" TEXT;

-- Add viewerScopeType column (typed enum, not String)
ALTER TABLE "workspace_invites" 
ADD COLUMN "viewerScopeType" "ViewerScopeType";

-- Add viewerScopeRefId column
ALTER TABLE "workspace_invites" 
ADD COLUMN "viewerScopeRefId" TEXT;

-- Add createdByRole column (defense-in-depth for OWNER invites)
ALTER TABLE "workspace_invites" 
ADD COLUMN "createdByRole" "WorkspaceRole";

-- Add foreign key constraint (ON DELETE SET NULL)
ALTER TABLE "workspace_invites"
ADD CONSTRAINT "workspace_invites_positionId_fkey" 
FOREIGN KEY ("positionId") 
REFERENCES "org_positions"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Add index on positionId for performance
CREATE INDEX "idx_invites_position" ON "workspace_invites"("positionId");

-- Add composite index for pending invite lookup by email (used in user-status API)
CREATE INDEX "idx_invites_pending_lookup" 
ON "workspace_invites"("workspaceId", "email", "revokedAt", "acceptedAt", "expiresAt");

-- Add composite index for workspace + position queries
CREATE INDEX "idx_invites_workspace_position" 
ON "workspace_invites"("workspaceId", "positionId");
```

**Migration Command**:
```bash
npx prisma migrate dev --name add_position_invites
```

**Verification**:
- Run `npx prisma migrate status` to verify migration applied
- Check database schema: `workspace_invites` table should have new columns
- Verify foreign key constraint exists

---

## 2. New Endpoint: POST /api/org/positions/[positionId]/invite

### 2.1. File Structure

**File**: `src/app/api/org/positions/[positionId]/invite/route.ts` (NEW)

### 2.2. Request/Response

**Request**:
```typescript
POST /api/org/positions/[positionId]/invite
Headers: {
  Cookie: "next-auth.session-token=..."
}
Body: {
  email: string
  role: WorkspaceRole  // OWNER | ADMIN | MEMBER | VIEWER
  viewerScopeType?: ViewerScopeType  // Optional, typed enum (WORKSPACE_READONLY | TEAM_READONLY | PROJECTS_ONLY)
  viewerScopeRefId?: string  // Required if viewerScopeType is TEAM_READONLY
}
```

**Response** (200 OK):
```typescript
{
  id: string
  email: string
  role: WorkspaceRole
  positionId: string
  token: string
  inviteUrl: string
  expiresAt: string
  createdAt: string
  createdBy: {
    id: string
    name: string | null
    email: string
  }
}
```

### 2.3. Implementation Logic

**Step 1: Authentication & Authorization**
- Call `getUnifiedAuth(request)` → Get `auth.workspaceId` and `auth.user.userId`
- Handle 401 if not authenticated
- Call `assertAccess({ userId, workspaceId, scope: 'workspace', requireRole: ['OWNER', 'ADMIN'] })`
- Handle 403 if insufficient permissions

**Step 2: Validate Position**
- Extract `positionId` from route params
- Query position: `prisma.orgPosition.findUnique({ where: { id: positionId }, select: { id, workspaceId, userId } })`
- If position not found → Return 404 "Position not found"
- If `position.workspaceId !== auth.workspaceId` → Return 403 "Position does not belong to workspace"
- If `position.userId !== null` → Return 409 "Position is already occupied"

**Step 3: Validate Request Body**
- Parse JSON body: `{ email, role, viewerScopeType?, viewerScopeRefId? }`
- Validate `email`:
  - Required → 400 if missing
  - Format validation: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` → 400 if invalid
  - Normalize: `email.toLowerCase().trim()`
- Validate `role`:
  - Must be one of: `['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']` → 400 if invalid
  - Role restrictions:
    - If `role === 'OWNER'` and inviter role !== 'OWNER' → 403 "Only workspace owners can invite other owners"
- Validate `viewerScopeType` (if provided):
  - Must be valid `ViewerScopeType` enum value → 400 if invalid
  - Type-safe enum check (TypeScript will catch invalid values at compile time)
  - If `viewerScopeType === 'TEAM_READONLY'` → `viewerScopeRefId` is required → 400 if missing
  - If `viewerScopeType` provided but `role !== 'VIEWER'` → 400 "viewerScopeType can only be set for VIEWER role"

**Step 4: Check Existing Member**
- Query user by email: `prisma.user.findUnique({ where: { email: normalizedEmail } })`
- If user exists:
  - Check membership: `prisma.workspaceMember.findUnique({ where: { workspaceId_userId } })`
  - If member exists → Return 409 "User is already a member of this workspace"

**Step 5: Handle Duplicate Invites**
- Query existing pending invite:
  ```typescript
  prismaUnscoped.workspaceInvite.findFirst({
    where: {
      workspaceId: auth.workspaceId,
      email: normalizedEmail,
      revokedAt: null,
      acceptedAt: null,
      expiresAt: { gt: new Date() }
    }
  })
  ```
- If found → Revoke old invite: `prismaUnscoped.workspaceInvite.update({ where: { id }, data: { revokedAt: now } })`

**Step 6: Get Creator Role & Generate Token**
- Get creator's role: Query `prisma.workspaceMember.findUnique({ where: { workspaceId_userId }, select: { role } })`
- Store creator role: `createdByRole = creatorMember.role` (defense-in-depth for OWNER invites)
- Generate secure token: `randomBytes(32).toString('hex')`
- Set expiry: `expiresAt = new Date() + 7 days`
- Create invite:
  ```typescript
  prismaUnscoped.workspaceInvite.create({
    data: {
      workspaceId: auth.workspaceId,
      positionId: positionId,  // NEW
      email: normalizedEmail,
      role: role as WorkspaceRole,
      viewerScopeType: viewerScopeType || null,  // NEW: Typed enum ViewerScopeType?
      viewerScopeRefId: viewerScopeRefId || null,  // NEW
      createdByRole: creatorMember.role,  // NEW: Defense-in-depth
      token: token,
      expiresAt: expiresAt,
      createdByUserId: auth.user.userId
    },
    include: {
      createdBy: { select: { id, name, email } }
    }
  })
  ```

**Step 7: Build Response**
- Build invite URL: `${NEXT_PUBLIC_APP_URL || NEXTAUTH_URL}/invites/${token}`
- Return JSON response with invite data

### 2.4. Error Codes

- **400**: Invalid email format, invalid role, invalid viewerScopeType, missing required fields
- **401**: Not authenticated
- **403**: Insufficient permissions, position doesn't belong to workspace, non-OWNER trying to invite OWNER
- **404**: Position not found
- **409**: Position already occupied, user already a member
- **500**: Server error (with error details in dev mode)

---

## 3. Modify: POST /api/invites/[token]/accept

### 3.1. File

**File**: `src/app/api/invites/[token]/accept/route.ts`

### 3.2. Changes

**Current State**: Lines 181-240 handle membership creation/upgrade and invite acceptance separately (not atomic).

**New State**: Wrap everything in single `prisma.$transaction` for full atomicity.

### 3.3. Implementation Logic

**Replace lines 181-240 with fully atomic transaction**:

```typescript
// CRITICAL: Everything in one transaction to prevent half-states
const result = await prisma.$transaction(async (tx) => {
  // Step 1: Re-fetch invite inside transaction to ensure it's still valid
  const currentInvite = await tx.workspaceInvite.findUnique({
    where: { id: invite.id },
    select: {
      id: true,
      workspaceId: true,
      positionId: true,
      role: true,
      email: true,
      revokedAt: true,
      acceptedAt: true,
      expiresAt: true
    }
  })
  
  if (!currentInvite) {
    throw new Error('Invite not found')
  }
  
  // Step 2: Re-validate invite status inside transaction
  const now = new Date()
  if (currentInvite.revokedAt) {
    throw new Error('This invite has been revoked') // 410
  }
  if (currentInvite.acceptedAt) {
    throw new Error('This invite was already accepted') // 409
  }
  if (currentInvite.expiresAt < now) {
    throw new Error('This invite has expired') // 410
  }
  
  // Step 2a: Defense-in-depth: Validate OWNER invite creator was OWNER
  if (currentInvite.role === 'OWNER' && currentInvite.createdByRole !== 'OWNER') {
    throw new Error('Invalid invite: Only workspace owners can create owner invites') // 403
  }
  
  // Step 3: Verify email matches (already checked outside transaction, but re-check for safety)
  if (user.email.toLowerCase() !== currentInvite.email.toLowerCase()) {
    throw new Error('This invite was sent to a different email address') // 403
  }
  
  // Step 4: Create or upgrade WorkspaceMember
  const existingMember = await tx.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: currentInvite.workspaceId,
        userId: auth.user.userId
      }
    }
  })
  
  const roleHierarchy: Record<string, number> = {
    VIEWER: 1, MEMBER: 2, ADMIN: 3, OWNER: 4
  }
  
  let finalRole = currentInvite.role
  
  if (existingMember) {
    // Upgrade role if invite role is higher
    const currentRoleLevel = roleHierarchy[existingMember.role] || 0
    const inviteRoleLevel = roleHierarchy[currentInvite.role] || 0
    
    if (inviteRoleLevel > currentRoleLevel) {
      await tx.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId: currentInvite.workspaceId,
            userId: auth.user.userId
          }
        },
        data: { role: currentInvite.role as any }
      })
      finalRole = currentInvite.role
    } else {
      finalRole = existingMember.role
    }
  } else {
    // Create new membership
    await tx.workspaceMember.create({
      data: {
        workspaceId: currentInvite.workspaceId,
        userId: auth.user.userId,
        role: currentInvite.role as any
      }
    })
  }
  
  // Step 5: If position-based invite, assign user to position (atomic)
  let assignedPositionId: string | null = null
  
  if (currentInvite.positionId) {
    // 5a. Verify position exists and belongs to workspace (inside transaction)
    const position = await tx.orgPosition.findUnique({
      where: { id: currentInvite.positionId },
      select: { userId: true, workspaceId: true }
    })
    
    if (!position) {
      throw new Error('Position not found')
    }
    
    if (position.workspaceId !== currentInvite.workspaceId) {
      throw new Error('Position does not belong to workspace')
    }
    
    // 5b. If occupied by different user, throw 409
    if (position.userId && position.userId !== auth.user.userId) {
      throw new Error('Position already occupied')
    }
    
    // 5c. Remove user from other positions in same workspace (atomic)
    await tx.orgPosition.updateMany({
      where: {
        workspaceId: currentInvite.workspaceId,
        userId: auth.user.userId,
        id: { not: currentInvite.positionId }
      },
      data: { userId: null }
    })
    
    // 5d. Atomic conditional update: assign only if unoccupied
    const updateResult = await tx.orgPosition.updateMany({
      where: {
        id: currentInvite.positionId,
        userId: null  // CRITICAL: Only update if currently unoccupied
      },
      data: { userId: auth.user.userId }
    })
    
    // 5e. Verify update succeeded (race condition check)
    if (updateResult.count === 0) {
      throw new Error('Position already occupied')
    }
    
    assignedPositionId = currentInvite.positionId
  }
  
  // Step 6: Mark invite as accepted (inside same transaction)
  await tx.workspaceInvite.update({
    where: { id: currentInvite.id },
    data: { acceptedAt: now }
  })
  
  return { finalRole, assignedPositionId }
})
```

**Update Response** (line 266-275):
- Add `positionId` to response if assigned:
```typescript
const response = NextResponse.json({
  success: true,
  workspaceId: invite.workspaceId,
  role: result.finalRole,
  positionId: result.assignedPositionId || undefined,  // NEW: Only present if position was assigned
  workspace: {
    id: invite.workspace.id,
    name: invite.workspace.name,
    slug: invite.workspace.slug
  }
})
```

### 3.4. Error Handling

**Update catch block** (lines 281-293):
- Map error messages to HTTP status codes:
  - "This invite has been revoked" → 410 Gone
  - "This invite was already accepted" → 409 Conflict
  - "This invite has expired" → 410 Gone
  - "This invite was sent to a different email address" → 403 Forbidden
  - "Position already occupied" → 409 Conflict
  - "Position not found" → 404 Not Found
  - Generic errors → 500 Internal Server Error

---

## 4. Modify: PUT /api/org/positions/[id]

### 4.1. File

**File**: `src/app/api/org/positions/[id]/route.ts`

### 4.2. Changes

**Current State**: Lines 137-145 update `userId` without single-occupant validation.

**New State**: Add validation before updating `userId`.

### 4.3. Implementation Logic

**Add validation after line 135 (before building updateData)**:

```typescript
// If assigning a user, validate single-occupant constraint
if (userId !== undefined && userId !== null) {
  // Check if position is already occupied by different user
  if (existingPosition.userId && existingPosition.userId !== userId) {
    return NextResponse.json(
      { error: 'Position is already occupied by another user' },
      { status: 409 }
    )
  }
  
  // Remove user from other positions in same workspace (enforce one-position-per-user-per-workspace)
  await prisma.orgPosition.updateMany({
    where: {
      workspaceId: existingPosition.workspaceId,
      userId,
      id: { not: resolvedParams.id }
    },
    data: { userId: null }
  })
}
```

**Note**: If `userId === null` (unassigning), no validation needed. Just update.

### 4.4. Error Codes

- **409**: Position already occupied by another user
- **404**: Position not found (existing)
- **403**: Insufficient permissions (existing)
- **500**: Server error (existing)

---

## 5. Backward Compatibility

### 5.1. Schema Compatibility

- `positionId` is nullable → Existing invites without `positionId` continue to work
- `viewerScopeType` and `viewerScopeRefId` are nullable → Existing invites unaffected
- Foreign key `ON DELETE SET NULL` → If position deleted, invite remains valid (positionId → null)

### 5.2. API Compatibility

**Existing Endpoint**: `POST /api/workspaces/[workspaceId]/invites`
- **Status**: Unchanged
- **Behavior**: Still works for workspace-based invites (no positionId)
- **Response**: No `positionId` field (backward compatible)

**Accept Endpoint**: `POST /api/invites/[token]/accept`
- **Behavior**: 
  - If `invite.positionId === null` → Works as before (no position assignment)
  - If `invite.positionId !== null` → Assigns position (new behavior)
- **Response**: `positionId` is optional (only present if position was assigned)

### 5.3. Data Migration

**No data migration needed**:
- Existing invites have `positionId = null` (default)
- Existing invites continue to work unchanged
- New position-based invites have `positionId` set

---

## 6. Explicit Error Codes

### 6.1. Error Code Mapping

| Error Message | HTTP Status | Use Case |
|---------------|-------------|----------|
| "Not authenticated" | 401 | Missing/invalid session |
| "Insufficient permissions" | 403 | User lacks OWNER/ADMIN role |
| "Position does not belong to workspace" | 403 | Position belongs to different workspace |
| "This invite was sent to a different email address" | 403 | Email mismatch |
| "Only workspace owners can invite other owners" | 403 | Non-OWNER trying to invite OWNER |
| "Position not found" | 404 | Invalid positionId |
| "Invite not found" | 404 | Invalid token |
| "Position already occupied" | 409 | Position has different user assigned |
| "User is already a member of this workspace" | 409 | User already has membership |
| "This invite was already accepted" | 409 | Invite already accepted |
| "This invite has been revoked" | 410 | Invite was revoked |
| "This invite has expired" | 410 | Invite expired |
| "Invalid email format" | 400 | Malformed email |
| "Invalid role" | 400 | Invalid WorkspaceRole value |
| "Invalid viewerScopeType" | 400 | Invalid viewerScopeType value |
| "viewerScopeRefId required for TEAM_READONLY" | 400 | Missing refId |
| "viewerScopeType can only be set for VIEWER role" | 400 | Scope set for non-VIEWER |
| Generic errors | 500 | Server errors |

### 6.2. Error Response Format

```typescript
{
  error: string  // Human-readable error message
  details?: string  // Additional details (dev mode only)
}
```

---

## 7. Test Checklist

### 7.1. Schema Migration Tests

**Test 1: Migration Applies Successfully**
- Steps:
  1. Run `npx prisma migrate dev --name add_position_invites`
  2. Verify migration file created in `prisma/migrations/`
  3. Check database: `workspace_invites` table has new columns
  4. Verify foreign key constraint exists
- Expected: Migration succeeds, columns added, FK created

**Test 2: Backward Compatibility**
- Steps:
  1. Verify existing invites still have `positionId = null`
  2. Query existing invite → Should work without errors
- Expected: Existing invites unaffected

### 7.2. API Endpoint Tests

#### Test 3: Create Position-Based Invite (Happy Path)
- Steps:
  1. Create position in org chart (via UI or API)
  2. Call `POST /api/org/positions/{positionId}/invite` with:
     ```json
     {
       "email": "newuser@example.com",
       "role": "MEMBER"
     }
     ```
  3. Verify response includes `positionId`, `token`, `inviteUrl`
- Expected: 200 OK, invite created with `positionId` set

#### Test 4: Create Invite for Occupied Position
- Steps:
  1. Assign user to position (via UI or API)
  2. Try to create invite for same position
- Expected: 409 "Position is already occupied"

#### Test 5: Create Invite for Non-Existent Position
- Steps:
  1. Use invalid `positionId` in URL
- Expected: 404 "Position not found"

#### Test 6: Create Invite with Invalid Role
- Steps:
  1. Call endpoint with `role: "INVALID"`
- Expected: 400 "Invalid role"

#### Test 7: Create Invite with VIEWER Scope
- Steps:
  1. Call endpoint with:
     ```json
     {
       "email": "viewer@example.com",
       "role": "VIEWER",
       "viewerScopeType": "WORKSPACE_READONLY"
     }
     ```
- Expected: 200 OK, invite created with `viewerScopeType` set

#### Test 8: Accept Position-Based Invite (Happy Path)
- Steps:
  1. Create position-based invite
  2. Accept invite via `POST /api/invites/{token}/accept`
  3. Verify response includes `positionId`
  4. Check database: User assigned to position
  5. Check database: User removed from other positions in workspace
- Expected: 200 OK, user assigned to position, `positionId` in response

#### Test 9: Accept Invite for Occupied Position (Race Condition)
- Steps:
  1. Create position-based invite
  2. Assign different user to position (via API)
  3. Try to accept invite
- Expected: 409 "Position already occupied"

#### Test 10: Accept Invite When User Already in Different Position
- Steps:
  1. Assign user to Position A
  2. Create invite for Position B
  3. Accept invite
  4. Check database: User removed from Position A, assigned to Position B
- Expected: 200 OK, user moved from Position A to Position B

#### Test 11: Accept Workspace-Based Invite (Backward Compatibility)
- Steps:
  1. Create workspace-based invite (no positionId) via `POST /api/workspaces/{workspaceId}/invites`
  2. Accept invite
  3. Verify response does NOT include `positionId`
  4. Check database: No position assignment
- Expected: 200 OK, works as before, no `positionId` in response

#### Test 12: Update Position with Single-Occupant Enforcement
- Steps:
  1. Create position with user assigned
  2. Try to assign different user via `PUT /api/org/positions/{id}`
- Expected: 409 "Position is already occupied by another user"

#### Test 13: Update Position Moves User
- Steps:
  1. Assign user to Position A
  2. Assign same user to Position B via `PUT /api/org/positions/{positionBId}`
  3. Check database: User removed from Position A, assigned to Position B
- Expected: 200 OK, user moved

### 7.3. How to Verify in UI

**Note**: UI changes come in Phase 2. For Phase 1, verify via API and database.

**Verification Steps**:

1. **Database Verification**:
   - Query `workspace_invites` table → Check `positionId` column exists
   - Query invite → Verify `positionId` is set for position-based invites
   - Query `org_positions` table → Verify `userId` is set after invite acceptance

2. **API Verification**:
   - Use browser DevTools → Network tab
   - Create position-based invite → Check request/response
   - Accept invite → Check response includes `positionId`
   - Verify error responses have correct status codes

3. **Manual API Testing** (curl/Postman):
   ```bash
   # Create position-based invite
   curl -X POST http://localhost:3000/api/org/positions/{positionId}/invite \
     -H "Cookie: next-auth.session-token=..." \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "role": "MEMBER"}'
   
   # Accept invite
   curl -X POST http://localhost:3000/api/invites/{token}/accept \
     -H "Cookie: next-auth.session-token=..."
   ```

4. **Org Chart Verification** (after Phase 2 UI):
   - Create position-based invite
   - Accept invite
   - Navigate to org chart → Verify user appears in position
   - Verify user is not in multiple positions

---

## 8. Implementation Order

1. **Schema Migration** (Step 1)
   - Update `prisma/schema.prisma`
   - Run `npx prisma migrate dev --name add_position_invites`
   - Verify migration applied

2. **New Endpoint** (Step 2)
   - Create `src/app/api/org/positions/[positionId]/invite/route.ts`
   - Implement all validation and logic
   - Test endpoint with various scenarios

3. **Modify Accept Endpoint** (Step 3)
   - Wrap existing logic in `prisma.$transaction`
   - Add position assignment logic
   - Update error handling
   - Test atomicity

4. **Modify Position Update Endpoint** (Step 4)
   - Add single-occupant validation
   - Add one-position-per-user logic
   - Test enforcement

5. **Error Handling** (Step 5)
   - Update all error responses with explicit status codes
   - Test error scenarios

6. **Backward Compatibility Verification** (Step 6)
   - Test existing workspace-based invites still work
   - Verify no breaking changes

---

## 9. Risks & Mitigations

### Risk 1: Migration Fails in Production
**Mitigation**: 
- Test migration locally first
- Use `prisma migrate deploy` for production (safer than `db push`)
- Have rollback plan (migration can be marked as rolled back)

### Risk 2: Race Condition in Position Assignment
**Mitigation**:
- Use atomic conditional update (`updateMany` with `userId: null` condition)
- Check `result.count === 0` to detect race conditions
- All operations in single transaction

### Risk 3: Transaction Deadlock
**Mitigation**:
- Keep transaction scope minimal
- Order operations consistently (invite → member → position)
- Use `updateMany` instead of multiple `update` calls where possible

### Risk 4: Backward Compatibility Broken
**Mitigation**:
- `positionId` is nullable (existing invites have `null`)
- Accept endpoint checks `if (positionId)` before assignment
- Response `positionId` is optional

### Risk 5: Performance Impact
**Mitigation**:
- Index on `positionId` for fast lookups
- Transaction is necessary for atomicity (acceptable trade-off)
- Position assignment only happens for position-based invites

---

## 10. Files to Create/Modify

### Files to Create:
1. `src/app/api/org/positions/[positionId]/invite/route.ts` (NEW)

### Files to Modify:
1. `prisma/schema.prisma` (add fields to WorkspaceInvite)
2. `src/app/api/invites/[token]/accept/route.ts` (wrap in transaction, add position assignment)
3. `src/app/api/org/positions/[id]/route.ts` (add single-occupant validation)

### Migration Files (auto-generated):
1. `prisma/migrations/[timestamp]_add_position_invites/migration.sql` (auto-generated)

---

## STOP

**Plan complete. Waiting for explicit approval ("approved, implement") before proceeding with implementation.**

