-- CreateTable: Create capacity_contracts table
-- This table defines weekly capacity when fully available for each person in a workspace

CREATE TABLE IF NOT EXISTS "capacity_contracts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "weeklyCapacityHours" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capacity_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Index for workspace and person lookups
CREATE INDEX IF NOT EXISTS "capacity_contracts_workspaceId_personId_idx" ON "capacity_contracts"("workspaceId", "personId");

-- CreateIndex: Index for person and effective date queries
CREATE INDEX IF NOT EXISTS "capacity_contracts_personId_effectiveFrom_idx" ON "capacity_contracts"("personId", "effectiveFrom");

-- CreateIndex: Index for workspace and effective date queries
CREATE INDEX IF NOT EXISTS "capacity_contracts_workspaceId_effectiveFrom_idx" ON "capacity_contracts"("workspaceId", "effectiveFrom");

-- CreateIndex: Optimized index for capacity map queries with date range
CREATE INDEX IF NOT EXISTS "idx_capacity_contracts_capacity" ON "capacity_contracts"("workspaceId", "personId", "effectiveFrom", "effectiveTo");

-- AddForeignKey: Foreign key to workspaces table
ALTER TABLE "capacity_contracts" ADD CONSTRAINT "capacity_contracts_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

