-- Create project_person_links table if it doesn't exist
CREATE TABLE IF NOT EXISTS "project_person_links" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgPositionId" TEXT,
    "role" TEXT NOT NULL,
    "allocatedHours" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_person_links_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint if it doesn't exist (check both constraint and underlying index)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'project_person_links_projectId_userId_key'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'project_person_links_projectId_userId_key'
    ) THEN
        ALTER TABLE "project_person_links"
        ADD CONSTRAINT "project_person_links_projectId_userId_key"
        UNIQUE ("projectId", "userId");
    END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'project_person_links_projectId_fkey'
    ) THEN
        ALTER TABLE "project_person_links" 
        ADD CONSTRAINT "project_person_links_projectId_fkey" 
        FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'project_person_links_userId_fkey'
    ) THEN
        ALTER TABLE "project_person_links" 
        ADD CONSTRAINT "project_person_links_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'project_person_links_orgPositionId_fkey'
    ) THEN
        ALTER TABLE "project_person_links" 
        ADD CONSTRAINT "project_person_links_orgPositionId_fkey" 
        FOREIGN KEY ("orgPositionId") REFERENCES "org_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'project_person_links_workspaceId_fkey'
    ) THEN
        ALTER TABLE "project_person_links" 
        ADD CONSTRAINT "project_person_links_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "project_person_links_workspaceId_idx" ON "project_person_links"("workspaceId");
CREATE INDEX IF NOT EXISTS "project_person_links_userId_idx" ON "project_person_links"("userId");
CREATE INDEX IF NOT EXISTS "project_person_links_orgPositionId_idx" ON "project_person_links"("orgPositionId");

-- Backfill ProjectPersonLink from existing ProjectMember data
-- Maps ProjectRole: OWNER→OWNER, MEMBER→CONTRIBUTOR, ADMIN→CONTRIBUTOR, VIEWER→STAKEHOLDER
-- Handle case where orgPositionId may not exist on project_members table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_members' AND column_name = 'orgPositionId'
  ) THEN
    -- orgPositionId column exists, use it
    INSERT INTO "project_person_links" (id, "projectId", "userId", role, "orgPositionId", "workspaceId", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid(),
      pm."projectId",
      pm."userId",
      CASE pm.role
        WHEN 'OWNER' THEN 'OWNER'
        WHEN 'ADMIN' THEN 'CONTRIBUTOR'
        WHEN 'MEMBER' THEN 'CONTRIBUTOR'
        WHEN 'VIEWER' THEN 'STAKEHOLDER'
        ELSE 'CONTRIBUTOR'
      END,
      pm."orgPositionId",
      pm."workspaceId",
      NOW(),
      NOW()
    FROM "project_members" pm
    ON CONFLICT ("projectId", "userId") DO NOTHING;
  ELSE
    -- orgPositionId column doesn't exist, set it to NULL
    INSERT INTO "project_person_links" (id, "projectId", "userId", role, "orgPositionId", "workspaceId", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid(),
      pm."projectId",
      pm."userId",
      CASE pm.role
        WHEN 'OWNER' THEN 'OWNER'
        WHEN 'ADMIN' THEN 'CONTRIBUTOR'
        WHEN 'MEMBER' THEN 'CONTRIBUTOR'
        WHEN 'VIEWER' THEN 'STAKEHOLDER'
        ELSE 'CONTRIBUTOR'
      END,
      NULL,
      pm."workspaceId",
      NOW(),
      NOW()
    FROM "project_members" pm
    ON CONFLICT ("projectId", "userId") DO NOTHING;
  END IF;
END $$;

-- Backfill orgPositionId on ProjectPersonLink where missing but available
UPDATE "project_person_links" ppl
SET "orgPositionId" = op.id
FROM "org_positions" op
WHERE ppl."userId" = op."userId"
  AND ppl."workspaceId" = op."workspaceId"
  AND ppl."orgPositionId" IS NULL
  AND op."isActive" = true;

-- Backfill orgPositionId on existing ProjectAssignee records (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_assignees' AND column_name = 'orgPositionId'
  ) THEN
    UPDATE "project_assignees" pa
    SET "orgPositionId" = op.id
    FROM "org_positions" op
    WHERE pa."userId" = op."userId"
      AND pa."workspaceId" = op."workspaceId"
      AND pa."orgPositionId" IS NULL
      AND op."isActive" = true;
  END IF;
END $$;
