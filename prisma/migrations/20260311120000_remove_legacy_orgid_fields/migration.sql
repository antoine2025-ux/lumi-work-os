-- Remove legacy orgId fields from Project and OrgInvitation
-- Both models use workspaceId as their primary workspace reference; orgId was redundant.
-- Indexes on orgId are dropped automatically when the columns are dropped.

-- DropColumn
ALTER TABLE "projects" DROP COLUMN IF EXISTS "orgId";
ALTER TABLE "org_invitations" DROP COLUMN IF EXISTS "orgId";
