-- Safe, idempotent version of position invites migration
-- Can be run multiple times without errors

-- Create ViewerScopeType enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ViewerScopeType') THEN
    CREATE TYPE "ViewerScopeType" AS ENUM ('WORKSPACE_READONLY', 'TEAM_READONLY', 'PROJECTS_ONLY');
  END IF;
END $$;

-- Add positionId column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_invites' 
    AND column_name = 'positionId'
  ) THEN
    ALTER TABLE "workspace_invites" ADD COLUMN "positionId" TEXT;
  END IF;
END $$;

-- Add viewerScopeType column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_invites' 
    AND column_name = 'viewerScopeType'
  ) THEN
    ALTER TABLE "workspace_invites" ADD COLUMN "viewerScopeType" "ViewerScopeType";
  END IF;
END $$;

-- Add viewerScopeRefId column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_invites' 
    AND column_name = 'viewerScopeRefId'
  ) THEN
    ALTER TABLE "workspace_invites" ADD COLUMN "viewerScopeRefId" TEXT;
  END IF;
END $$;

-- Add createdByRole column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_invites' 
    AND column_name = 'createdByRole'
  ) THEN
    ALTER TABLE "workspace_invites" ADD COLUMN "createdByRole" "WorkspaceRole";
  END IF;
END $$;

-- Backfill createdByRole if it's nullable
UPDATE "workspace_invites" wi
SET "createdByRole" = COALESCE(
  (SELECT wm.role 
   FROM "workspace_members" wm 
   WHERE wm."workspaceId" = wi."workspaceId" 
     AND wm."userId" = wi."createdByUserId" 
   LIMIT 1),
  'MEMBER'::"WorkspaceRole"
)
WHERE "createdByRole" IS NULL;

-- Set NOT NULL constraint if column exists and has values
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_invites' 
    AND column_name = 'createdByRole' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "workspace_invites" ALTER COLUMN "createdByRole" SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'workspace_invites_positionId_fkey'
  ) THEN
    ALTER TABLE "workspace_invites"
    ADD CONSTRAINT "workspace_invites_positionId_fkey" 
    FOREIGN KEY ("positionId") 
    REFERENCES "org_positions"("id") 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS "idx_invites_position" ON "workspace_invites"("positionId");
CREATE INDEX IF NOT EXISTS "idx_invites_pending_lookup" ON "workspace_invites"("workspaceId", "email", "revokedAt", "acceptedAt", "expiresAt");
CREATE INDEX IF NOT EXISTS "idx_invites_workspace_position" ON "workspace_invites"("workspaceId", "positionId");
