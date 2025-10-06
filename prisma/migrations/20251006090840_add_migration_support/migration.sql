-- CreateEnum
CREATE TYPE "MigrationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IntegrationType" ADD VALUE 'SLITE';
ALTER TYPE "IntegrationType" ADD VALUE 'CLICKUP';
ALTER TYPE "IntegrationType" ADD VALUE 'NOTION';
ALTER TYPE "IntegrationType" ADD VALUE 'CONFLUENCE';
ALTER TYPE "IntegrationType" ADD VALUE 'ASANA';
ALTER TYPE "IntegrationType" ADD VALUE 'TRELLO';
ALTER TYPE "IntegrationType" ADD VALUE 'MONDAY';

-- CreateTable
CREATE TABLE "migrations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "status" "MigrationStatus" NOT NULL DEFAULT 'PENDING',
    "progress" JSONB NOT NULL,
    "config" JSONB NOT NULL,
    "result" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migrations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "migrations" ADD CONSTRAINT "migrations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
