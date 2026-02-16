-- AlterTable: Add missing workspace onboarding fields
-- These fields are defined in the Prisma schema but missing from the database

ALTER TABLE "workspaces" 
ADD COLUMN IF NOT EXISTS "mission" TEXT,
ADD COLUMN IF NOT EXISTS "industry" TEXT,
ADD COLUMN IF NOT EXISTS "companySize" TEXT,
ADD COLUMN IF NOT EXISTS "timezone" TEXT,
ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
