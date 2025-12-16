# Position-Based Invites — Architecture Analysis

## Step 1: Analysis Only

### Current State Assessment

#### 1. WorkspaceInvite Model (Current)
**Location**: `prisma/schema.prisma:157-175`

**Current Fields**:
- `id`, `workspaceId`, `email`, `role` (WorkspaceRole), `token`, `expiresAt`, `acceptedAt`, `revokedAt`, `createdAt`, `createdByUserId`
- Relations: `workspace`, `createdBy`

**Gaps**:
- ❌ No `positionId` field — cannot link invite to position
- ❌ No `inviteType` or flag to distinguish position-based vs workspace-based invites
- ❌ No `viewerScope` field for VIEWER role scoping

#### 2. OrgPosition Model (Current)
**Location**: `prisma/schema.prisma:450-481`

**Current Fields**:
- `id`, `workspaceId`, `userId` (optional), `title`, `level`, `parentId`, `order`, `isActive`, etc.
- Relations: `user`, `team`, `workspace`, `parent`, `children`, `roleCard`

**Key Observations**:
- ✅ Single-occupant model already exists (`userId` is optional String?)
- ❌ No enforcement that `userId` can only be set once (no unique constraint)
- ❌ No validation preventing multiple users from being assigned to same position
- ✅ Position assignment happens via `PUT /api/org/positions/[id]` (line 143: `userId` can be set)

**Current Assignment Flow**:
- Admin assigns user via org chart UI (`/w/[workspaceSlug]/org/page.tsx`)
- Calls `PUT /api/org/positions/[id]` with `userId`
- No check if position already has a user
- No check if user is already assigned to another position

#### 3. Current Invite Flow

**Creation**:
1. User navigates to Settings → Members tab (`src/components/settings/workspace-members.tsx`)
2. Clicks "Invite Member"
3. Enters email + selects role (MEMBER/ADMIN only in UI, but API supports all roles)
4. POST `/api/workspaces/[workspaceId]/invites` (line 11-323)
   - Validates email format
   - Checks for existing member (409 if exists)
   - Revokes old pending invite if exists
   - Generates secure token (32 bytes hex)
   - Creates `WorkspaceInvite` record
   - Returns invite URL

**Acceptance**:
1. User clicks invite link: `/invites/[token]` (`src/app/(dashboard)/invites/[token]/page.tsx`)
2. Page checks authentication (redirects to login if not authenticated)
3. User clicks "Accept Invite"
4. POST `/api/invites/[token]/accept` (line 9-294)
   - Validates invite (not revoked, not accepted, not expired)
   - Verifies email matches logged-in user
   - Creates or updates `WorkspaceMember`:
     - If not member: Creates with invite role
     - If already member: Upgrades role if invite role is higher (never downgrades)
   - Marks invite as accepted (`acceptedAt = now()`)
   - Returns workspace info for redirect

**Gaps**:
- ❌ No position assignment during accept flow
- ❌ No validation that position exists before creating invite
- ❌ No check if position is already occupied

#### 4. Permission System

**Auth Pattern**:
- `getUnifiedAuth(request)` → Returns `AuthContext` with `workspaceId`, `user.userId`, `user.roles[]`
- `assertAccess({ userId, workspaceId, scope, requireRole })` → Validates workspace membership and role
- `setWorkspaceContext(workspaceId)` → Sets Prisma middleware context (currently disabled)

**WorkspaceRole Enum**:
- `OWNER` (level 4) — Can invite any role
- `ADMIN` (level 3) — Can invite ADMIN, MEMBER, VIEWER (cannot invite OWNER)
- `MEMBER` (level 2) — Cannot create invites
- `VIEWER` (level 1) — Cannot create invites

**VIEWER Role**:
- ✅ Defined in enum and role hierarchy
- ❌ No specific scoping logic found
- ❌ No viewerScope field or enforcement
- ⚠️ Requirement states: "VIEWER is scoped and read-only" — needs implementation

#### 5. Org UI Integration Points

**Org Chart Page**: `/w/[workspaceSlug]/org/page.tsx`
- Displays org tree with positions
- Allows creating/editing positions
- Allows assigning users to positions (via `handleUserAssignment`, line 516)
- No invite functionality from position level currently

**Position Form**: `src/components/org/position-form.tsx`
- Creates/edits positions
- Can assign existing users to positions
- No invite creation flow

**Gaps**:
- ❌ No "Invite to Position" button/action in org chart
- ❌ No position-based invite creation UI

#### 6. API Routes

**Existing Routes**:
- `POST /api/workspaces/[workspaceId]/invites` — Create workspace invite
- `GET /api/workspaces/[workspaceId]/invites` — List pending invites
- `POST /api/invites/[token]/accept` — Accept invite
- `PUT /api/org/positions/[id]` — Update position (including userId assignment)
- `GET /api/org/positions` — List positions
- `POST /api/org/positions` — Create position

**Missing Routes**:
- ❌ `POST /api/org/positions/[positionId]/invite` — Create position-based invite

#### 7. Data Integrity Risks

**Single-Occupant Enforcement**:
- ❌ No database constraint preventing multiple users in same position
- ❌ No application-level check in position update API
- ⚠️ Risk: Multiple users could be assigned to same position via concurrent requests

**Position Existence Validation**:
- ❌ No validation that position exists when creating invite
- ❌ No validation that position belongs to correct workspace

**Invite-Position Consistency**:
- ❌ No foreign key constraint between `WorkspaceInvite` and `OrgPosition`
- ⚠️ Risk: Invite could reference deleted position

#### 8. Backward Compatibility Considerations

**Existing Invites**:
- ✅ Current invites are workspace-scoped (no positionId)
- ⚠️ Need to support both position-based and workspace-based invites during transition
- ⚠️ Settings-based invite creation should remain functional (or be deprecated in Phase 5)

**Accept Flow**:
- ✅ Current accept flow creates workspace membership
- ⚠️ Need to extend to also assign position (if positionId exists on invite)
- ⚠️ Must handle invites without positionId (backward compatibility)

### Summary of Gaps

1. **Schema**: Missing `positionId`, `inviteType`, `viewerScope` fields on `WorkspaceInvite`
2. **Enforcement**: No single-occupant validation for positions
3. **API**: Missing position-based invite creation endpoint
4. **Accept Flow**: No position assignment during invite acceptance
5. **UI**: No invite creation from position level
6. **Permissions**: VIEWER scoping not implemented
7. **Validation**: No position existence/workspace validation for invites

---

## Step 2: Phased Implementation Plan

### Phase 0 — Architecture Audit ✅ (COMPLETE)

**Goal**: Understand current state and identify gaps

**Deliverables**:
- ✅ Analysis document (this file)
- ✅ Gap identification
- ✅ Risk assessment

**Status**: Complete

---

### Phase 1 — Data Model & API Foundation

**Goal**: Extend data model and create position-based invite API without UI changes

**Scope**:
- Schema changes to `WorkspaceInvite`
- New API endpoint for position-based invites
- Extend accept flow to assign position
- Enforce single-occupant constraint
- Backward compatibility for existing invites

**Files to Touch**:

1. **Schema**:
   - `prisma/schema.prisma`
     - Add `positionId String?` to `WorkspaceInvite`
     - Add `viewerScope Json?` to `WorkspaceInvite` (for future VIEWER scoping)
     - Add optional relation: `position OrgPosition?`
     - Add index: `@@index([positionId])` for performance
     - Add foreign key constraint: `positionId` → `OrgPosition.id`

2. **Migration**:
   - `prisma/migrations/[timestamp]_add_position_invites/migration.sql`
     - Add `positionId` column (nullable)
     - Add `viewerScope` column (nullable JSON)
     - Add foreign key constraint
     - Add index

3. **API Routes**:
   - `src/app/api/org/positions/[positionId]/invite/route.ts` (NEW)
     - POST: Create position-based invite
     - GET: List invites for position (optional, for Phase 2)
   - `src/app/api/invites/[token]/accept/route.ts` (MODIFY)
     - Add position assignment logic after workspace membership creation
     - Enforce single-occupant constraint
   - `src/app/api/org/positions/[id]/route.ts` (MODIFY)
     - Add single-occupant validation in PUT handler

4. **Validation Utilities** (NEW):
   - `src/lib/validators/position-invite.ts`
     - `validatePositionForInvite(positionId, workspaceId)`
     - `checkPositionOccupancy(positionId)`
     - `enforceSingleOccupant(positionId, userId)`

**Schema Changes**:

```prisma
model WorkspaceInvite {
  // ... existing fields ...
  positionId     String?       // NEW: Links invite to position
  viewerScope   Json?         // NEW: Optional scoping for VIEWER role
  position      OrgPosition?  @relation(fields: [positionId], references: [id], onDelete: SetNull)
  
  @@index([positionId], map: "idx_invites_position")
  // ... existing indexes ...
}
```

**API Changes**:

**POST `/api/org/positions/[positionId]/invite`**:
- Auth: `getUnifiedAuth()` + `assertAccess(OWNER/ADMIN)`
- Validate:
  - Position exists and belongs to workspace
  - Position is not already occupied (if `userId` is set)
  - User is not already a workspace member (or handle upgrade)
- Input: `{ email, role, viewerScope? }`
- Create `WorkspaceInvite` with `positionId`
- Return: `{ id, email, role, positionId, token, inviteUrl, expiresAt }`

**MODIFY `/api/invites/[token]/accept`**:
- After creating/updating `WorkspaceMember`:
  - If `invite.positionId` exists:
    - Check if position is occupied
    - If occupied by different user: Error 409 "Position already occupied"
    - If occupied by same user: No-op (already assigned)
    - If not occupied: Assign user to position
    - Enforce single-occupant: Remove user from any other positions in same workspace

**MODIFY `/api/org/positions/[id]` (PUT)**:
- When `userId` is provided:
  - Check if position already has a different user
  - If yes: Error 409 "Position already occupied"
  - If same user: Allow (no-op)
  - If no user: Allow assignment
  - Also remove user from other positions in workspace (enforce single-occupant per workspace)

**Permission Rules Affected**:
- None (same OWNER/ADMIN requirement for creating invites)

**Risks & Mitigations**:

1. **Risk**: Concurrent invites for same position
   - **Mitigation**: Database transaction with row-level lock on position
   - **Mitigation**: Check position occupancy before creating invite

2. **Risk**: Position deleted after invite created
   - **Mitigation**: Foreign key `onDelete: SetNull` (invite remains valid, positionId becomes null)
   - **Mitigation**: Accept flow handles null positionId gracefully (backward compatibility)

3. **Risk**: User assigned to multiple positions
   - **Mitigation**: Enforce single-occupant in accept flow (remove from other positions)

4. **Risk**: Breaking existing invites
   - **Mitigation**: `positionId` is nullable, existing invites work unchanged

**Acceptance Criteria**:
- ✅ Can create invite with `positionId` via API
- ✅ Accepting position-based invite assigns user to position
- ✅ Cannot assign multiple users to same position
- ✅ User can only occupy one position per workspace
- ✅ Existing workspace-based invites still work (no positionId)
- ✅ Position deletion doesn't break pending invites (positionId set to null)

**Test Plan**:

**Manual Tests**:
1. Create position-based invite via API
2. Accept invite → verify user assigned to position
3. Try to create second invite for occupied position → should fail
4. Try to accept invite for occupied position → should fail
5. Accept invite when user already in different position → should move user
6. Create workspace-based invite (no positionId) → should work as before

**Automated Tests** (optional, for future):
- `tests/api/org/positions/[positionId]/invite.spec.ts`
- `tests/api/invites/[token]/accept-position.spec.ts`

---

### Phase 2 — Org UI Integration

**Goal**: Add invite creation UI from position level in org chart

**Scope**:
- Add "Invite to Position" button/action in org chart
- Create position invite dialog component
- Role selector (OWNER/ADMIN/MEMBER/VIEWER)
- Basic viewer scope selector (minimal implementation)
- List position invites (optional)

**Files to Touch**:

1. **Components**:
   - `src/components/org/position-invite-dialog.tsx` (NEW)
     - Form: email, role selector, viewerScope (if VIEWER)
     - Calls `POST /api/org/positions/[positionId]/invite`
     - Shows success with invite URL
   - `src/app/(dashboard)/w/[workspaceSlug]/org/page.tsx` (MODIFY)
     - Add "Invite" button/action to position cards
     - Open `PositionInviteDialog` on click
     - Show invite status on position (optional: badge showing pending invites)

2. **UI Patterns**:
   - Follow existing `InviteUserDialog` pattern (`src/components/org/invite-user-dialog.tsx`)
   - Use shadcn components (Dialog, Select, Input, Button)
   - Role selector: OWNER, ADMIN, MEMBER, VIEWER (with restrictions based on inviter role)

**UI Changes**:

**Org Chart Position Card**:
- Add "Invite" button (only if position has no user and user has OWNER/ADMIN role)
- Button opens `PositionInviteDialog`
- Show badge if position has pending invites (optional)

**Position Invite Dialog**:
- Email input
- Role selector (filtered by inviter role):
  - OWNER can invite: OWNER, ADMIN, MEMBER, VIEWER
  - ADMIN can invite: ADMIN, MEMBER, VIEWER
- Viewer scope selector (if VIEWER selected):
  - Minimal: Simple text input or JSON editor (Phase 3 will expand)
- Submit → Create invite → Show success with copyable invite URL

**Permission Rules Affected**:
- UI: Hide "Invite" button for non-OWNER/ADMIN users
- UI: Disable OWNER option in role selector for non-OWNER inviters

**Risks & Mitigations**:

1. **Risk**: UI shows invite button for occupied positions
   - **Mitigation**: Check `position.userId` before showing button

2. **Risk**: Invite created but position occupied before acceptance
   - **Mitigation**: Accept flow validates position is still available (handled in Phase 1)

**Acceptance Criteria**:
- ✅ "Invite" button appears on unoccupied positions (for OWNER/ADMIN)
- ✅ Clicking "Invite" opens dialog with email, role, viewerScope fields
- ✅ Can create position-based invite from UI
- ✅ Success message shows invite URL
- ✅ Role selector respects inviter permissions (ADMIN cannot invite OWNER)

**Test Plan**:

**Manual Tests**:
1. As OWNER: Open org chart → Click "Invite" on unoccupied position → Fill form → Submit → Verify invite created
2. As ADMIN: Try to invite OWNER → Should not see OWNER option
3. As MEMBER: Should not see "Invite" button
4. Invite occupied position → Should show error or disable button

---

### Phase 3 — Permission Gating

**Goal**: Enforce VIEWER scoping and remove create CTAs for unauthorized users

**Scope**:
- Implement VIEWER scope enforcement
- Hide create/edit actions for VIEWER users
- Viewer-safe empty states
- Server-side permission checks for all org actions

**Files to Touch**:

1. **Permission Utilities**:
   - `src/lib/permissions/org-permissions.ts` (NEW or MODIFY existing)
     - `canCreatePosition(role)`
     - `canEditPosition(role)`
     - `canInviteToPosition(role)`
     - `getViewerScope(userId, workspaceId)` → Returns allowed actions/resources

2. **API Routes** (MODIFY all org routes):
   - `src/app/api/org/positions/route.ts` (POST) — Check role
   - `src/app/api/org/positions/[id]/route.ts` (PUT, DELETE) — Check role
   - `src/app/api/org/positions/[positionId]/invite/route.ts` (POST) — Check role
   - `src/app/api/org/departments/route.ts` — Check role
   - `src/app/api/org/teams/route.ts` — Check role

3. **Components**:
   - `src/app/(dashboard)/w/[workspaceSlug]/org/page.tsx` (MODIFY)
     - Hide create/edit buttons for VIEWER
     - Show read-only message for VIEWER
   - `src/components/org/position-form.tsx` (MODIFY)
     - Disable form for VIEWER
   - `src/components/org/position-invite-dialog.tsx` (MODIFY)
     - Hide for VIEWER

4. **Viewer Scope Implementation**:
   - `src/lib/permissions/viewer-scope.ts` (NEW)
     - Parse `viewerScope` JSON from invite
     - Validate scope against user actions
     - Example scope: `{ "canViewProjects": true, "canViewWiki": true, "canViewOrg": true }`

**Permission Rules**:

**VIEWER Role**:
- ✅ Can view full org tree (requirement: "Everyone can see the full org tree")
- ❌ Cannot create positions
- ❌ Cannot edit positions
- ❌ Cannot invite users
- ❌ Cannot assign users to positions
- ⚠️ Scoped actions based on `viewerScope` (if implemented)

**Server-Side Enforcement**:
- All POST/PUT/DELETE org routes check `assertAccess(requireRole: ['MEMBER'])` or higher
- VIEWER role fails these checks (role level 1 < MEMBER level 2)

**UI Gating**:
- Hide "Create Position" button for VIEWER
- Hide "Edit" button for VIEWER
- Hide "Invite" button for VIEWER
- Show "Read-only" badge or message

**Risks & Mitigations**:

1. **Risk**: VIEWER can still call API directly
   - **Mitigation**: Server-side checks in all routes (already in place via `assertAccess`)

2. **Risk**: VIEWER scope not implemented yet
   - **Mitigation**: Phase 3 implements basic structure, can expand in Phase 4

**Acceptance Criteria**:
- ✅ VIEWER cannot create/edit positions (server returns 403)
- ✅ VIEWER cannot invite users (server returns 403)
- ✅ UI hides create/edit buttons for VIEWER
- ✅ VIEWER can view full org tree (read-only)
- ✅ VIEWER scope structure in place (can expand later)

**Test Plan**:

**Manual Tests**:
1. As VIEWER: Try to create position → Should see disabled button or 403
2. As VIEWER: Try to invite user → Should not see "Invite" button
3. As VIEWER: View org chart → Should see all positions (read-only)
4. As VIEWER: Call POST `/api/org/positions` directly → Should return 403

---

### Phase 4 — Profile Completion (OPTIONAL)

**Goal**: Workspace-specific profile fields and position-based requirements

**Scope**:
- Workspace-specific user profile fields
- Position-based profile requirements
- Profile completion flow after invite acceptance

**Files to Touch**:
- `prisma/schema.prisma` — Add `WorkspaceUserProfile` model (optional)
- `src/app/(dashboard)/invites/[token]/page.tsx` — Add profile completion step
- `src/components/profile/workspace-profile-form.tsx` (NEW)

**Note**: This phase is optional and can be deferred. Not included in initial implementation.

---

### Phase 5 — Cleanup & Hardening

**Goal**: Deprecate settings-based invites, documentation, testing

**Scope**:
- Deprecate or remove settings-based invite creation
- Update documentation
- Add integration tests
- Performance optimization

**Files to Touch**:

1. **Deprecation**:
   - `src/components/settings/workspace-members.tsx` (MODIFY)
     - Remove or hide invite creation (redirect to org chart)
     - Show message: "Invite users from the Org Chart"
   - `src/app/api/workspaces/[workspaceId]/invites/route.ts` (MODIFY)
     - Add deprecation warning in response
     - Or remove entirely (if all invites must be position-based)

2. **Documentation**:
   - `docs/POSITION_BASED_INVITES.md` (NEW)
     - User guide for position-based invites
     - Admin guide for managing invites
   - Update `docs/MULTI_TENANT_INVITES.md`
     - Document position-based flow

3. **Testing**:
   - Add E2E tests for position invite flow
   - Add unit tests for single-occupant enforcement

**Decision Point**:
- **Option A**: Keep settings-based invites (backward compatibility)
- **Option B**: Remove settings-based invites (force position-based only)

**Recommendation**: Option A initially, deprecate with warning, remove in future major version.

**Acceptance Criteria**:
- ✅ Settings page shows deprecation message or redirects to org chart
- ✅ Documentation updated
- ✅ All position-based invite flows tested
- ✅ Performance acceptable (no N+1 queries)

---

## Implementation Order Summary

1. **Phase 1** (Foundation) — Data model, API, validation
2. **Phase 2** (UI) — Org chart integration
3. **Phase 3** (Permissions) — VIEWER gating, server-side enforcement
4. **Phase 4** (Optional) — Profile completion
5. **Phase 5** (Cleanup) — Deprecation, docs, tests

---

## Critical Dependencies

- Phase 2 depends on Phase 1 (API must exist)
- Phase 3 depends on Phase 1 (permission checks need position assignment)
- Phase 5 depends on Phases 1-3 (cleanup after features complete)

---

## Risk Assessment

**High Risk**:
- Single-occupant enforcement (concurrent assignment)
- Position deletion with pending invites
- Backward compatibility with existing invites

**Medium Risk**:
- VIEWER scoping implementation (new concept)
- UI/UX for position-based invites (new flow)

**Low Risk**:
- Schema changes (additive, nullable fields)
- API endpoint creation (follows existing patterns)

---

## Next Steps

**WAIT FOR EXPLICIT CONFIRMATION** before implementing any phase.

When approved, implement **ONE PHASE AT A TIME**, stopping after each phase for review.

