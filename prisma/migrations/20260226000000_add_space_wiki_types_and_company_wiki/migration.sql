-- Migration: Add Space type, WikiPage type, and Company Wiki space per workspace
-- Spaces Architecture: TEAM | WIKI (company wiki), WikiPage type for scoping

-- ── 1. Enums ─────────────────────────────────────────────────────────────────
-- Create SpaceType enum or add WIKI if it exists with only TEAM (schema drift)
DO $$ BEGIN
  CREATE TYPE "SpaceType" AS ENUM ('TEAM', 'WIKI');
EXCEPTION
  WHEN duplicate_object THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'SpaceType' AND e.enumlabel = 'WIKI') THEN
      ALTER TYPE "SpaceType" ADD VALUE 'WIKI';
    END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "WikiPageType" AS ENUM ('TEAM_DOC', 'COMPANY_WIKI', 'PERSONAL_NOTE', 'PROJECT_DOC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Add type to spaces ───────────────────────────────────────────────────
-- Guard: add missing columns if spaces table has schema drift from alternate migration history
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "isPersonal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#3b82f6';
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "icon" TEXT DEFAULT 'folder';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'spaces' AND column_name = 'visibility') THEN
    ALTER TABLE "spaces" ADD COLUMN "visibility" TEXT DEFAULT 'PUBLIC';
  END IF;
END $$;

ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "type" "SpaceType" DEFAULT 'TEAM';

-- Personal spaces: type stays null
UPDATE "spaces" SET "type" = NULL WHERE "isPersonal" = true;

-- Existing non-personal spaces without type: default to TEAM
UPDATE "spaces" SET "type" = 'TEAM' WHERE "isPersonal" = false AND "type" IS NULL;

CREATE INDEX IF NOT EXISTS "spaces_workspaceId_type_idx" ON "spaces"("workspaceId", "type");

-- ── 3. Add type to wiki_pages ────────────────────────────────────────────────
ALTER TABLE "wiki_pages" ADD COLUMN IF NOT EXISTS "type" "WikiPageType";

-- ── 4. Add companyWikiSpaceId to workspaces ───────────────────────────────────
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "companyWikiSpaceId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_companyWikiSpaceId_key"
  ON "workspaces"("companyWikiSpaceId") WHERE "companyWikiSpaceId" IS NOT NULL;

ALTER TABLE "workspaces"
  DROP CONSTRAINT IF EXISTS "workspaces_companyWikiSpaceId_fkey";

ALTER TABLE "workspaces"
  ADD CONSTRAINT "workspaces_companyWikiSpaceId_fkey"
  FOREIGN KEY ("companyWikiSpaceId") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 5. Create Company Wiki space for each workspace ──────────────────────────
-- For each workspace without companyWikiSpaceId, create a Space with type=WIKI
INSERT INTO "spaces" (
  "id",
  "workspaceId",
  "name",
  "slug",
  "description",
  "color",
  "icon",
  "visibility",
  "isPersonal",
  "type",
  "ownerId",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  w.id,
  'Company Wiki',
  'company-wiki',
  'Company-wide documentation and wiki pages',
  '#3b82f6',
  'globe',
  'PUBLIC',
  false,
  'WIKI',
  w."ownerId",
  NOW(),
  NOW()
FROM "workspaces" w
WHERE w."companyWikiSpaceId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "spaces" s
    WHERE s."workspaceId" = w.id AND s."type" = 'WIKI'
  );

-- Update workspaces to link to their new company wiki space
UPDATE "workspaces" w
SET "companyWikiSpaceId" = s.id
FROM "spaces" s
WHERE s."workspaceId" = w.id
  AND s."type" = 'WIKI'
  AND w."companyWikiSpaceId" IS NULL;

-- ── 6. Backfill WikiPage.type ────────────────────────────────────────────────
-- PERSONAL_NOTE: space is personal or permissionLevel is personal
UPDATE "wiki_pages" wp
SET "type" = 'PERSONAL_NOTE'
WHERE wp."type" IS NULL
  AND (
    wp."permissionLevel" = 'personal'
    OR EXISTS (
      SELECT 1 FROM "spaces" s
      WHERE s.id = wp."spaceId" AND s."isPersonal" = true
    )
  );

-- COMPANY_WIKI: spaceId = companyWikiSpaceId
UPDATE "wiki_pages" wp
SET "type" = 'COMPANY_WIKI'
WHERE wp."type" IS NULL
  AND wp."spaceId" IN (
    SELECT "companyWikiSpaceId" FROM "workspaces" WHERE "companyWikiSpaceId" IS NOT NULL
  );

-- PROJECT_DOC: has ProjectDocumentation link
UPDATE "wiki_pages" wp
SET "type" = 'PROJECT_DOC'
WHERE wp."type" IS NULL
  AND EXISTS (
    SELECT 1 FROM "project_documentation" pd WHERE pd."wikiPageId" = wp.id
  );

-- TEAM_DOC: spaceId in team space (not personal, not wiki)
UPDATE "wiki_pages" wp
SET "type" = 'TEAM_DOC'
WHERE wp."type" IS NULL
  AND wp."spaceId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "workspaces" w
    WHERE w."companyWikiSpaceId" = wp."spaceId"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "spaces" s
    WHERE s.id = wp."spaceId" AND s."isPersonal" = true
  );

-- Legacy: workspace_type='team' with no spaceId → COMPANY_WIKI if we can't determine otherwise
-- Or leave as null for now; default to TEAM_DOC for remaining team pages
UPDATE "wiki_pages" wp
SET "type" = 'TEAM_DOC'
WHERE wp."type" IS NULL
  AND (wp."workspace_type" = 'team' OR wp."workspace_type" IS NULL)
  AND wp."permissionLevel" != 'personal';

-- Legacy pages with workspace_type='team' and no spaceId: migrate to company wiki
UPDATE "wiki_pages" wp
SET
  "type" = 'COMPANY_WIKI',
  "spaceId" = w."companyWikiSpaceId"
FROM "workspaces" w
WHERE w.id = wp."workspaceId"
  AND w."companyWikiSpaceId" IS NOT NULL
  AND wp."type" IS NULL
  AND wp."spaceId" IS NULL
  AND (wp."workspace_type" = 'team' OR wp."workspace_type" IS NULL);
