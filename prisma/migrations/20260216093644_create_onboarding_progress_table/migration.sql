-- CreateTable: Create onboarding_progress table
-- This table tracks workspace onboarding progress through the setup flow

CREATE TABLE IF NOT EXISTS "onboarding_progress" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "completedSteps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "orgBasicsComplete" BOOLEAN NOT NULL DEFAULT false,
    "departmentsCreated" BOOLEAN NOT NULL DEFAULT false,
    "teamsCreated" BOOLEAN NOT NULL DEFAULT false,
    "peopleInvited" BOOLEAN NOT NULL DEFAULT false,
    "capacitySet" BOOLEAN NOT NULL DEFAULT false,
    "integrationsConnected" BOOLEAN NOT NULL DEFAULT false,
    "orgName" TEXT,
    "orgIndustry" TEXT,
    "orgSize" TEXT,
    "skipReason" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_progress_workspaceId_key" ON "onboarding_progress"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "onboarding_progress_workspaceId_isComplete_idx" ON "onboarding_progress"("workspaceId", "isComplete");

-- AddForeignKey (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'onboarding_progress_workspaceId_fkey' AND table_name = 'onboarding_progress') THEN
    ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

