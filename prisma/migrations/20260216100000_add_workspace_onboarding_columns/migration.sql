-- AlterTable
-- Add workspace onboarding columns that exist in Prisma schema but were never migrated.
-- Fixes: "The column workspaces.timezone does not exist" on staging/production.
ALTER TABLE "workspaces" ADD COLUMN     IF NOT EXISTS "mission" TEXT,
ADD COLUMN     IF NOT EXISTS "industry" TEXT,
ADD COLUMN     IF NOT EXISTS "companySize" TEXT,
ADD COLUMN     IF NOT EXISTS "timezone" TEXT,
ADD COLUMN     IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
