-- Phase 1 - Step 1.2: Schema Truth Migration
-- Migrates orgId to workspaceId for Org MVP models
-- Adds workspaceId where missing and removes dependency on deprecated orgId

-- Step 1: Add ownerPersonId to org_teams (nullable, for future team ownership)
ALTER TABLE "org_teams" ADD COLUMN IF NOT EXISTS "ownerPersonId" TEXT;
CREATE INDEX IF NOT EXISTS "org_teams_ownerPersonId_idx" ON "org_teams"("ownerPersonId");

-- Step 2: Create person_availability table if it doesn't exist, or add workspaceId if it does
CREATE TABLE IF NOT EXISTS "person_availability" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "fraction" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_availability_pkey" PRIMARY KEY ("id")
);

-- Add workspaceId column if table already existed without it
ALTER TABLE "person_availability" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Backfill workspaceId from User's workspace memberships (pick first workspace for each person)
-- This is a best-effort migration - in practice, PersonAvailability should be created with workspaceId
UPDATE "person_availability" pa
SET "workspaceId" = (
  SELECT wm."workspaceId"
  FROM "workspace_members" wm
  WHERE wm."userId" = pa."personId"
  LIMIT 1
)
WHERE pa."workspaceId" IS NULL OR pa."workspaceId" = '';

-- Make workspaceId NOT NULL (set default for any remaining nulls)
UPDATE "person_availability" SET "workspaceId" = (SELECT "id" FROM "workspaces" LIMIT 1) WHERE "workspaceId" IS NULL OR "workspaceId" = '';
ALTER TABLE "person_availability" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'person_availability_workspaceId_fkey'
  ) THEN
    ALTER TABLE "person_availability" ADD CONSTRAINT "person_availability_workspaceId_fkey" 
      FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'person_availability_personId_fkey'
  ) THEN
    ALTER TABLE "person_availability" ADD CONSTRAINT "person_availability_personId_fkey" 
      FOREIGN KEY ("personId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "person_availability_workspaceId_idx" ON "person_availability"("workspaceId");
CREATE INDEX IF NOT EXISTS "person_availability_workspaceId_personId_idx" ON "person_availability"("workspaceId", "personId");
CREATE INDEX IF NOT EXISTS "person_availability_personId_startDate_idx" ON "person_availability"("personId", "startDate");

-- Step 3: Create owner_assignments table if it doesn't exist, or migrate from orgId to workspaceId
CREATE TABLE IF NOT EXISTS "owner_assignments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityLabel" TEXT,
    "ownerPersonId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_assignments_pkey" PRIMARY KEY ("id")
);

-- Add workspaceId column if table already existed without it (for existing tables)
ALTER TABLE "owner_assignments" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- If table was just created, workspaceId is already NOT NULL
-- If table existed, backfill workspaceId (skip if orgId doesn't exist - table is fresh)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owner_assignments' AND column_name = 'orgId') THEN
    UPDATE "owner_assignments" 
    SET "workspaceId" = "orgId" 
    WHERE "workspaceId" IS NULL AND "orgId" IS NOT NULL;
  END IF;
END $$;

-- Make workspaceId NOT NULL (only if it's nullable from existing table)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'owner_assignments' 
    AND column_name = 'workspaceId' 
    AND is_nullable = 'YES'
  ) THEN
    UPDATE "owner_assignments" SET "workspaceId" = (SELECT "id" FROM "workspaces" LIMIT 1) WHERE "workspaceId" IS NULL;
    ALTER TABLE "owner_assignments" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraint
ALTER TABLE "owner_assignments" ADD CONSTRAINT "owner_assignments_workspaceId_fkey" 
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update unique constraint to use workspaceId instead of orgId
-- Drop old unique constraint if it exists (PostgreSQL doesn't support IF EXISTS on constraints directly)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'owner_assignments_orgId_entityType_entityId_key'
  ) THEN
    ALTER TABLE "owner_assignments" DROP CONSTRAINT "owner_assignments_orgId_entityType_entityId_key";
  END IF;
END $$;

-- Add new unique constraint on workspaceId
ALTER TABLE "owner_assignments" ADD CONSTRAINT "owner_assignments_workspaceId_entityType_entityId_key" 
  UNIQUE ("workspaceId", "entityType", "entityId");

-- Update indexes to use workspaceId
DROP INDEX IF EXISTS "owner_assignments_orgId_entityType_idx";
DROP INDEX IF EXISTS "owner_assignments_orgId_entityType_entityId_idx";
DROP INDEX IF EXISTS "owner_assignments_orgId_ownerPersonId_idx";

CREATE INDEX IF NOT EXISTS "owner_assignments_workspaceId_entityType_idx" ON "owner_assignments"("workspaceId", "entityType");
CREATE INDEX IF NOT EXISTS "owner_assignments_workspaceId_entityType_entityId_idx" ON "owner_assignments"("workspaceId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "owner_assignments_workspaceId_ownerPersonId_idx" ON "owner_assignments"("workspaceId", "ownerPersonId");

-- Step 4: Create person_manager_links table if it doesn't exist, or migrate from orgId to workspaceId
CREATE TABLE IF NOT EXISTS "person_manager_links" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_manager_links_pkey" PRIMARY KEY ("id")
);

-- Add workspaceId column if table already existed without it
ALTER TABLE "person_manager_links" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Backfill workspaceId from orgId (only if orgId column exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'person_manager_links' AND column_name = 'orgId') THEN
    UPDATE "person_manager_links" 
    SET "workspaceId" = "orgId" 
    WHERE "workspaceId" IS NULL AND "orgId" IS NOT NULL;
  END IF;
END $$;

-- Make workspaceId NOT NULL (only if it's nullable from existing table)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'person_manager_links' 
    AND column_name = 'workspaceId' 
    AND is_nullable = 'YES'
  ) THEN
    UPDATE "person_manager_links" SET "workspaceId" = (SELECT "id" FROM "workspaces" LIMIT 1) WHERE "workspaceId" IS NULL;
    ALTER TABLE "person_manager_links" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraint
ALTER TABLE "person_manager_links" ADD CONSTRAINT "person_manager_links_workspaceId_fkey" 
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update unique constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'person_manager_links_orgId_personId_managerId_key'
  ) THEN
    ALTER TABLE "person_manager_links" DROP CONSTRAINT "person_manager_links_orgId_personId_managerId_key";
  END IF;
END $$;

ALTER TABLE "person_manager_links" ADD CONSTRAINT "person_manager_links_workspaceId_personId_managerId_key" 
  UNIQUE ("workspaceId", "personId", "managerId");

-- Update indexes
DROP INDEX IF EXISTS "person_manager_links_orgId_personId_idx";
DROP INDEX IF EXISTS "person_manager_links_orgId_managerId_idx";

CREATE INDEX IF NOT EXISTS "person_manager_links_workspaceId_personId_idx" ON "person_manager_links"("workspaceId", "personId");
CREATE INDEX IF NOT EXISTS "person_manager_links_workspaceId_managerId_idx" ON "person_manager_links"("workspaceId", "managerId");

-- Step 5: Create person_availability_health table if it doesn't exist, or migrate from orgId to workspaceId
CREATE TABLE IF NOT EXISTS "person_availability_health" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "reason" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_availability_health_pkey" PRIMARY KEY ("id")
);

-- Add workspaceId column if table already existed without it
ALTER TABLE "person_availability_health" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Backfill workspaceId from orgId (only if orgId column exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'person_availability_health' AND column_name = 'orgId') THEN
    UPDATE "person_availability_health" 
    SET "workspaceId" = "orgId" 
    WHERE "workspaceId" IS NULL AND "orgId" IS NOT NULL;
  END IF;
END $$;

-- Make workspaceId NOT NULL (only if it's nullable from existing table)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'person_availability_health' 
    AND column_name = 'workspaceId' 
    AND is_nullable = 'YES'
  ) THEN
    UPDATE "person_availability_health" SET "workspaceId" = (SELECT "id" FROM "workspaces" LIMIT 1) WHERE "workspaceId" IS NULL;
    ALTER TABLE "person_availability_health" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraint
ALTER TABLE "person_availability_health" ADD CONSTRAINT "person_availability_health_workspaceId_fkey" 
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update unique constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'person_availability_health_orgId_personId_key'
  ) THEN
    ALTER TABLE "person_availability_health" DROP CONSTRAINT "person_availability_health_orgId_personId_key";
  END IF;
END $$;

ALTER TABLE "person_availability_health" ADD CONSTRAINT "person_availability_health_workspaceId_personId_key" 
  UNIQUE ("workspaceId", "personId");

-- Update indexes
DROP INDEX IF EXISTS "person_availability_health_orgId_personId_idx";
DROP INDEX IF EXISTS "person_availability_health_orgId_status_idx";

CREATE INDEX IF NOT EXISTS "person_availability_health_workspaceId_personId_idx" ON "person_availability_health"("workspaceId", "personId");
CREATE INDEX IF NOT EXISTS "person_availability_health_workspaceId_status_idx" ON "person_availability_health"("workspaceId", "status");

-- NOTE: The orgId columns remain in the tables for now (to avoid breaking existing code during transition).
-- They should be removed in a future migration after all code paths are updated to use workspaceId.

