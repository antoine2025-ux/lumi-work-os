# Phase 1: Updated Schema & Migration Notes

## Updated Prisma Schema

### New Enum (add before WorkspaceInvite model)

**Location**: `prisma/schema.prisma` (add around line 1113, after `WorkspaceRole` enum)

```prisma
enum ViewerScopeType {
  WORKSPACE_READONLY
  TEAM_READONLY
  PROJECTS_ONLY
}
```

### Updated WorkspaceInvite Model

**Location**: `prisma/schema.prisma` (lines 157-175)

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
  viewerScopeType ViewerScopeType?     // Typed enum (not String) - WORKSPACE_READONLY | TEAM_READONLY | PROJECTS_ONLY
  viewerScopeRefId String?             // Reference ID (e.g., teamId for TEAM_READONLY)
  createdByRole   WorkspaceRole?       // Defense-in-depth: role of creator at invite creation time
  
  // Relations
  createdBy       User          @relation("InviteCreator", fields: [createdByUserId], references: [id], onDelete: Cascade)
  workspace       Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  position        OrgPosition?  @relation(fields: [positionId], references: [id], onDelete: SetNull) // NEW
  
  // Existing indexes
  @@index([workspaceId, email], map: "idx_invites_workspace_email")
  @@index([workspaceId, revokedAt, acceptedAt], map: "idx_invites_workspace_status")
  @@index([token], map: "idx_invites_token")
  
  // NEW INDEXES
  @@index([positionId], map: "idx_invites_position")
  @@index([workspaceId, email, revokedAt, acceptedAt, expiresAt], map: "idx_invites_pending_lookup")
  @@index([workspaceId, positionId], map: "idx_invites_workspace_position")
  
  @@map("workspace_invites")
}
```

---

## Migration SQL

**File**: `prisma/migrations/[timestamp]_add_position_invites/migration.sql`

**Migration Name**: `add_position_invites`

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
-- This optimizes the query: WHERE workspaceId = ? AND email = ? AND revokedAt IS NULL AND acceptedAt IS NULL AND expiresAt > ?
CREATE INDEX "idx_invites_pending_lookup" 
ON "workspace_invites"("workspaceId", "email", "revokedAt", "acceptedAt", "expiresAt");

-- Add composite index for workspace + position queries
-- This optimizes queries like: WHERE workspaceId = ? AND positionId = ?
CREATE INDEX "idx_invites_workspace_position" 
ON "workspace_invites"("workspaceId", "positionId");
```

---

## Field Details

### New Fields

1. **`positionId String?`**
   - Nullable for backward compatibility
   - Links invite to `OrgPosition`
   - Foreign key: `ON DELETE SET NULL` (if position deleted, invite remains valid)

2. **`viewerScopeType ViewerScopeType?`**
   - Typed enum (not String) for type safety
   - Values: `WORKSPACE_READONLY`, `TEAM_READONLY`, `PROJECTS_ONLY`
   - Only used when `role === 'VIEWER'`
   - Stored as PostgreSQL enum type

3. **`viewerScopeRefId String?`**
   - Nullable
   - Reference ID for scoped access (e.g., `teamId` for `TEAM_READONLY`)
   - Required when `viewerScopeType === 'TEAM_READONLY'`

4. **`createdByRole WorkspaceRole?`**
   - Defense-in-depth for OWNER invites
   - Stores creator's role at invite creation time
   - Used to validate OWNER invites at acceptance time
   - Prevents privilege escalation if creator's role changes after invite creation

### New Relation

- **`position OrgPosition?`**
  - Optional relation to `OrgPosition`
  - Foreign key: `onDelete: SetNull` (position deletion doesn't break invite)

### New Indexes

1. **`idx_invites_position`**
   - Single column index on `positionId`
   - Optimizes position-based invite queries

2. **`idx_invites_pending_lookup`**
   - Composite index: `(workspaceId, email, revokedAt, acceptedAt, expiresAt)`
   - Optimizes pending invite lookup in `user-status` API
   - Covers query: `WHERE workspaceId = ? AND email = ? AND revokedAt IS NULL AND acceptedAt IS NULL AND expiresAt > ?`

3. **`idx_invites_workspace_position`**
   - Composite index: `(workspaceId, positionId)`
   - Optimizes queries filtering by workspace and position
   - Useful for listing invites for a specific position

---

## Defense-in-Depth: OWNER Invite Validation

### Approach: Store `createdByRole` on Invite

**Why**: Simpler than accept-time check, prevents privilege escalation.

**Implementation**:
1. **At Invite Creation** (`POST /api/org/positions/[positionId]/invite`):
   - Query creator's role: `prisma.workspaceMember.findUnique({ where: { workspaceId_userId }, select: { role } })`
   - Store in invite: `createdByRole: creatorMember.role`

2. **At Invite Acceptance** (`POST /api/invites/[token]/accept`):
   - If `invite.role === 'OWNER'`:
     - Validate: `invite.createdByRole === 'OWNER'`
     - If not → Return 403 "Invalid invite: Only workspace owners can create owner invites"

**Benefits**:
- Prevents privilege escalation if creator's role changes after invite creation
- No need to query creator's current role at acceptance time
- Simpler validation logic

---

## Backward Compatibility

- All new fields are nullable → Existing invites have `null` values
- Existing workspace-based invites (no `positionId`) continue to work
- Accept endpoint checks `if (positionId)` before assignment
- Response `positionId` is optional (only present if position was assigned)

---

## Migration Notes

**Command**:
```bash
npx prisma migrate dev --name add_position_invites
```

**Verification**:
1. Check migration file created in `prisma/migrations/`
2. Verify enum created: `SELECT typname FROM pg_type WHERE typname = 'ViewerScopeType';`
3. Verify columns added: `\d workspace_invites` (should show new columns)
4. Verify indexes created: `\d+ workspace_invites` (should show new indexes)
5. Verify foreign key: `SELECT conname FROM pg_constraint WHERE conname = 'workspace_invites_positionId_fkey';`

**Rollback** (if needed):
```sql
-- Drop indexes
DROP INDEX IF EXISTS "idx_invites_position";
DROP INDEX IF EXISTS "idx_invites_pending_lookup";
DROP INDEX IF EXISTS "idx_invites_workspace_position";

-- Drop foreign key
ALTER TABLE "workspace_invites" DROP CONSTRAINT IF EXISTS "workspace_invites_positionId_fkey";

-- Drop columns
ALTER TABLE "workspace_invites" DROP COLUMN IF EXISTS "positionId";
ALTER TABLE "workspace_invites" DROP COLUMN IF EXISTS "viewerScopeType";
ALTER TABLE "workspace_invites" DROP COLUMN IF EXISTS "viewerScopeRefId";
ALTER TABLE "workspace_invites" DROP COLUMN IF EXISTS "createdByRole";

-- Drop enum (only if no other tables use it)
DROP TYPE IF EXISTS "ViewerScopeType";
```

