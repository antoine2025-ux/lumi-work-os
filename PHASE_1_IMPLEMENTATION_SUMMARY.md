# Phase 1: Position-Based Invites Foundation — Implementation Summary

## What Changed

### 1. Prisma Schema Updates

**File**: `prisma/schema.prisma`

**Changes**:
- ✅ Added `ViewerScopeType` enum (WORKSPACE_READONLY, TEAM_READONLY, PROJECTS_ONLY)
- ✅ Added `positionId String?` to `WorkspaceInvite` (nullable)
- ✅ Added `viewerScopeType ViewerScopeType?` to `WorkspaceInvite` (typed enum, nullable)
- ✅ Added `viewerScopeRefId String?` to `WorkspaceInvite` (nullable)
- ✅ Added `createdByRole WorkspaceRole` to `WorkspaceInvite` (non-null, defense-in-depth)
- ✅ Added relation: `position OrgPosition?` to `WorkspaceInvite`
- ✅ Added `invites WorkspaceInvite[]` to `OrgPosition` (opposite relation)
- ✅ Added 3 new indexes:
  - `idx_invites_position` (single column on `positionId`)
  - `idx_invites_pending_lookup` (composite: workspaceId, email, revokedAt, acceptedAt, expiresAt)
  - `idx_invites_workspace_position` (composite: workspaceId, positionId)

### 2. Migration Created

**File**: `prisma/migrations/20250112122500_add_position_invites/migration.sql`

**Changes**:
- ✅ Creates `ViewerScopeType` enum
- ✅ Adds all new columns (positionId, viewerScopeType, viewerScopeRefId, createdByRole)
- ✅ Backfills `createdByRole` for existing invites (uses creator's current role or defaults to MEMBER)
- ✅ Sets `createdByRole` to NOT NULL after backfill
- ✅ Creates foreign key constraint (ON DELETE SET NULL)
- ✅ Creates all 3 indexes

**Migration Command**:
```bash
npx prisma migrate dev --name add_position_invites
```

### 3. Updated Existing Endpoint: POST /api/workspaces/[workspaceId]/invites

**File**: `src/app/api/workspaces/[workspaceId]/invites/route.ts`

**Changes**:
- ✅ Accepts optional `viewerScopeType` and `viewerScopeRefId` in request body
- ✅ Validates `viewerScopeType` (only for VIEWER role)
- ✅ Validates `viewerScopeRefId` required when `viewerScopeType === 'TEAM_READONLY'`
- ✅ Gets creator's role and stores in `createdByRole` field
- ✅ Sets `createdByRole` when creating invite

**Backward Compatibility**: ✅ Maintained (viewerScopeType/viewerScopeRefId are optional)

### 4. New Endpoint: POST /api/org/positions/[positionId]/invite

**File**: `src/app/api/org/positions/[positionId]/invite/route.ts` (NEW)

**Functionality**:
- ✅ Validates position exists and belongs to workspace
- ✅ Validates position is not already occupied (409 if occupied)
- ✅ Validates email format and normalizes email
- ✅ Validates role (with OWNER restrictions)
- ✅ Validates viewerScopeType/viewerScopeRefId (if provided)
- ✅ Checks for existing member (409 if already member)
- ✅ Revokes old pending invite if exists
- ✅ Generates secure token
- ✅ Creates invite with `positionId`, `viewerScopeType`, `viewerScopeRefId`, `createdByRole`
- ✅ Returns invite with `positionId` in response

**Error Codes**: 400, 401, 403, 404, 409, 500

### 5. Updated Accept Endpoint: POST /api/invites/[token]/accept

**File**: `src/app/api/invites/[token]/accept/route.ts`

**Changes**:
- ✅ **Fully atomic transaction**: All operations wrapped in `prisma.$transaction`
- ✅ Re-fetches and re-validates invite inside transaction
- ✅ **Defense-in-depth**: Validates `invite.role === 'OWNER'` requires `invite.createdByRole === 'OWNER'` (403 if not)
- ✅ Creates/upgrades WorkspaceMember inside transaction
- ✅ **Position assignment**: If `positionId` exists:
  - Verifies position exists and belongs to workspace
  - Checks if occupied by different user (409 if occupied)
  - Removes user from other positions in workspace (atomic)
  - Atomically assigns user to position (conditional update)
  - Verifies update succeeded (race condition check)
- ✅ Marks invite as accepted inside transaction
- ✅ Returns `positionId` in response (if assigned)
- ✅ Enhanced error handling with explicit status codes (403, 404, 409, 410, 500)

**Backward Compatibility**: ✅ Maintained (positionId is optional, existing invites work)

### 6. Updated Position Update Endpoint: PUT /api/org/positions/[id]

**File**: `src/app/api/org/positions/[id]/route.ts`

**Changes**:
- ✅ **Single-occupant enforcement**: Returns 409 if position already occupied by different user
- ✅ **One-position-per-user-per-workspace**: Removes user from other positions before assigning
- ✅ Validation happens before update

**Error Codes**: 409 "Position is already occupied by another user"

---

## Files Touched

### Created:
1. `prisma/migrations/20250112122500_add_position_invites/migration.sql`
2. `src/app/api/org/positions/[positionId]/invite/route.ts`

### Modified:
1. `prisma/schema.prisma`
   - Added `ViewerScopeType` enum
   - Updated `WorkspaceInvite` model (4 new fields, 1 new relation, 3 new indexes)
   - Updated `OrgPosition` model (added `invites` relation)

2. `src/app/api/workspaces/[workspaceId]/invites/route.ts`
   - Added viewerScopeType/viewerScopeRefId validation
   - Added createdByRole storage

3. `src/app/api/invites/[token]/accept/route.ts`
   - Wrapped in transaction
   - Added OWNER invite validation
   - Added position assignment logic
   - Enhanced error handling

4. `src/app/api/org/positions/[id]/route.ts`
   - Added single-occupant validation
   - Added one-position-per-user logic

---

## Key Features Implemented

### ✅ Atomic Operations
- Accept endpoint uses single transaction for all operations
- No half-states (member created but position failed, etc.)

### ✅ Single-Occupant Enforcement
- Position update endpoint validates position not occupied
- Accept endpoint validates position not occupied
- Race condition protection via conditional update

### ✅ One-Position-Per-User-Per-Workspace
- Accept endpoint removes user from other positions before assigning
- Position update endpoint removes user from other positions before assigning

### ✅ Defense-in-Depth for OWNER Invites
- `createdByRole` stored at invite creation time
- Validated at acceptance time (prevents privilege escalation)

### ✅ Backward Compatibility
- All new fields nullable (except createdByRole, which is backfilled)
- Existing workspace-based invites continue to work
- Accept endpoint handles invites without positionId gracefully

### ✅ Explicit Error Codes
- 400: Validation errors
- 401: Not authenticated
- 403: Insufficient permissions, email mismatch, invalid OWNER invite
- 404: Position/invite not found
- 409: Position occupied, user already member, invite already accepted
- 410: Invite revoked/expired
- 500: Server errors

---

## Next Steps

1. **Run Migration**: `npx prisma migrate dev` (or `npx prisma migrate deploy` in production)
2. **Test API Endpoints**: Use curl/Postman to test new endpoint and updated endpoints
3. **Verify Backward Compatibility**: Test existing workspace-based invites still work
4. **Phase 2**: UI integration (invite creation from org chart)

---

## Testing Checklist

### Schema Migration
- [ ] Run migration successfully
- [ ] Verify enum created in database
- [ ] Verify columns added
- [ ] Verify indexes created
- [ ] Verify foreign key constraint exists
- [ ] Verify existing invites have `createdByRole` backfilled

### New Endpoint: POST /api/org/positions/[positionId]/invite
- [ ] Create invite for unoccupied position → 200 OK
- [ ] Create invite for occupied position → 409 Conflict
- [ ] Create invite with invalid positionId → 404 Not Found
- [ ] Create invite with invalid role → 400 Bad Request
- [ ] Create OWNER invite as non-OWNER → 403 Forbidden
- [ ] Create invite with viewerScopeType for VIEWER → 200 OK
- [ ] Create invite with viewerScopeType for non-VIEWER → 400 Bad Request

### Updated Accept Endpoint
- [ ] Accept position-based invite → User assigned to position
- [ ] Accept invite for occupied position → 409 Conflict
- [ ] Accept OWNER invite created by non-OWNER → 403 Forbidden
- [ ] Accept workspace-based invite (no positionId) → Works as before
- [ ] Accept invite when user in different position → User moved

### Updated Position Update Endpoint
- [ ] Assign user to empty position → 200 OK
- [ ] Assign user to occupied position → 409 Conflict
- [ ] Assign user when already in different position → User moved

---

## Implementation Complete ✅

All Phase 1 requirements implemented:
- ✅ Schema + migration with backfill
- ✅ New position-based invite endpoint
- ✅ Fully atomic accept endpoint
- ✅ Single-occupant enforcement
- ✅ Defense-in-depth for OWNER invites
- ✅ Backward compatibility maintained
- ✅ Explicit error codes

Ready for testing and Phase 2 (UI integration).

