-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "IssueResolution" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'FALSE_POSITIVE', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AvailabilityReason" AS ENUM ('VACATION', 'SICK_LEAVE', 'PARENTAL_LEAVE', 'SABBATICAL', 'JURY_DUTY', 'BEREAVEMENT', 'TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillSource" AS ENUM ('SELF_REPORTED', 'MANAGER_ADDED', 'VERIFIED', 'INFERRED');

-- CreateEnum
CREATE TYPE "RoleCardSkillType" AS ENUM ('REQUIRED', 'PREFERRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrgHealthSignalType" ADD VALUE 'MANAGEMENT_OVERLOAD';
ALTER TYPE "OrgHealthSignalType" ADD VALUE 'MANAGEMENT_UNDERLOAD';
ALTER TYPE "OrgHealthSignalType" ADD VALUE 'SINGLE_POINT_FAILURE';
ALTER TYPE "OrgHealthSignalType" ADD VALUE 'OWNERSHIP_GAP';
ALTER TYPE "OrgHealthSignalType" ADD VALUE 'COVERAGE_GAP';
ALTER TYPE "OrgHealthSignalType" ADD VALUE 'AVAILABILITY_CRUNCH';
ALTER TYPE "OrgHealthSignalType" ADD VALUE 'SKILL_GAP';
ALTER TYPE "OrgHealthSignalType" ADD VALUE 'STALE_DATA';
ALTER TYPE "OrgHealthSignalType" ADD VALUE 'ORPHAN_POSITION';
ALTER TYPE "OrgHealthSignalType" ADD VALUE 'CYCLE_DETECTED';

-- AlterTable
ALTER TABLE "org_health_signals" ADD COLUMN     "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "signalMetadata" JSONB;

-- AlterTable
ALTER TABLE "org_person_issues" ADD COLUMN     "resolution" "IssueResolution" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "resolvedById" TEXT;

-- AlterTable
ALTER TABLE "org_positions" ADD COLUMN     "managerIntentionallyUnassigned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teamIntentionallyUnassigned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "person_availability" ADD COLUMN     "expectedReturnDate" TIMESTAMP(3),
ADD COLUMN     "reason" "AvailabilityReason";

-- AlterTable
ALTER TABLE "person_availability_health" ADD COLUMN     "expectedReturnDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "person_manager_links" ADD COLUMN     "intentionallyUnassigned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "workspace_members" ADD COLUMN     "employmentEndDate" TIMESTAMP(3),
ADD COLUMN     "employmentStartDate" TIMESTAMP(3),
ADD COLUMN     "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_skills" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" INTEGER NOT NULL DEFAULT 3,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "source" "SkillSource" NOT NULL DEFAULT 'SELF_REPORTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_card_skills" (
    "id" TEXT NOT NULL,
    "roleCardId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "type" "RoleCardSkillType" NOT NULL,
    "minProficiency" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_card_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skills_workspaceId_idx" ON "skills"("workspaceId");

-- CreateIndex
CREATE INDEX "skills_workspaceId_category_idx" ON "skills"("workspaceId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "skills_workspaceId_name_key" ON "skills"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "person_skills_workspaceId_personId_idx" ON "person_skills"("workspaceId", "personId");

-- CreateIndex
CREATE INDEX "person_skills_workspaceId_skillId_idx" ON "person_skills"("workspaceId", "skillId");

-- CreateIndex
CREATE INDEX "person_skills_skillId_proficiency_idx" ON "person_skills"("skillId", "proficiency");

-- CreateIndex
CREATE UNIQUE INDEX "person_skills_workspaceId_personId_skillId_key" ON "person_skills"("workspaceId", "personId", "skillId");

-- CreateIndex
CREATE INDEX "role_card_skills_roleCardId_idx" ON "role_card_skills"("roleCardId");

-- CreateIndex
CREATE INDEX "role_card_skills_skillId_idx" ON "role_card_skills"("skillId");

-- CreateIndex
CREATE INDEX "role_card_skills_type_idx" ON "role_card_skills"("type");

-- CreateIndex
CREATE UNIQUE INDEX "role_card_skills_roleCardId_skillId_type_key" ON "role_card_skills"("roleCardId", "skillId", "type");

-- CreateIndex
CREATE INDEX "org_health_signals_orgId_severity_idx" ON "org_health_signals"("orgId", "severity");

-- CreateIndex
CREATE INDEX "org_health_signals_orgId_firstSeenAt_idx" ON "org_health_signals"("orgId", "firstSeenAt");

-- CreateIndex
CREATE INDEX "org_person_issues_orgId_resolution_idx" ON "org_person_issues"("orgId", "resolution");

-- CreateIndex
CREATE INDEX "person_availability_workspaceId_reason_idx" ON "person_availability"("workspaceId", "reason");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_employmentStatus_idx" ON "workspace_members"("workspaceId", "employmentStatus");

-- AddForeignKey
ALTER TABLE "person_skills" ADD CONSTRAINT "person_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_card_skills" ADD CONSTRAINT "role_card_skills_roleCardId_fkey" FOREIGN KEY ("roleCardId") REFERENCES "role_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_card_skills" ADD CONSTRAINT "role_card_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
