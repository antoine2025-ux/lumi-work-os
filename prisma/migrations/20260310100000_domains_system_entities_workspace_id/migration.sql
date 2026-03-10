-- Migrate domains and system_entities from orgId to workspaceId
-- These tables were created with orgId but schema expects workspaceId.
-- In this codebase workspaceId and orgId are equivalent (workspace is the tenant boundary).

-- domains table
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
UPDATE "domains" SET "workspaceId" = "orgId" WHERE "workspaceId" IS NULL;
ALTER TABLE "domains" ALTER COLUMN "workspaceId" SET NOT NULL;
DROP INDEX IF EXISTS "domains_orgId_name_idx";
ALTER TABLE "domains" DROP COLUMN IF EXISTS "orgId";
CREATE INDEX IF NOT EXISTS "domains_workspaceId_name_idx" ON "domains"("workspaceId", "name");
ALTER TABLE "domains" ADD CONSTRAINT "domains_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- system_entities table
ALTER TABLE "system_entities" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
UPDATE "system_entities" SET "workspaceId" = "orgId" WHERE "workspaceId" IS NULL;
ALTER TABLE "system_entities" ALTER COLUMN "workspaceId" SET NOT NULL;
DROP INDEX IF EXISTS "system_entities_orgId_name_idx";
ALTER TABLE "system_entities" DROP COLUMN IF EXISTS "orgId";
CREATE INDEX IF NOT EXISTS "system_entities_workspaceId_name_idx" ON "system_entities"("workspaceId", "name");
ALTER TABLE "system_entities" ADD CONSTRAINT "system_entities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
