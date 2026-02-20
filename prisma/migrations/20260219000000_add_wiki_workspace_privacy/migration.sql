-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "WikiWorkspaceVisibility" AS ENUM ('PERSONAL', 'PRIVATE', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "WikiWorkspaceRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "wiki_workspaces" ADD COLUMN IF NOT EXISTS "visibility" "WikiWorkspaceVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE IF NOT EXISTS "wiki_workspace_members" (
    "id" TEXT NOT NULL,
    "wiki_workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "WikiWorkspaceRole" NOT NULL DEFAULT 'VIEWER',
    "granted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wiki_workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "wiki_workspace_members_wiki_workspace_id_user_id_key" ON "wiki_workspace_members"("wiki_workspace_id", "user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wiki_workspace_members_user_id_idx" ON "wiki_workspace_members"("user_id");

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (
     SELECT 1 FROM pg_constraint WHERE conname = 'wiki_workspace_members_wiki_workspace_id_fkey'
 ) THEN
     ALTER TABLE "wiki_workspace_members" ADD CONSTRAINT "wiki_workspace_members_wiki_workspace_id_fkey" FOREIGN KEY ("wiki_workspace_id") REFERENCES "wiki_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (
     SELECT 1 FROM pg_constraint WHERE conname = 'wiki_workspace_members_user_id_fkey'
 ) THEN
     ALTER TABLE "wiki_workspace_members" ADD CONSTRAINT "wiki_workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (
     SELECT 1 FROM pg_constraint WHERE conname = 'wiki_workspace_members_granted_by_id_fkey'
 ) THEN
     ALTER TABLE "wiki_workspace_members" ADD CONSTRAINT "wiki_workspace_members_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 END IF;
END $$;
