-- Remove legacy orgId from projects (workspaceId is the primary reference)
DROP INDEX IF EXISTS "projects_orgId_idx";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "orgId";

-- Remove legacy orgId from org_invitations (workspaceId is the primary reference)
DROP INDEX IF EXISTS "org_invitations_orgId_status_idx";
ALTER TABLE "org_invitations" DROP CONSTRAINT IF EXISTS "org_invitations_orgId_fkey";
ALTER TABLE "org_invitations" DROP COLUMN IF EXISTS "orgId";
