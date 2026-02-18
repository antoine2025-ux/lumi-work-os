-- CreateTable: Create workspace_onboarding_states table
-- This table tracks workspace onboarding state and admin profile data
-- The model exists in Prisma schema but the table was never created

CREATE TABLE IF NOT EXISTS "workspace_onboarding_states" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    
    -- Checklist steps (for future phases)
    "profileSetup" BOOLEAN NOT NULL DEFAULT false,
    "orgStructure" BOOLEAN NOT NULL DEFAULT false,
    "firstDepartment" BOOLEAN NOT NULL DEFAULT false,
    "firstTeam" BOOLEAN NOT NULL DEFAULT false,
    "firstInvite" BOOLEAN NOT NULL DEFAULT false,
    
    -- Admin profile data captured during onboarding
    "adminName" TEXT,
    "adminRole" TEXT,
    "adminDepartment" TEXT,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_onboarding_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_onboarding_states_workspaceId_key" ON "workspace_onboarding_states"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_onboarding_states_workspaceId_idx" ON "workspace_onboarding_states"("workspaceId");

-- AddForeignKey
ALTER TABLE "workspace_onboarding_states" ADD CONSTRAINT "workspace_onboarding_states_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

