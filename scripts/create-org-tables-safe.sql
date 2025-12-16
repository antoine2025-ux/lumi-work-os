-- Safe migration script that won't fail if tables/constraints already exist
-- Run this in Supabase SQL Editor

-- Create org_departments table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "org_departments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "org_departments_pkey" PRIMARY KEY ("id")
);

-- Create org_teams table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "org_teams" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "org_teams_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint for org_departments.workspaceId (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'org_departments' 
        AND c.conname = 'org_departments_workspaceId_fkey'
    ) THEN
        ALTER TABLE "org_departments" 
        ADD CONSTRAINT "org_departments_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for org_teams.workspaceId (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'org_teams' 
        AND c.conname = 'org_teams_workspaceId_fkey'
    ) THEN
        ALTER TABLE "org_teams" 
        ADD CONSTRAINT "org_teams_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for org_teams.departmentId (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'org_teams' 
        AND c.conname = 'org_teams_departmentId_fkey'
    ) THEN
        ALTER TABLE "org_teams" 
        ADD CONSTRAINT "org_teams_departmentId_fkey" 
        FOREIGN KEY ("departmentId") REFERENCES "org_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add unique constraint for org_departments (only if it doesn't exist)
CREATE UNIQUE INDEX IF NOT EXISTS "org_departments_workspaceId_name_key" ON "org_departments"("workspaceId", "name");

-- Add unique constraint for org_teams (only if it doesn't exist)
CREATE UNIQUE INDEX IF NOT EXISTS "org_teams_workspaceId_departmentId_name_key" ON "org_teams"("workspaceId", "departmentId", "name");

-- Add indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS "org_departments_workspaceId_idx" ON "org_departments"("workspaceId");
CREATE INDEX IF NOT EXISTS "org_teams_workspaceId_idx" ON "org_teams"("workspaceId");
CREATE INDEX IF NOT EXISTS "org_teams_departmentId_idx" ON "org_teams"("departmentId");

-- Add teamId column to org_positions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'org_positions' AND column_name = 'teamId'
    ) THEN
        ALTER TABLE "org_positions" ADD COLUMN "teamId" TEXT;
    END IF;
END $$;

-- Add foreign key constraint for org_positions.teamId (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'org_positions' 
        AND c.conname = 'org_positions_teamId_fkey'
    ) THEN
        ALTER TABLE "org_positions" 
        ADD CONSTRAINT "org_positions_teamId_fkey" 
        FOREIGN KEY ("teamId") REFERENCES "org_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add index for org_positions.teamId (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS "org_positions_teamId_idx" ON "org_positions"("teamId");




