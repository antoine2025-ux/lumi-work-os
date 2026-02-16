-- CreateEnum: AllocationContextType
-- Defines the context type for work allocations (TEAM, PROJECT, ROLE, OTHER)
DO $$ BEGIN
    CREATE TYPE "AllocationContextType" AS ENUM ('TEAM', 'PROJECT', 'ROLE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: AllocationSource
-- Source tracking for allocations (MANUAL, INTEGRATION)
DO $$ BEGIN
    CREATE TYPE "AllocationSource" AS ENUM ('MANUAL', 'INTEGRATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: Create work_allocations table
-- This table defines committed work that consumes capacity for each person in a workspace
CREATE TABLE IF NOT EXISTS "work_allocations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "allocationPercent" DOUBLE PRECISION NOT NULL,
    "contextType" "AllocationContextType" NOT NULL,
    "contextId" TEXT,
    "contextLabel" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "source" "AllocationSource" NOT NULL DEFAULT 'MANUAL',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Index for workspace and person lookups
CREATE INDEX IF NOT EXISTS "work_allocations_workspaceId_personId_idx" ON "work_allocations"("workspaceId", "personId");

-- CreateIndex: Index for person and start date queries
CREATE INDEX IF NOT EXISTS "work_allocations_personId_startDate_idx" ON "work_allocations"("personId", "startDate");

-- CreateIndex: Index for workspace and context type queries
CREATE INDEX IF NOT EXISTS "work_allocations_workspaceId_contextType_idx" ON "work_allocations"("workspaceId", "contextType");

-- CreateIndex: Optimized index for capacity map queries with date range
CREATE INDEX IF NOT EXISTS "idx_work_allocations_capacity" ON "work_allocations"("workspaceId", "personId", "startDate", "endDate");

-- AddForeignKey: Foreign key to workspaces table
ALTER TABLE "work_allocations" ADD CONSTRAINT "work_allocations_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

