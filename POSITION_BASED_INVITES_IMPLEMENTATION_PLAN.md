# Position-Based Invites — Detailed Implementation Plan

## Overview

This plan implements position-based invites where:
- Invites can only be created for existing `OrgPosition` records
- Positions are single-occupant (one user per position)
- Brand-new users can accept invites without being forced to create a workspace
- Position assignment is concurrency-safe
- Users occupy only one position per workspace

---

## A. Flow Diagrams

### Flow 1: Logged-Out User Opening Invite Link

```
User clicks invite link: /invites/{token}
  ↓
Page loads: src/app/(dashboard)/invites/[token]/page.tsx
  ↓
useSession() → status === 'unauthenticated'
  ↓
useEffect detects unauthenticated → router.push('/login?callbackUrl=/invites/{token}')
  ↓
User authenticates via Google OAuth
  ↓
OAuth redirects to callbackUrl: /invites/{token}
  ↓
Page loads again: src/app/(dashboard)/invites/[token]/page.tsx
  ↓
useSession() → status === 'authenticated'
  ↓
User clicks "Accept Invite"
  ↓
POST /api/invites/{token}/accept
  ↓
[FULLY ATOMIC TRANSACTION]
  - Re-validate invite
  - Create/upgrade WorkspaceMember
  - Assign to position (if positionId exists)
  - Mark invite accepted
  ↓
Redirect to /w/{workspaceSlug}
```

**Key Point**: No need to check pending invites in auth callback. The invite page itself handles the flow, and `user-status` API will return pending invite if user has no workspace.

---

### Flow 2: Brand New User (No Workspace) After Auth

```
User completes OAuth → Authenticated
  ↓
Any page loads → Client checks /api/auth/user-status
  ↓
GET /api/auth/user-status
  ↓
getUnifiedAuth() throws "No workspace found"
  ↓
[NEW] Catch error and check for pending invites:
  - Query: WorkspaceInvite WHERE email = normalized(user.email)
    AND revokedAt IS NULL 
    AND acceptedAt IS NULL 
    AND expiresAt > NOW()
    ORDER BY createdAt DESC
  ↓
Return response:
  {
    isAuthenticated: true,
    isFirstTime: true,
    workspaceId: null,
    pendingInvite: { token, workspace: { slug } } | null
  }
  ↓
Client-side redirect gates (auth-wrapper.tsx, home/layout.tsx, etc.):
  ↓
If pendingInvite exists:
  → Redirect to /invites/{token}
  ↓
If no pendingInvite:
  → Redirect to /welcome
```

**Key Change**: `src/app/api/auth/user-status/route.ts` becomes source of truth. All client redirect gates check `pendingInvite` before redirecting to `/welcome`.

---

### Flow 3: Existing User (Has Workspace) Accepting Invite

```
User clicks invite link: /invites/{token}
  ↓
Page loads: src/app/(dashboard)/invites/[token]/page.tsx
  ↓
User authenticated → shows "Accept Invite" button
  ↓
User clicks "Accept Invite"
  ↓
POST /api/invites/{token}/accept
  ↓
Backend: src/app/api/invites/[token]/accept/route.ts
  ↓
1. Validate invite (not revoked, not accepted, not expired)
2. Verify email matches
3. Create/update WorkspaceMember
4. [NEW] If invite.positionId exists:
   a. Check position is not occupied (atomic update)
   b. If occupied by different user → 409 Conflict
   c. If occupied by same user → no-op
   d. If not occupied → assign user to position
   e. Remove user from any other positions in same workspace (atomic)
5. Mark invite as accepted
  ↓
Return: { success: true, workspace: { slug }, positionId }
  ↓
Frontend redirects: window.location.href = `/w/${workspace.slug}`
```

**Key Changes**: 
- `src/app/api/invites/[token]/accept/route.ts` lines 225-234: Add position assignment logic
- Use atomic conditional update for position assignment

---

## B. Exact Code Touchpoints

### B.1. "No Workspace → /welcome" Redirect Locations

**Location 1**: `src/app/api/auth/user-status/route.ts`
- **Line 49-64**: Returns `{ error: 'No workspace found' }` when no workspace
- **Change**: Add pending invite check and return `pendingInvite` in response
- **Function**: `GET /api/auth/user-status` (becomes source of truth)

**Location 2**: `src/lib/unified-auth.ts`
- **Line 264-265**: Throws `'No workspace found - user needs to create a workspace'`
- **Line 394-396**: Same error in `resolveActiveWorkspaceId`
- **Change**: These are caught by callers, no direct change needed

**Location 3**: `src/components/auth-wrapper.tsx`
- **Line 139-147**: Redirects to `/welcome` when `userStatus.error.includes('No workspace found')`
- **Line 150-158**: Redirects when `isFirstTime || !workspaceId`
- **Change**: Check `userStatus.pendingInvite` BEFORE redirecting to `/welcome`. If exists, redirect to `/invites/${pendingInvite.token}`

**Location 4**: `src/app/(dashboard)/layout.tsx`
- **Line 52-62**: Redirects to `/welcome` when no workspace and not on invite page
- **Change**: Check `userStatus.pendingInvite` before redirecting to `/welcome`. If exists, redirect to `/invites/${pendingInvite.token}`

**Location 5**: `src/app/home/layout.tsx`
- **Line 29-32**: Redirects to `/welcome` when no workspace
- **Line 42-45**: Redirects on "No workspace" error
- **Change**: Check `data.pendingInvite` before redirecting to `/welcome`. If exists, redirect to `/invites/${pendingInvite.token}`

**Location 6**: `src/app/api/auth/user-status/route.ts`
- **Line 49-64**: Returns `{ error: 'No workspace found' }` when no workspace
- **Change**: **THIS IS THE SOURCE OF TRUTH**. Add pending invite check and return `pendingInvite: { token, workspace: { slug } } | null` in response. All other redirect gates will check this field.

---

### B.2. Workspace Fetching and Selection

**Location 1**: `src/lib/unified-auth.ts`
- **Function**: `resolveActiveWorkspaceIdWithMember()` (line 139-266)
- **Priority order**: URL slug → query params → header → default workspace
- **Change**: No change needed (workspace resolution happens after invite acceptance)

**Location 2**: `src/lib/workspace-context.tsx`
- **Function**: `loadWorkspaces()` (line 71-173)
- **Line 94-102**: Skips loading if `isFirstTime || !workspaceId`
- **Change**: No change needed (workspace loads after invite acceptance)

**Location 3**: `src/app/api/auth/user-status/route.ts`
- **Function**: `GET /api/auth/user-status`
- **Line 24**: Calls `getUnifiedAuth(request)` which throws if no workspace
- **Change**: Catch error and check for pending invites before returning error

---

### B.3. Invite Accept Redirects

**Location 1**: `src/app/(dashboard)/invites/[token]/page.tsx`
- **Line 143-147**: Redirects to `/w/${workspace.slug}` after accept
- **Line 149-153**: Fallback to `/home?workspaceId=${workspaceId}`
- **Change**: Ensure `workspace.slug` is always returned from accept API

**Location 2**: `src/app/api/invites/[token]/accept/route.ts`
- **Line 266-275**: Returns `{ workspace: { id, name, slug } }`
- **Change**: Already returns slug, ensure it's always included

---

### B.4. Org Position Updates

**Location 1**: `src/app/api/org/positions/[id]/route.ts`
- **Function**: `PUT /api/org/positions/[id]` (line 97-219)
- **Line 143**: Updates `userId` field
- **Change**: Add single-occupant validation (check if position already has different user)

**Location 2**: `src/app/api/invites/[token]/accept/route.ts`
- **Function**: `POST /api/invites/[token]/accept`
- **Line 225-234**: Creates/updates WorkspaceMember
- **Change**: Add position assignment logic after line 234

---

## C. Schema & Migration Plan

### C.1. Schema Changes

**File**: `prisma/schema.prisma`

**Model**: `WorkspaceInvite`

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
  positionId      String?       // Links invite to position (nullable for backward compatibility)
  viewerScopeType String?       // Enum-like: WORKSPACE_READONLY, TEAM_READONLY, PROJECTS_ONLY
  viewerScopeRefId String?      // Reference ID (e.g., teamId for TEAM_READONLY)
  
  // Relations
  createdBy       User          @relation("InviteCreator", fields: [createdByUserId], references: [id], onDelete: Cascade)
  workspace       Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  position        OrgPosition?  @relation(fields: [positionId], references: [id], onDelete: SetNull) // NEW
  
  @@index([workspaceId, email], map: "idx_invites_workspace_email")
  @@index([workspaceId, revokedAt, acceptedAt], map: "idx_invites_workspace_status")
  @@index([token], map: "idx_invites_token")
  @@index([positionId], map: "idx_invites_position") // NEW
  @@index([email, revokedAt, acceptedAt, expiresAt], map: "idx_invites_email_status") // NEW: For pending invite lookup
  @@map("workspace_invites")
}
```

**Model**: `OrgPosition` (no changes, but note single-occupant constraint)

```prisma
model OrgPosition {
  // ... existing fields ...
  userId          String?       // Already exists - single occupant enforced at app level
  
  // No unique constraint on userId (users can be in multiple workspaces)
  // Single-occupant per workspace enforced in application logic
}
```

### C.2. Migration SQL

**File**: `prisma/migrations/[timestamp]_add_position_invites/migration.sql`

```sql
-- Add positionId column (nullable for backward compatibility)
ALTER TABLE "workspace_invites" 
ADD COLUMN "positionId" TEXT;

-- Add viewerScopeType column
ALTER TABLE "workspace_invites" 
ADD COLUMN "viewerScopeType" TEXT;

-- Add viewerScopeRefId column
ALTER TABLE "workspace_invites" 
ADD COLUMN "viewerScopeRefId" TEXT;

-- Add foreign key constraint (ON DELETE SET NULL)
ALTER TABLE "workspace_invites"
ADD CONSTRAINT "workspace_invites_positionId_fkey" 
FOREIGN KEY ("positionId") 
REFERENCES "org_positions"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Add index on positionId for performance
CREATE INDEX "idx_invites_position" ON "workspace_invites"("positionId");

-- Add composite index for pending invite lookup by email
CREATE INDEX "idx_invites_email_status" 
ON "workspace_invites"("email", "revokedAt", "acceptedAt", "expiresAt");
```

### C.3. Viewer Scope Type Enum

**File**: `src/types/invites.ts` (NEW)

```typescript
export type ViewerScopeType = 
  | 'WORKSPACE_READONLY'  // Full workspace read-only access
  | 'TEAM_READONLY'        // Single team read-only access
  | 'PROJECTS_ONLY'        // Projects only (no org/wiki)
  | null;                  // No scope (for non-VIEWER roles)

export interface PositionInviteRequest {
  email: string
  role: WorkspaceRole
  viewerScopeType?: ViewerScopeType
  viewerScopeRefId?: string  // Required if viewerScopeType is TEAM_READONLY
}
```

---

## D. API Plan

### D.1. New Endpoint: POST /api/org/positions/[positionId]/invite

**File**: `src/app/api/org/positions/[positionId]/invite/route.ts` (NEW)

**Request**:
```typescript
{
  email: string
  role: WorkspaceRole
  viewerScopeType?: ViewerScopeType
  viewerScopeRefId?: string
}
```

**Response**:
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
  createdBy: { id, name, email }
}
```

**Logic**:
1. Auth: `getUnifiedAuth()` + `assertAccess(OWNER/ADMIN)`
2. Validate position exists and belongs to workspace
3. Validate position is not already occupied (if `userId` is set, return 409)
4. Validate email format
5. Validate role (OWNER/ADMIN restrictions apply)
6. Check if user is already a workspace member (409 if exists)
7. Check for existing pending invite (revoke old one if exists)
8. Generate secure token (32 bytes hex)
9. Create `WorkspaceInvite` with `positionId`
10. Return invite with URL

**Error Cases**:
- 401: Not authenticated
- 403: Insufficient permissions (not OWNER/ADMIN)
- 404: Position not found
- 409: Position already occupied OR user already a member
- 400: Invalid email/role

---

### D.2. Modify: POST /api/invites/[token]/accept

**File**: `src/app/api/invites/[token]/accept/route.ts`

**Current Logic** (line 225-234):
```typescript
// Create new membership
await prisma.workspaceMember.create({
  data: {
    workspaceId: invite.workspaceId,
    userId: auth.user.userId,
    role: invite.role as any
  }
})
```

**New Logic** (REPLACE lines 181-240 with fully atomic transaction):
```typescript
// CRITICAL: Everything in one transaction to prevent half-states
await prisma.$transaction(async (tx) => {
  // Step 1: Re-fetch invite inside transaction to ensure it's still valid
  const currentInvite = await tx.workspaceInvite.findUnique({
    where: { id: invite.id },
    select: {
      id: true,
      workspaceId: true,
      positionId: true,
      role: true,
      revokedAt: true,
      acceptedAt: true,
      expiresAt: true
    }
  })
  
  if (!currentInvite) {
    throw new Error('Invite not found')
  }
  
  // Re-validate invite status inside transaction
  const now = new Date()
  if (currentInvite.revokedAt) {
    throw new Error('This invite has been revoked')
  }
  if (currentInvite.acceptedAt) {
    throw new Error('This invite was already accepted')
  }
  if (currentInvite.expiresAt < now) {
    throw new Error('This invite has expired')
  }
  
  // Step 2: Create or upgrade WorkspaceMember
  const existingMember = await tx.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: currentInvite.workspaceId,
        userId: auth.user.userId
      }
    }
  })
  
  let finalRole = currentInvite.role
  if (existingMember) {
    // Upgrade role if invite role is higher
    const roleHierarchy: Record<string, number> = {
      VIEWER: 1, MEMBER: 2, ADMIN: 3, OWNER: 4
    }
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
  
  // Step 3: If position-based invite, assign user to position (atomic)
  if (currentInvite.positionId) {
    // 3a. Verify position exists and belongs to workspace (inside transaction)
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
    
    // 3b. If occupied by different user, throw 409
    if (position.userId && position.userId !== auth.user.userId) {
      throw new Error('Position already occupied')
    }
    
    // 3c. Remove user from other positions in same workspace (atomic)
    await tx.orgPosition.updateMany({
      where: {
        workspaceId: currentInvite.workspaceId,
        userId: auth.user.userId,
        id: { not: currentInvite.positionId }
      },
      data: { userId: null }
    })
    
    // 3d. Atomic conditional update: assign only if unoccupied
    const updateResult = await tx.orgPosition.updateMany({
      where: {
        id: currentInvite.positionId,
        userId: null  // CRITICAL: Only update if currently unoccupied
      },
      data: { userId: auth.user.userId }
    })
    
    // 3e. Verify update succeeded (race condition check)
    if (updateResult.count === 0) {
      throw new Error('Position already occupied')
    }
  }
  
  // Step 4: Mark invite as accepted (inside same transaction)
  await tx.workspaceInvite.update({
    where: { id: currentInvite.id },
    data: { acceptedAt: now }
  })
  
  return { finalRole, positionId: currentInvite.positionId }
})
```

**Note**: The position assignment logic is now fully integrated into the main transaction above. No separate helper function needed.

**Response Change**: Add `positionId` to response if assigned (from transaction result):
```typescript
{
  success: true,
  workspaceId: string,
  role: string,
  positionId?: string,  // NEW: Only present if position was assigned
  workspace: { id, name, slug }
}
```

**Note**: The transaction returns `{ finalRole, positionId }` which is used to build the response.

---

### D.3. Modify: PUT /api/org/positions/[id]

**File**: `src/app/api/org/positions/[id]/route.ts`

**Current Logic** (line 143): Updates `userId` without validation

**New Logic**: Add single-occupant validation before line 148:

```typescript
// If assigning a user, validate single-occupant constraint
if (userId !== undefined && userId !== null) {
  const existingPosition = await prisma.orgPosition.findUnique({
    where: { id: resolvedParams.id },
    select: { userId: true, workspaceId: true }
  })
  
  if (!existingPosition) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }
  
  // Check if position is already occupied by different user
  if (existingPosition.userId && existingPosition.userId !== userId) {
    return NextResponse.json(
      { error: 'Position is already occupied by another user' },
      { status: 409 }
    )
  }
  
  // Remove user from other positions in same workspace
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

---

### D.4. Modify: GET /api/auth/user-status

**File**: `src/app/api/auth/user-status/route.ts`

**Current Logic** (line 49-64): Returns error when no workspace

**New Logic**: **THIS IS THE SOURCE OF TRUTH**. Check for pending invites and return in response:

```typescript
// If user has no workspace, check for pending invites
if (error instanceof Error && error.message.includes('No workspace found')) {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.email) {
    // Normalize email (same as invite creation)
    const normalizedEmail = session.user.email.toLowerCase().trim()
    
    // Check for pending invites (most recent first)
    const pendingInvite = await prisma.workspaceInvite.findFirst({
      where: {
        email: normalizedEmail,
        revokedAt: null,
        acceptedAt: null,
        expiresAt: { gt: new Date() }
      },
      select: {
        token: true,
        workspaceId: true,
        workspace: {
          select: {
            slug: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' } // Most recent first
    })
    
    return NextResponse.json({
      isAuthenticated: true,
      isFirstTime: true,
      workspaceId: null,
      error: 'No workspace found',
      pendingInvite: pendingInvite ? {
        token: pendingInvite.token,
        workspace: {
          slug: pendingInvite.workspace.slug,
          name: pendingInvite.workspace.name
        }
      } : null,
      user: {
        id: (session.user as any).id,
        name: session.user.name,
        email: session.user.email
      }
    })
  }
  
  // ... rest of existing logic
}
```

**Critical**: All client-side redirect gates must check `userStatus.pendingInvite` before redirecting to `/welcome`.

---

## E. Concurrency Plan

### E.1. Fully Atomic Accept Flow

**Problem**: Multiple concurrent requests or partial failures could leave system in inconsistent state (member created but position failed, etc.).

**Solution**: **Everything in one transaction** - invite validation, membership creation, position assignment, invite acceptance.

**Pseudocode** (from D.2 above):
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Re-fetch invite inside transaction (ensures it's still valid)
  const currentInvite = await tx.workspaceInvite.findUnique({ where: { id: invite.id } })
  
  // 2. Re-validate invite status (revoked, accepted, expired)
  
  // 3. Create/upgrade WorkspaceMember
  
  // 4. If positionId exists:
  //    a. Verify position exists and belongs to workspace (CRITICAL: inside transaction)
  //    b. Check if occupied by different user → 409
  //    c. Remove user from other positions in workspace
  //    d. Atomic conditional update: assign only if userId IS NULL
  //    e. Verify update succeeded (result.count > 0)
  
  // 5. Mark invite as accepted
  
  // All steps succeed or all fail (ACID)
})
```

**Why This Works**:
1. **Single transaction**: All operations atomic (ACID)
2. **Re-fetch inside transaction**: Ensures invite is still valid at transaction start
3. **Workspace validation**: Position workspace check happens inside transaction
4. **Conditional update**: `updateMany({ where: { id, userId: null } })` only affects unoccupied positions
5. **Affected row count**: `result.count === 0` detects race conditions
6. **No half-states**: Either everything succeeds or everything rolls back

---

### E.2. User Already in Different Position

**Problem**: User accepts invite for Position B but already occupies Position A.

**Solution**: Remove from Position A in same transaction before assigning to Position B.

**Pseudocode** (integrated into E.1 Step 4c):
```typescript
// Remove user from other positions in same workspace (atomic)
await tx.orgPosition.updateMany({
  where: {
    workspaceId: currentInvite.workspaceId,
    userId: auth.user.userId,
    id: { not: currentInvite.positionId } // Exclude target position
  },
  data: { userId: null }
})
```

**Why This Works**:
- Runs in same transaction as position assignment and membership creation
- Atomic: either all succeed or all fail
- No gap where user is in two positions
- No gap where user is a member but not in any position

---

## F. Test Plan

### F.1. Manual Test Checklist

#### Test 1: Brand-New User Accepting Invite (Happy Path)
1. **Setup**: Create position in org chart
2. **Action**: Create position-based invite via API or UI
3. **Action**: Open invite link in incognito window
4. **Expected**: Redirected to login
5. **Action**: Authenticate with Google (new account)
6. **Expected**: Redirected back to invite page (not `/welcome`)
7. **Action**: Click "Accept Invite"
8. **Expected**: 
   - User assigned to position
   - Workspace membership created
   - Redirected to `/w/{workspaceSlug}` (not query param)
   - User can see org chart with their position filled

#### Test 2: Existing User Accepting Position Invite
1. **Setup**: User already has workspace(s), create position-based invite
2. **Action**: Open invite link (logged in)
3. **Expected**: Shows invite page with "Accept Invite" button
4. **Action**: Click "Accept Invite"
5. **Expected**:
   - User assigned to position
   - Workspace membership created/upgraded
   - Redirected to `/w/{workspaceSlug}`
   - User moved from old position (if existed) to new position

#### Test 3: Pending Invite Detection (No Workspace)
1. **Setup**: User has no workspace, create position-based invite
2. **Action**: Authenticate via OAuth
3. **Expected**: 
   - `/auth/callback` detects pending invite
   - Redirects to `/invites/{token}` (not `/welcome`)
4. **Action**: Accept invite
5. **Expected**: Workspace membership created, redirected to workspace

#### Test 4: Position Already Occupied
1. **Setup**: Position has user assigned
2. **Action**: Try to create invite for same position
3. **Expected**: API returns 409 "Position already occupied"

#### Test 5: Concurrent Position Assignment (Race Condition)
1. **Setup**: Empty position, two pending invites for different users
2. **Action**: Accept both invites simultaneously (two browser tabs)
3. **Expected**:
   - One succeeds (user assigned)
   - One fails with 409 "Position already occupied"
   - Position has exactly one user

#### Test 6: User Already in Different Position
1. **Setup**: User occupies Position A in workspace
2. **Action**: Accept invite for Position B in same workspace
3. **Expected**:
   - User removed from Position A
   - User assigned to Position B
   - Position A becomes empty
   - Position B has user

#### Test 7: Expired Invite
1. **Setup**: Create invite, manually set `expiresAt` to past
2. **Action**: Try to accept invite
3. **Expected**: 410 "This invite has expired"

#### Test 8: Revoked Invite
1. **Setup**: Create invite, revoke it
2. **Action**: Try to accept invite
3. **Expected**: 410 "This invite has been revoked"

#### Test 9: Email Mismatch
1. **Setup**: Create invite for `user@example.com`
2. **Action**: Log in as `different@example.com`, try to accept
3. **Expected**: 403 "This invite was sent to a different email address"

#### Test 10: Position Deleted After Invite Created
1. **Setup**: Create position-based invite
2. **Action**: Delete position
3. **Action**: Accept invite
4. **Expected**:
   - Invite still valid (positionId set to null via FK)
   - Workspace membership created
   - User NOT assigned to position (positionId is null)
   - No error (graceful degradation)

#### Test 11: Backward Compatibility (Workspace-Based Invite)
1. **Setup**: Create workspace-based invite (no positionId) from Settings
2. **Action**: Accept invite
3. **Expected**:
   - Workspace membership created
   - No position assignment (positionId is null)
   - Works as before

#### Test 12: Slug-Based Landing
1. **Setup**: Accept any invite
2. **Expected**: Redirected to `/w/{workspaceSlug}` (not `/home?workspaceId=...`)

---

### F.2. API-Level Tests (curl)

#### Test 1: Create Position-Based Invite
```bash
# Get auth token (replace with actual token)
TOKEN="your-session-token"

# Create invite
curl -X POST http://localhost:3000/api/org/positions/{positionId}/invite \
  -H "Cookie: next-auth.session-token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "role": "MEMBER",
    "viewerScopeType": null
  }'

# Expected: 200 with invite object including positionId
```

#### Test 2: Accept Position-Based Invite
```bash
# Accept invite
curl -X POST http://localhost:3000/api/invites/{token}/accept \
  -H "Cookie: next-auth.session-token=$TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 with { success: true, positionId: "...", workspace: { slug: "..." } }
```

#### Test 3: Try to Create Invite for Occupied Position
```bash
# Position already has userId set
curl -X POST http://localhost:3000/api/org/positions/{occupiedPositionId}/invite \
  -H "Cookie: next-auth.session-token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "role": "MEMBER"
  }'

# Expected: 409 "Position already occupied"
```

#### Test 4: Check Pending Invites (user-status)
```bash
# User with no workspace but pending invite
curl http://localhost:3000/api/auth/user-status \
  -H "Cookie: next-auth.session-token=$TOKEN"

# Expected: 200 with { pendingInvite: { token, workspaceId, workspace: { slug } } }
```

---

### F.3. Edge Cases

1. **Position deleted after invite created**: Invite remains valid, positionId → null, no position assignment
2. **User already a workspace member**: Upgrade role if invite role is higher, assign position
3. **Multiple pending invites for same user**: Most recent invite wins (or show all)
4. **Invite for deleted workspace**: 404 on accept (workspace FK constraint)
5. **Concurrent position assignment**: One succeeds, one fails with 409
6. **User in multiple workspaces**: Single-occupant per workspace (user can be in Position A in Workspace 1 and Position B in Workspace 2)

---

## Implementation Order

1. **Phase 1**: Schema migration + API foundation
   - Run migration
   - Create `POST /api/org/positions/[positionId]/invite`
   - Modify `POST /api/invites/[token]/accept` (fully atomic: membership + position + accept)
   - Modify `PUT /api/org/positions/[id]` (single-occupant validation)
   - Test API endpoints

2. **Phase 2**: Invite-aware onboarding (do this immediately after Phase 1)
   - Modify `src/app/api/auth/user-status/route.ts` (return `pendingInvite` - source of truth)
   - Modify redirect logic in `auth-wrapper.tsx`, `layout.tsx`, `home/layout.tsx` (check `pendingInvite` before `/welcome`)
   - Test brand-new user flow (no more "lost invite → /welcome" failure mode)

3. **Phase 3**: UI integration (can be deferred)
   - Add "Invite" button to org chart position cards
   - Create position invite dialog
   - Test UI flow

4. **Phase 4**: VIEWER enforcement (later)
   - Server-side read-only enforcement for VIEWER across org mutation routes
   - UI gating (hide "create" CTAs)
   - Viewer-safe empty states

---

## Critical Implementation Notes

1. **Fully Atomic Accept Flow**: Wrap everything in one `prisma.$transaction`: invite re-validation, membership creation/upgrade, position assignment, invite acceptance. No half-states.

2. **user-status is Source of Truth**: `GET /api/auth/user-status` returns `pendingInvite`. All client redirect gates check this field before redirecting to `/welcome`. Do NOT rely on auth callback routes.

3. **Email Normalization**: Always `toLowerCase().trim()` in both invite creation and pending invite lookup.

4. **Pending Invite Selection**: Most recent first (`ORDER BY createdAt DESC`), filter: `expiresAt > now`, `revokedAt IS NULL`, `acceptedAt IS NULL`.

5. **Position Assignment Concurrency**: 
   - Verify position belongs to workspace INSIDE transaction
   - Use conditional `updateMany({ where: { id, userId: null } })`
   - Check `result.count > 0` to detect race conditions

6. **Backward Compatibility**: `positionId` is nullable, existing workspace-based invites work unchanged.

7. **Slug-Based Redirects**: Always use `/w/{slug}`, never query params.

8. **Viewer Scope**: Store `viewerScopeType` and `viewerScopeRefId` but don't enforce in Phase 1-2. Enforcement in Phase 4.

---

## STOP

**This plan is complete. Do not implement until explicit approval.**

