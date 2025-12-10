# Workspace Invites Implementation Plan

## Overview

Implement a minimal but production-ready workspace invitation & membership management flow using token-based invites.

## Current State

- **Multi-tenancy**: Workspace + WorkspaceMember models exist
- **Auth**: getUnifiedAuth() + assertAccess() pattern used throughout
- **Frontend**: Settings page at `/settings` with tabs (workspace, notifications, etc.)
- **Existing**: Supabase-based invite system exists but we'll create a simpler token-based system

## Implementation Plan

### 1. Data Model: WorkspaceInvite

**File**: `prisma/schema.prisma`

**New Model**:
```prisma
model WorkspaceInvite {
  id            String       @id @default(cuid())
  workspaceId   String
  email         String       @db.VarChar(255)
  role          WorkspaceRole @default(MEMBER)
  token         String       @unique
  expiresAt     DateTime
  acceptedAt    DateTime?
  revokedAt     DateTime?
  createdAt     DateTime     @default(now())
  createdByUserId String
  
  workspace     Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy     User         @relation(fields: [createdByUserId], references: [id], onDelete: Cascade)
  
  @@index([workspaceId, email])
  @@index([workspaceId, revokedAt, acceptedAt])
  @@index([token])
  @@map("workspace_invites")
}
```

**Add to Workspace model**:
```prisma
invites WorkspaceInvite[]
```

**Add to User model**:
```prisma
createdInvites WorkspaceInvite[]
```

### 2. Backend Routes

#### 2.1 Invite Management (`/api/workspaces/[workspaceId]/invites`)

**File**: `src/app/api/workspaces/[workspaceId]/invites/route.ts`

**POST** - Create invite:
- Auth: getUnifiedAuth() + assertAccess(OWNER/ADMIN)
- Input: { email, role }
- Generate secure token (crypto.randomBytes)
- Default expiry: 7 days
- Handle duplicates: Revoke old pending invite, create new one
- Return: { id, email, role, token, inviteUrl, expiresAt }

**GET** - List pending invites:
- Auth: getUnifiedAuth() + assertAccess(OWNER/ADMIN)
- Filter: revokedAt IS NULL AND acceptedAt IS NULL AND expiresAt > now()
- Return: Array of invites with createdBy info

**DELETE** - Revoke invite:
- Route: `/api/workspaces/[workspaceId]/invites/[inviteId]`
- Auth: getUnifiedAuth() + assertAccess(OWNER/ADMIN)
- Soft revoke: Set revokedAt = now()

#### 2.2 Accept Invite (`/api/invites/[token]/accept`)

**File**: `src/app/api/invites/[token]/accept/route.ts`

**POST** - Accept invite:
- Auth: getUnifiedAuth() (user must be logged in)
- Find invite by token
- Validate: revokedAt IS NULL, acceptedAt IS NULL, expiresAt > now()
- Verify: invite.email matches user.email (case-insensitive)
- Upsert WorkspaceMember:
  - If exists: Upgrade role if invite.role is higher (never downgrade)
  - If not: Create with invite.role
- Mark accepted: Set acceptedAt = now()
- Return: { workspaceId, role, workspace: { id, name, slug } }

### 3. Frontend: Members & Invites UI

**File**: `src/app/(dashboard)/settings/page.tsx`

**Add new tab**: "Members" (or add to existing "workspace" tab)

**New component**: `src/components/settings/workspace-members.tsx`
- Fetch members: `/api/workspaces/[workspaceId]/members` (new endpoint)
- Fetch invites: `/api/workspaces/[workspaceId]/invites`
- Display:
  - Members table: name, email, role
  - Invites table: email, role, createdAt, expiresAt, createdBy, revoke button
  - Invite form: email input, role select (OWNER/ADMIN/MEMBER/VIEWER)
- Permissions: Only OWNER/ADMIN can see invite form and revoke buttons

**New endpoint**: `/api/workspaces/[workspaceId]/members`
- GET: List all members with user info
- Auth: getUnifiedAuth() + assertAccess(MEMBER)

### 4. Accept Invite Page

**File**: `src/app/(dashboard)/invites/[token]/page.tsx`

- Display invite details
- Show "Accept Invite" button (if logged in)
- If not logged in: Show login prompt
- After accept: Redirect to workspace

## Files to Create/Modify

### Create:
1. `prisma/migrations/XXXXXX_add_workspace_invites/migration.sql`
2. `src/app/api/workspaces/[workspaceId]/invites/route.ts`
3. `src/app/api/workspaces/[workspaceId]/invites/[inviteId]/route.ts`
4. `src/app/api/workspaces/[workspaceId]/members/route.ts`
5. `src/app/api/invites/[token]/accept/route.ts`
6. `src/components/settings/workspace-members.tsx`
7. `src/app/(dashboard)/invites/[token]/page.tsx`
8. `docs/MULTI_TENANT_INVITES.md`
9. `tests/workspace-invites.test.ts`

### Modify:
1. `prisma/schema.prisma` - Add WorkspaceInvite model
2. `src/app/(dashboard)/settings/page.tsx` - Add Members tab/section

## Security Considerations

- Token generation: Use crypto.randomBytes(32).toString('hex')
- Email verification: Must match logged-in user's email
- Role restrictions: Non-OWNER cannot invite OWNER
- Expiry: Default 7 days, configurable
- Revocation: Soft delete (revokedAt) for audit trail
- Multi-tenant safety: All queries filtered by workspaceId from auth context

## Testing Checklist

- [ ] Create invite as OWNER
- [ ] Create invite as ADMIN
- [ ] MEMBER cannot create invite
- [ ] Accept invite with matching email
- [ ] Reject accept with mismatched email
- [ ] Revoke invite
- [ ] Expired invite cannot be accepted
- [ ] Revoked invite cannot be accepted
- [ ] Duplicate invite revokes old one
- [ ] Role upgrade on accept (if already member)
