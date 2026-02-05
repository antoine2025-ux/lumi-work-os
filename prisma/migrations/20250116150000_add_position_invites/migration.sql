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

-- Add createdByRole column (non-null, defense-in-depth for OWNER invites)
-- First add as nullable, then backfill, then set NOT NULL
ALTER TABLE "workspace_invites" 
ADD COLUMN "createdByRole" "WorkspaceRole";

-- Backfill createdByRole: Set to creator's current role if they're still a member, otherwise default to MEMBER
UPDATE "workspace_invites" wi
SET "createdByRole" = COALESCE(
  (SELECT wm.role 
   FROM "workspace_members" wm 
   WHERE wm."workspaceId" = wi."workspaceId" 
     AND wm."userId" = wi."createdByUserId" 
   LIMIT 1),
  'MEMBER'::"WorkspaceRole"
);

-- Now set NOT NULL constraint
ALTER TABLE "workspace_invites" 
ALTER COLUMN "createdByRole" SET NOT NULL;

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

