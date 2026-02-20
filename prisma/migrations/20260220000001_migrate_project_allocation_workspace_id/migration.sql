-- Migration: ProjectAllocation.orgId → workspaceId
-- Fixes hybrid scoping bug: ProjectAllocation used orgId instead of workspaceId,
-- breaking workspace-scoped queries and WORKSPACE_SCOPED_MODELS middleware.

-- Step 1: Add workspaceId column (nullable initially to allow data migration)
ALTER TABLE "project_allocations" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Step 2: Populate workspaceId from the related project's workspaceId (only where NULL)
UPDATE "project_allocations" pa
SET "workspaceId" = p."workspaceId"
FROM "projects" p
WHERE p."id" = pa."projectId"
  AND pa."workspaceId" IS NULL;

-- Step 3: For any orphaned rows (no matching project), fall back to orgId if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_allocations' AND column_name = 'orgId') THEN
    UPDATE "project_allocations"
    SET "workspaceId" = "orgId"
    WHERE "workspaceId" IS NULL;
  END IF;
END $$;

-- Step 4: Make workspaceId NOT NULL (only if still nullable)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_allocations' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "project_allocations" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
END $$;

-- Step 5: Add foreign key constraint to workspaces table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_allocations_workspaceId_fkey' AND table_name = 'project_allocations') THEN
    ALTER TABLE "project_allocations"
    ADD CONSTRAINT "project_allocations_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 6: Drop old orgId index and column (idempotent)
DROP INDEX IF EXISTS "project_allocations_orgId_projectId_idx";
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_allocations' AND column_name = 'orgId') THEN
    ALTER TABLE "project_allocations" DROP COLUMN "orgId";
  END IF;
END $$;

-- Step 7: Add new workspace-scoped index (idempotent)
CREATE INDEX IF NOT EXISTS "project_allocations_workspaceId_projectId_idx" ON "project_allocations"("workspaceId", "projectId");
CREATE INDEX IF NOT EXISTS "project_allocations_workspaceId_idx" ON "project_allocations"("workspaceId");
