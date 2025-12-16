-- CreateEnum
CREATE TYPE "ProjectSpaceVisibility" AS ENUM ('PUBLIC', 'TARGETED');

-- CreateTable
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

-- CreateTable
CREATE TABLE "project_space_members" (
    "id" TEXT NOT NULL,
    "projectSpaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_space_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_project_spaces_workspace" ON "project_spaces"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "project_space_members_projectSpaceId_userId_key" ON "project_space_members"("projectSpaceId", "userId");

-- CreateIndex
CREATE INDEX "idx_project_space_members_user" ON "project_space_members"("userId");

-- CreateIndex
CREATE INDEX "idx_project_space_members_space" ON "project_space_members"("projectSpaceId");

-- AddForeignKey
ALTER TABLE "project_spaces" ADD CONSTRAINT "project_spaces_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_space_members" ADD CONSTRAINT "project_space_members_projectSpaceId_fkey" FOREIGN KEY ("projectSpaceId") REFERENCES "project_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_space_members" ADD CONSTRAINT "project_space_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "projectSpaceId" TEXT;

-- CreateIndex
CREATE INDEX "idx_projects_project_space" ON "projects"("projectSpaceId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_projectSpaceId_fkey" FOREIGN KEY ("projectSpaceId") REFERENCES "project_spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
