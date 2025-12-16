-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "org_departments_workspaceId_name_key" ON "org_departments"("workspaceId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "org_departments_workspaceId_idx" ON "org_departments"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "org_teams_workspaceId_departmentId_name_key" ON "org_teams"("workspaceId", "departmentId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "org_teams_workspaceId_idx" ON "org_teams"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "org_teams_departmentId_idx" ON "org_teams"("departmentId");

-- AddForeignKey
ALTER TABLE "org_departments" ADD CONSTRAINT "org_departments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_teams" ADD CONSTRAINT "org_teams_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_teams" ADD CONSTRAINT "org_teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "org_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add teamId column to org_positions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'org_positions' AND column_name = 'teamId'
    ) THEN
        ALTER TABLE "org_positions" ADD COLUMN "teamId" TEXT;
        CREATE INDEX IF NOT EXISTS "org_positions_teamId_idx" ON "org_positions"("teamId");
        ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "org_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

