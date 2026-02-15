-- Backfill ProjectPersonLink from existing ProjectMember data
-- Maps ProjectRole: OWNER→OWNER, MEMBER→CONTRIBUTOR, ADMIN→CONTRIBUTOR, VIEWER→STAKEHOLDER
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

-- Backfill orgPositionId on ProjectPersonLink where missing but available
UPDATE "project_person_links" ppl
SET "orgPositionId" = op.id
FROM "org_positions" op
WHERE ppl."userId" = op."userId"
  AND ppl."workspaceId" = op."workspaceId"
  AND ppl."orgPositionId" IS NULL
  AND op."isActive" = true;

-- Backfill orgPositionId on existing ProjectAssignee records
UPDATE "project_assignees" pa
SET "orgPositionId" = op.id
FROM "org_positions" op
WHERE pa."userId" = op."userId"
  AND pa."workspaceId" = op."workspaceId"
  AND pa."orgPositionId" IS NULL
  AND op."isActive" = true;
