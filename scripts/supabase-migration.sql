-- Migration: Add ProjectSpace tables and functionality
-- Run this in Supabase SQL Editor
-- Safe to run: Only adds new tables and a nullable column

-- Step 1: Create the ProjectSpaceVisibility enum
CREATE TYPE "ProjectSpaceVisibility" AS ENUM ('PUBLIC', 'TARGETED');

-- Step 2: Create project_spaces table
CREATE TABLE "project_spaces" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "ProjectSpaceVisibility" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_spaces_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create project_space_members table
CREATE TABLE "project_space_members" (
    "id" TEXT NOT NULL,
    "projectSpaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_space_members_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create indexes for performance
CREATE INDEX "idx_project_spaces_workspace" ON "project_spaces"("workspaceId");
CREATE UNIQUE INDEX "project_space_members_projectSpaceId_userId_key" ON "project_space_members"("projectSpaceId", "userId");
CREATE INDEX "idx_project_space_members_user" ON "project_space_members"("userId");
CREATE INDEX "idx_project_space_members_space" ON "project_space_members"("projectSpaceId");

-- Step 5: Add foreign key constraints
ALTER TABLE "project_spaces" ADD CONSTRAINT "project_spaces_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_space_members" ADD CONSTRAINT "project_space_members_projectSpaceId_fkey" FOREIGN KEY ("projectSpaceId") REFERENCES "project_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_space_members" ADD CONSTRAINT "project_space_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add projectSpaceId column to projects table (nullable, safe for existing data)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "projectSpaceId" TEXT;

-- Step 7: Create index on projects.projectSpaceId
CREATE INDEX IF NOT EXISTS "idx_projects_project_space" ON "projects"("projectSpaceId");

-- Step 8: Add foreign key from projects to project_spaces
ALTER TABLE "projects" ADD CONSTRAINT "projects_projectSpaceId_fkey" FOREIGN KEY ("projectSpaceId") REFERENCES "project_spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Verification queries (run these after migration to confirm):
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('project_spaces', 'project_space_members');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'projectSpaceId';


