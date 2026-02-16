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
CREATE UNIQUE INDEX "onboarding_progress_workspaceId_key" ON "onboarding_progress"("workspaceId");

-- CreateIndex
CREATE INDEX "onboarding_progress_workspaceId_isComplete_idx" ON "onboarding_progress"("workspaceId", "isComplete");

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

