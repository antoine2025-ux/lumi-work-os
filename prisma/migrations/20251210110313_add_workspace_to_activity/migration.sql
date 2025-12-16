-- AlterTable
-- Add workspaceId column (nullable initially for data migration)
ALTER TABLE "activities" ADD COLUMN "workspaceId" TEXT;

-- Backfill workspaceId from related entities (deterministic only)
-- Only backfill from entities that have workspaceId: projects, tasks, wiki_pages
UPDATE "activities" a
SET "workspaceId" = (
  CASE 
    WHEN a."entity" = 'project' THEN (SELECT p."workspaceId" FROM "projects" p WHERE p."id" = a."entityId")
    WHEN a."entity" = 'task' THEN (SELECT t."workspaceId" FROM "tasks" t WHERE t."id" = a."entityId")
    WHEN a."entity" = 'wiki_page' THEN (SELECT w."workspaceId" FROM "wiki_pages" w WHERE w."id" = a."entityId")
    ELSE NULL
  END
)
WHERE a."workspaceId" IS NULL;

-- Delete activities that still have NULL workspaceId (orphaned)
-- This ensures tenant safety - we accept losing legacy rows that cannot be deterministically scoped
DELETE FROM "activities" WHERE "workspaceId" IS NULL;

-- AlterTable
-- Set workspaceId to NOT NULL after backfill
ALTER TABLE "activities" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "idx_activities_workspace" ON "activities"("workspaceId");

-- CreateIndex
CREATE INDEX "idx_activities_workspace_created" ON "activities"("workspaceId", "createdAt" DESC);
