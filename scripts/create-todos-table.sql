-- Quick SQL script to create todos table in Supabase
-- Run this in Supabase SQL Editor if Prisma migrations fail

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TodoStatus" AS ENUM ('OPEN', 'DONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TodoPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TodoAnchorType" AS ENUM ('NONE', 'PROJECT', 'TASK', 'PAGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "todos" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "status" "TodoStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "priority" "TodoPriority",
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "anchorType" "TodoAnchorType" NOT NULL DEFAULT 'NONE',
    "anchorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (only if they don't exist)
CREATE INDEX IF NOT EXISTS "idx_todos_workspace_assignee_status_due" ON "todos"("workspaceId", "assignedToId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "idx_todos_workspace_anchor" ON "todos"("workspaceId", "anchorType", "anchorId");
CREATE INDEX IF NOT EXISTS "idx_todos_workspace_creator" ON "todos"("workspaceId", "createdById");

-- AddForeignKey (only if they don't exist)
DO $$ BEGIN
    ALTER TABLE "todos" ADD CONSTRAINT "todos_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "todos" ADD CONSTRAINT "todos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "todos" ADD CONSTRAINT "todos_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

