# Workspace Invitations & Membership Management

## Overview

This document describes the workspace invitation and membership management system in Loopwell 2.0. The system allows workspace owners and admins to invite users via email and manage workspace memberships.

## Data Model

### WorkspaceInvite Model

```prisma
model WorkspaceInvite {
  id            String        @id @default(cuid())
  workspaceId   String
  email         String        @db.VarChar(255)
  role          WorkspaceRole @default(MEMBER)
  token         String        @unique
  expiresAt     DateTime
  acceptedAt    DateTime?
  revokedAt     DateTime?
  createdAt     DateTime      @default(now())
  createdByUserId String
  
  workspace     Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy     User          @relation(fields: [createdByUserId], references: [id], onDelete: Cascade)
  
  @@index([workspaceId, email])
  @@index([workspaceId, revokedAt, acceptedAt])
  @@index([token])
  @@map("workspace_invites")
}
```

**Key Fields**:
- `token`: Secure random token (32 bytes hex) used in invite URL
- `email`: Normalized (lowercase, trimmed) email address
- `role`: Invited role (OWNER, ADMIN, MEMBER, VIEWER)
- `expiresAt`: Default 7 days from creation
- `acceptedAt`: Set when invite is accepted (null if pending)
- `revokedAt`: Set when invite is revoked (soft delete for audit trail)

## Invite Creation Flow

### Permissions

- **OWNER**: Can invite any role (OWNER, ADMIN, MEMBER, VIEWER)
- **ADMIN**: Can invite ADMIN, MEMBER, VIEWER (cannot invite OWNER)
- **MEMBER/VIEWER**: Cannot create invites

### Process

1. **Owner/Admin creates invite**:
   - Navigate to Settings → Members tab
   - Click "Invite Member"
   - Enter email and select role
   - Submit form

2. **Backend creates invite**:
   - Validates email format
   - Checks if user is already a member
   - Checks for existing pending invite (revokes old one if found)
   - Generates secure token (32 bytes random hex)
   - Sets expiry to 7 days from now
   - Creates `WorkspaceInvite` record

3. **Invite URL generated**:
   - Format: `${NEXT_PUBLIC_APP_URL}/invites/${token}`
   - Displayed in UI with copy button
   - **TODO**: Email sending integration (currently manual copy)

### Duplicate Invite Handling

If a pending invite exists for the same `workspaceId` + `email`:
- Old invite is **revoked** (soft delete: `revokedAt = now()`)
- New invite is created with fresh token and expiry
- This prevents multiple active invites for the same user

## Accept Invite Flow

### Requirements

1. **User must be logged in**: Authentication required
2. **Email must match**: Invite email must match logged-in user's email (case-insensitive)
3. **Invite must be valid**:
   - `revokedAt` IS NULL
   - `acceptedAt` IS NULL
   - `expiresAt` > now()

### Process

1. **User clicks invite link**: `/invites/{token}`
2. **Page checks authentication**:
   - If not logged in → redirect to login
   - If logged in → show accept button
3. **User clicks "Accept Invite"**:
   - POST to `/api/invites/{token}/accept`
   - Backend validates invite and email match
   - Creates or updates `WorkspaceMember`:
     - **If not a member**: Create with invite role
     - **If already a member**: Upgrade role if invite role is higher (never downgrade)
   - Marks invite as accepted: `acceptedAt = now()`
4. **Redirect**: User redirected to workspace dashboard

### Role Upgrade Logic

When accepting an invite for a workspace where user is already a member:

- **Role hierarchy**: OWNER > ADMIN > MEMBER > VIEWER
- **Upgrade**: If invite role is higher than current role, upgrade to invite role
- **No downgrade**: If invite role is lower, keep current role (silent, no error)

Example:
- User is MEMBER
- Invite is for ADMIN → Upgrade to ADMIN ✅
- Invite is for VIEWER → Keep MEMBER (no downgrade) ✅

## Revocation Flow

### Permissions

- **OWNER/ADMIN**: Can revoke any pending invite

### Process

1. **Owner/Admin revokes invite**:
   - Navigate to Settings → Members → Pending Invites
   - Click revoke button (trash icon)
   - DELETE to `/api/workspaces/{workspaceId}/invites/{inviteId}`

2. **Backend revokes invite**:
   - Sets `revokedAt = now()` (soft delete)
   - Invite can no longer be accepted

## API Endpoints

### Create Invite

**POST** `/api/workspaces/[workspaceId]/invites`

**Auth**: OWNER or ADMIN

**Body**:
```json
{
  "email": "user@example.com",
  "role": "MEMBER"
}
```

**Response**:
```json
{
  "id": "invite-id",
  "email": "user@example.com",
  "role": "MEMBER",
  "token": "abc123...",
  "inviteUrl": "https://app.com/invites/abc123...",
  "expiresAt": "2024-01-23T00:00:00Z",
  "createdAt": "2024-01-16T00:00:00Z",
  "createdBy": {
    "id": "user-id",
    "name": "Admin User",
    "email": "admin@example.com"
  }
}
```

### List Pending Invites

**GET** `/api/workspaces/[workspaceId]/invites`

**Auth**: OWNER or ADMIN

**Response**:
```json
{
  "invites": [
    {
      "id": "invite-id",
      "email": "user@example.com",
      "role": "MEMBER",
      "createdAt": "2024-01-16T00:00:00Z",
      "expiresAt": "2024-01-23T00:00:00Z",
      "createdBy": {
        "id": "user-id",
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ]
}
```

### Revoke Invite

**DELETE** `/api/workspaces/[workspaceId]/invites/[inviteId]`

**Auth**: OWNER or ADMIN

**Response**:
```json
{
  "message": "Invite revoked successfully",
  "invite": {
    "id": "invite-id",
    "email": "user@example.com",
    "revokedAt": "2024-01-16T12:00:00Z"
  }
}
```

### Accept Invite

**POST** `/api/invites/[token]/accept`

**Auth**: Logged in user (email must match invite email)

**Response**:
```json
{
  "success": true,
  "workspaceId": "workspace-id",
  "role": "MEMBER",
  "workspace": {
    "id": "workspace-id",
    "name": "My Workspace",
    "slug": "my-workspace"
  }
}
```

### List Members

**GET** `/api/workspaces/[workspaceId]/members`

**Auth**: MEMBER or higher

**Response**:
```json
{
  "members": [
    {
      "id": "membership-id",
      "userId": "user-id",
      "role": "MEMBER",
      "joinedAt": "2024-01-16T00:00:00Z",
      "user": {
        "id": "user-id",
        "name": "User Name",
        "email": "user@example.com",
        "image": "https://..."
      }
    }
  ]
}
```

## Security Considerations

### Multi-Tenant Safety

- All queries filtered by `workspaceId` from auth context
- Route param `workspaceId` validated against `auth.workspaceId`
- No client-supplied `workspaceId` trusted

### Token Security

- Tokens generated using `crypto.randomBytes(32).toString('hex')` (64 character hex string)
- Tokens are unique (database constraint)
- Tokens cannot be guessed or enumerated

### Email Verification

- Invite email must match logged-in user's email (case-insensitive)
- Prevents accepting invites meant for other users
- Returns 403 if email mismatch

### Role Restrictions

- Non-OWNER cannot invite OWNER
- Validated server-side before creating invite

### Expiry

- Default: 7 days from creation
- Expired invites cannot be accepted (returns 410)
- Expired invites still visible in pending list (marked as expired)

## Example Flow

### Scenario: Owner invites user@example.com as MEMBER

1. **Owner creates invite**:
   ```
   POST /api/workspaces/ws-123/invites
   {
     "email": "user@example.com",
     "role": "MEMBER"
   }
   ```
   Response includes `inviteUrl`: `https://app.com/invites/abc123...`

2. **Owner copies invite link** (or sends via email - TODO)

3. **User clicks invite link**:
   - If not logged in → redirected to `/login`
   - If logged in → sees accept page

4. **User accepts invite**:
   ```
   POST /api/invites/abc123.../accept
   ```
   - Backend validates:
     - User is logged in ✅
     - Invite email matches user email ✅
     - Invite not revoked ✅
     - Invite not expired ✅
   - Creates `WorkspaceMember`:
     ```
     workspaceId: ws-123
     userId: user-id
     role: MEMBER
     ```
   - Marks invite as accepted: `acceptedAt = now()`

5. **User redirected to workspace**: `/home?workspaceId=ws-123`

6. **Membership appears**:
   - User can now access workspace
   - User appears in Members list
   - User can switch to workspace via switcher

## UI Components

### Settings → Members Tab

- **Members Table**: Lists all workspace members with name, email, role, joined date
- **Invite Form**: OWNER/ADMIN only, email input + role select
- **Pending Invites Table**: Lists pending invites with email, role, invited by, expires, actions
- **Actions**: Copy invite link, revoke invite

### Invite Accept Page

- **Route**: `/invites/[token]`
- **Shows**: Invite details, accept button
- **If not logged in**: Login prompt
- **After accept**: Success message + redirect to workspace

## Future Enhancements

- [ ] Email sending integration (Resend, SendGrid, etc.)
- [ ] Bulk invite (CSV upload)
- [ ] Invite resend functionality
- [ ] Custom invite expiry per invite
- [ ] Invite analytics (acceptance rate, etc.)
- [ ] Email templates customization

## Related Documentation

- `docs/MULTI_TENANT_HARDENING.md` - Multi-tenant security
- `docs/MULTI_WORKSPACE_UX.md` - Workspace UX behavior
- `ARCHITECTURE_SUMMARY.md` - Overall architecture
