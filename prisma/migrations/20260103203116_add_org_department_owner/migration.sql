/*
  Warnings:

  - You are about to drop the column `department` on the `org_positions` table. All the data in the column will be lost.
  - The `status` column on the `person_availability_health` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `slackChannels` on the `projects` table. All the data in the column will be lost.
  - Changed the type of `entityType` on the `owner_assignments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `person_availability` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OrgAuditEventType" AS ENUM ('ORG_CREATED', 'ORG_DELETED', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'MEMBER_ROLE_CHANGED', 'ORG_OWNERSHIP_TRANSFERRED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrgHealthSignalType" AS ENUM ('CAPACITY', 'OWNERSHIP', 'STRUCTURE', 'MANAGEMENT_LOAD', 'DATA_QUALITY');

-- CreateEnum
CREATE TYPE "OrgHealthSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('UNAVAILABLE', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ResponsibilityScope" AS ENUM ('OWNERSHIP', 'DECISION', 'EXECUTION');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'LIMITED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "OwnedEntityType" AS ENUM ('TEAM', 'DEPARTMENT', 'DOMAIN', 'PROJECT', 'SYSTEM');

-- AlterEnum
ALTER TYPE "WorkspaceRole" ADD VALUE 'VIEWER';

-- AlterTable
ALTER TABLE "chat_sessions" ALTER COLUMN "model" DROP NOT NULL;

-- AlterTable
ALTER TABLE "org_departments" ADD COLUMN     "ownerPersonId" TEXT;

-- AlterTable
ALTER TABLE "org_positions" DROP COLUMN "department",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT,
ADD COLUMN     "archivedReason" TEXT,
ADD COLUMN     "budget" TEXT,
ADD COLUMN     "keyMetrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mergedIntoId" TEXT,
ADD COLUMN     "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reportingStructure" TEXT,
ADD COLUMN     "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teamSize" INTEGER,
ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "owner_assignments" DROP COLUMN "entityType",
ADD COLUMN     "entityType" "OwnedEntityType" NOT NULL;

-- AlterTable
ALTER TABLE "person_availability" DROP COLUMN "type",
ADD COLUMN     "type" "AvailabilityType" NOT NULL;

-- AlterTable
ALTER TABLE "person_availability_health" DROP COLUMN "status",
ADD COLUMN     "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "slackChannels",
ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "task_comments" ADD COLUMN     "mentions" TEXT[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "currentGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "personalWebsite" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "workspace_members" ADD COLUMN     "customRoleId" TEXT,
ADD COLUMN     "preferences" JSONB;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "orgCenterOnboardingCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "org_custom_roles" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capabilities" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_person_profile_overrides" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "availability" TEXT,
    "departmentId" TEXT,
    "teamIds" TEXT[],
    "skills" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_person_profile_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_cards" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "jobFamily" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "roleDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "keyMetrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "positionId" TEXT,
    "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "role_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_audit_log" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "event" "OrgAuditEventType",

    CONSTRAINT "org_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_saved_views" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_activity_exports" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_activity_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_accountability" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownerPersonId" TEXT,
    "ownerRole" TEXT,
    "decisionPersonId" TEXT,
    "decisionRole" TEXT,
    "escalationPersonId" TEXT,
    "escalationRole" TEXT,
    "backupOwnerPersonId" TEXT,
    "backupOwnerRole" TEXT,
    "backupDecisionPersonId" TEXT,
    "backupDecisionRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_accountability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_items" (
    "id" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_embeddings" (
    "id" TEXT NOT NULL,
    "contextItemId" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "workspaceId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_summaries" (
    "id" TEXT NOT NULL,
    "contextItemId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_qna_log" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "location" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_qna_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_loopbrain_query_logs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "question" TEXT NOT NULL,
    "answerPreview" TEXT NOT NULL,
    "contextItemsCount" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_loopbrain_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_loopbrain_queries" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "question" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "contextType" TEXT NOT NULL,
    "hasOrgRoot" BOOLEAN NOT NULL,
    "peopleCount" INTEGER NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "departmentCount" INTEGER NOT NULL,
    "roleCount" INTEGER NOT NULL,
    "referencedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_loopbrain_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_invitations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "orgId" TEXT,
    "email" TEXT NOT NULL,
    "role" "OrgRole" DEFAULT 'VIEWER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "token" TEXT NOT NULL,
    "inviteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "org_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orgs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_views" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "defaultForRole" "OrgRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_person_issues" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_person_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_duplicate_candidates" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "personAId" TEXT NOT NULL,
    "personBId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "features" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_duplicate_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_person_merge_logs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "canonicalId" TEXT NOT NULL,
    "mergedId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reportRewireSnapshot" JSONB,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undoneAt" TIMESTAMP(3),
    "actorUserId" TEXT,
    "actorLabel" TEXT NOT NULL,

    CONSTRAINT "org_person_merge_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_suggestion_runs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "engineId" TEXT,
    "modelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_suggestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_loop_brain_configs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_loop_brain_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loop_brain_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loop_brain_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loop_brain_feedback" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "personId" TEXT,
    "suggestionRunId" TEXT,
    "modelId" TEXT,
    "scope" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "accepted" BOOLEAN,
    "partiallyApplied" BOOLEAN,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loop_brain_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loop_brain_outcomes" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "suggestionRunId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "beforeMetrics" JSONB NOT NULL,
    "afterMetrics" JSONB NOT NULL,
    "improved" BOOLEAN NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loop_brain_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_loop_brain_rollouts" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "teamName" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_loop_brain_rollouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_intelligence_snapshots" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "findingCount" INTEGER NOT NULL,
    "findingsJson" JSONB NOT NULL,
    "rollupsJson" JSONB,

    CONSTRAINT "org_intelligence_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_intelligence_settings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mgmtMediumDirectReports" INTEGER NOT NULL DEFAULT 5,
    "mgmtHighDirectReports" INTEGER NOT NULL DEFAULT 9,
    "availabilityStaleDays" INTEGER NOT NULL DEFAULT 14,
    "snapshotFreshMinutes" INTEGER NOT NULL DEFAULT 1440,
    "snapshotWarnMinutes" INTEGER NOT NULL DEFAULT 2880,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "org_intelligence_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_ui_preferences" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_ui_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_health_snapshots" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capacityScore" DOUBLE PRECISION,
    "ownershipScore" DOUBLE PRECISION,
    "balanceScore" DOUBLE PRECISION,
    "managementScore" DOUBLE PRECISION,
    "dataQualityScore" DOUBLE PRECISION,
    "phaseCVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_health_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_health_signals" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "signalKey" TEXT NOT NULL,
    "type" "OrgHealthSignalType" NOT NULL,
    "severity" "OrgHealthSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contextType" TEXT,
    "contextId" TEXT,
    "contextLabel" TEXT,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "org_health_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_fix_events" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "personId" TEXT,
    "fixType" TEXT NOT NULL,
    "beforeState" JSONB NOT NULL,
    "afterState" JSONB NOT NULL,
    "impactScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_fix_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_org_views" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "persona" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_org_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_default_views" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "viewKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_default_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_health_digests" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "recipients" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_health_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log_entries" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_memberships" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_allocations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "fraction" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_responsibilities" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scope" "ResponsibilityScope" NOT NULL,
    "target" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_capacity" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "fte" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "shrinkagePct" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_capacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_allocations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "teamId" TEXT,
    "projectId" TEXT,
    "percent" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capacity_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_role_assignments" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_entities" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_profiles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "isManager" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_role_taxonomy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_role_taxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_skill_taxonomy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_skill_taxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_custom_roles_workspaceId_key_key" ON "org_custom_roles"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "org_person_profile_overrides_workspaceId_idx" ON "org_person_profile_overrides"("workspaceId");

-- CreateIndex
CREATE INDEX "org_person_profile_overrides_userId_idx" ON "org_person_profile_overrides"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "org_person_profile_overrides_workspaceId_userId_key" ON "org_person_profile_overrides"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "role_cards_positionId_key" ON "role_cards"("positionId");

-- CreateIndex
CREATE INDEX "role_cards_workspaceId_idx" ON "role_cards"("workspaceId");

-- CreateIndex
CREATE INDEX "role_cards_positionId_idx" ON "role_cards"("positionId");

-- CreateIndex
CREATE INDEX "role_cards_jobFamily_idx" ON "role_cards"("jobFamily");

-- CreateIndex
CREATE INDEX "role_cards_level_idx" ON "role_cards"("level");

-- CreateIndex
CREATE INDEX "idx_org_audit_log_workspace_created" ON "org_audit_log"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_org_audit_log_workspace_event" ON "org_audit_log"("workspaceId", "event");

-- CreateIndex
CREATE INDEX "idx_org_audit_log_workspace_actor" ON "org_audit_log"("workspaceId", "actorUserId");

-- CreateIndex
CREATE INDEX "org_saved_views_workspaceId_scope_idx" ON "org_saved_views"("workspaceId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "org_saved_views_workspaceId_scope_key_key" ON "org_saved_views"("workspaceId", "scope", "key");

-- CreateIndex
CREATE INDEX "org_activity_exports_workspaceId_userId_createdAt_idx" ON "org_activity_exports"("workspaceId", "userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_accountability_projectId_key" ON "project_accountability"("projectId");

-- CreateIndex
CREATE INDEX "project_accountability_projectId_idx" ON "project_accountability"("projectId");

-- CreateIndex
CREATE INDEX "idx_context_items_workspace_type" ON "context_items"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "idx_context_items_context_type" ON "context_items"("contextId", "type");

-- CreateIndex
CREATE INDEX "idx_context_items_workspace_updated" ON "context_items"("workspaceId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "context_embeddings_contextItemId_key" ON "context_embeddings"("contextItemId");

-- CreateIndex
CREATE INDEX "idx_context_embeddings_workspace" ON "context_embeddings"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "context_summaries_contextItemId_key" ON "context_summaries"("contextItemId");

-- CreateIndex
CREATE INDEX "idx_context_summaries_workspace" ON "context_summaries"("workspaceId");

-- CreateIndex
CREATE INDEX "idx_org_qna_log_workspace_created" ON "org_qna_log"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_org_qna_log_workspace_location" ON "org_qna_log"("workspaceId", "location");

-- CreateIndex
CREATE INDEX "idx_org_lb_query_workspace_created" ON "org_loopbrain_query_logs"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_org_lb_query_user_created" ON "org_loopbrain_query_logs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_org_lb_query_telemetry_workspace_created" ON "org_loopbrain_queries"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_org_lb_query_telemetry_workspace_qtype" ON "org_loopbrain_queries"("workspaceId", "questionType");

-- CreateIndex
CREATE UNIQUE INDEX "org_invitations_token_key" ON "org_invitations"("token");

-- CreateIndex
CREATE INDEX "org_invitations_workspaceId_idx" ON "org_invitations"("workspaceId");

-- CreateIndex
CREATE INDEX "idx_org_invitations_workspace_status" ON "org_invitations"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "org_invitations_orgId_status_idx" ON "org_invitations"("orgId", "status");

-- CreateIndex
CREATE INDEX "org_invitations_email_idx" ON "org_invitations"("email");

-- CreateIndex
CREATE INDEX "org_invitations_token_idx" ON "org_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "org_invitations_workspaceId_email_key" ON "org_invitations"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "orgs_name_idx" ON "orgs"("name");

-- CreateIndex
CREATE INDEX "saved_views_orgId_scope_idx" ON "saved_views"("orgId", "scope");

-- CreateIndex
CREATE INDEX "saved_views_orgId_userId_idx" ON "saved_views"("orgId", "userId");

-- CreateIndex
CREATE INDEX "saved_views_orgId_pinned_idx" ON "saved_views"("orgId", "pinned");

-- CreateIndex
CREATE INDEX "org_person_issues_orgId_type_resolvedAt_idx" ON "org_person_issues"("orgId", "type", "resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "org_person_issues_orgId_personId_type_key" ON "org_person_issues"("orgId", "personId", "type");

-- CreateIndex
CREATE INDEX "org_duplicate_candidates_orgId_status_confidence_idx" ON "org_duplicate_candidates"("orgId", "status", "confidence");

-- CreateIndex
CREATE UNIQUE INDEX "org_duplicate_candidates_orgId_personAId_personBId_key" ON "org_duplicate_candidates"("orgId", "personAId", "personBId");

-- CreateIndex
CREATE INDEX "org_person_merge_logs_orgId_appliedAt_idx" ON "org_person_merge_logs"("orgId", "appliedAt");

-- CreateIndex
CREATE UNIQUE INDEX "org_person_merge_logs_orgId_canonicalId_mergedId_undoneAt_key" ON "org_person_merge_logs"("orgId", "canonicalId", "mergedId", "undoneAt");

-- CreateIndex
CREATE INDEX "org_suggestion_runs_orgId_scope_createdAt_idx" ON "org_suggestion_runs"("orgId", "scope", "createdAt");

-- CreateIndex
CREATE INDEX "org_suggestion_runs_orgId_engineId_createdAt_idx" ON "org_suggestion_runs"("orgId", "engineId", "createdAt");

-- CreateIndex
CREATE INDEX "org_loop_brain_configs_orgId_scope_enabled_idx" ON "org_loop_brain_configs"("orgId", "scope", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "org_loop_brain_configs_orgId_scope_key" ON "org_loop_brain_configs"("orgId", "scope");

-- CreateIndex
CREATE INDEX "loop_brain_models_scope_active_idx" ON "loop_brain_models"("scope", "active");

-- CreateIndex
CREATE INDEX "loop_brain_feedback_orgId_scope_createdAt_idx" ON "loop_brain_feedback"("orgId", "scope", "createdAt");

-- CreateIndex
CREATE INDEX "loop_brain_outcomes_orgId_scope_measuredAt_idx" ON "loop_brain_outcomes"("orgId", "scope", "measuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "org_loop_brain_rollouts_orgId_scope_key" ON "org_loop_brain_rollouts"("orgId", "scope");

-- CreateIndex
CREATE INDEX "org_intelligence_snapshots_workspaceId_createdAt_idx" ON "org_intelligence_snapshots"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "org_intelligence_settings_workspaceId_key" ON "org_intelligence_settings"("workspaceId");

-- CreateIndex
CREATE INDEX "org_ui_preferences_workspaceId_idx" ON "org_ui_preferences"("workspaceId");

-- CreateIndex
CREATE INDEX "org_ui_preferences_userId_idx" ON "org_ui_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "org_ui_preferences_workspaceId_userId_key_key" ON "org_ui_preferences"("workspaceId", "userId", "key");

-- CreateIndex
CREATE INDEX "org_health_snapshots_orgId_capturedAt_idx" ON "org_health_snapshots"("orgId", "capturedAt");

-- CreateIndex
CREATE INDEX "org_health_signals_orgId_type_idx" ON "org_health_signals"("orgId", "type");

-- CreateIndex
CREATE INDEX "org_health_signals_orgId_signalKey_idx" ON "org_health_signals"("orgId", "signalKey");

-- CreateIndex
CREATE INDEX "org_fix_events_orgId_createdAt_idx" ON "org_fix_events"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "saved_org_views_orgId_persona_idx" ON "saved_org_views"("orgId", "persona");

-- CreateIndex
CREATE UNIQUE INDEX "saved_org_views_orgId_key_key" ON "saved_org_views"("orgId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "org_default_views_orgId_role_key" ON "org_default_views"("orgId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "org_health_digests_orgId_key" ON "org_health_digests"("orgId");

-- CreateIndex
CREATE INDEX "audit_log_entries_orgId_createdAt_idx" ON "audit_log_entries"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "org_memberships_orgId_role_idx" ON "org_memberships"("orgId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "org_memberships_orgId_userId_key" ON "org_memberships"("orgId", "userId");

-- CreateIndex
CREATE INDEX "project_allocations_orgId_projectId_idx" ON "project_allocations"("orgId", "projectId");

-- CreateIndex
CREATE INDEX "project_allocations_personId_startDate_idx" ON "project_allocations"("personId", "startDate");

-- CreateIndex
CREATE INDEX "roles_orgId_idx" ON "roles"("orgId");

-- CreateIndex
CREATE INDEX "role_responsibilities_roleId_idx" ON "role_responsibilities"("roleId");

-- CreateIndex
CREATE INDEX "person_capacity_orgId_personId_idx" ON "person_capacity"("orgId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "person_capacity_orgId_personId_key" ON "person_capacity"("orgId", "personId");

-- CreateIndex
CREATE INDEX "capacity_allocations_orgId_personId_idx" ON "capacity_allocations"("orgId", "personId");

-- CreateIndex
CREATE INDEX "capacity_allocations_orgId_teamId_idx" ON "capacity_allocations"("orgId", "teamId");

-- CreateIndex
CREATE INDEX "capacity_allocations_orgId_projectId_idx" ON "capacity_allocations"("orgId", "projectId");

-- CreateIndex
CREATE INDEX "person_role_assignments_orgId_personId_idx" ON "person_role_assignments"("orgId", "personId");

-- CreateIndex
CREATE INDEX "person_role_assignments_orgId_role_idx" ON "person_role_assignments"("orgId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "person_role_assignments_orgId_personId_role_key" ON "person_role_assignments"("orgId", "personId", "role");

-- CreateIndex
CREATE INDEX "domains_orgId_name_idx" ON "domains"("orgId", "name");

-- CreateIndex
CREATE INDEX "system_entities_orgId_name_idx" ON "system_entities"("orgId", "name");

-- CreateIndex
CREATE INDEX "manager_profiles_orgId_personId_idx" ON "manager_profiles"("orgId", "personId");

-- CreateIndex
CREATE INDEX "org_role_taxonomy_orgId_idx" ON "org_role_taxonomy"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "org_role_taxonomy_orgId_label_key" ON "org_role_taxonomy"("orgId", "label");

-- CreateIndex
CREATE INDEX "org_skill_taxonomy_orgId_idx" ON "org_skill_taxonomy"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "org_skill_taxonomy_orgId_label_key" ON "org_skill_taxonomy"("orgId", "label");

-- CreateIndex
CREATE INDEX "idx_chat_sessions_workspace_user_draft" ON "chat_sessions"("workspaceId", "userId", "phase");

-- CreateIndex
CREATE INDEX "idx_chat_sessions_updated_at" ON "chat_sessions"("updatedAt" DESC);

-- CreateIndex
CREATE INDEX "org_departments_ownerPersonId_idx" ON "org_departments"("ownerPersonId");

-- CreateIndex
CREATE INDEX "org_positions_workspaceId_idx" ON "org_positions"("workspaceId");

-- CreateIndex
-- Drop existing partial index if it exists (from earlier migration)
DROP INDEX IF EXISTS "idx_org_positions_workspace_active";
-- Create full index as defined in schema
CREATE INDEX "idx_org_positions_workspace_active" ON "org_positions"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "idx_org_positions_workspace_user" ON "org_positions"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "org_positions_workspaceId_archivedAt_idx" ON "org_positions"("workspaceId", "archivedAt");

-- CreateIndex
CREATE INDEX "org_positions_workspaceId_mergedIntoId_idx" ON "org_positions"("workspaceId", "mergedIntoId");

-- CreateIndex
CREATE INDEX "org_positions_level_idx" ON "org_positions"("level");

-- CreateIndex
CREATE INDEX "owner_assignments_workspaceId_entityType_idx" ON "owner_assignments"("workspaceId", "entityType");

-- CreateIndex
CREATE INDEX "owner_assignments_workspaceId_entityType_entityId_idx" ON "owner_assignments"("workspaceId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "owner_assignments_workspaceId_entityType_entityId_key" ON "owner_assignments"("workspaceId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "person_availability_health_workspaceId_status_idx" ON "person_availability_health"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "idx_projects_updated_at" ON "projects"("updatedAt" DESC);

-- CreateIndex
CREATE INDEX "projects_orgId_idx" ON "projects"("orgId");

-- CreateIndex
CREATE INDEX "idx_tasks_workspace_status" ON "tasks"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "idx_wiki_favorites_user_workspace" ON "wiki_favorites"("user_id", "page_id");

-- CreateIndex
CREATE INDEX "idx_wiki_pages_workspace_published" ON "wiki_pages"("workspaceId", "isPublished");

-- CreateIndex
CREATE INDEX "idx_wiki_pages_workspace_type_alt" ON "wiki_pages"("workspaceId", "workspace_type");

-- CreateIndex
CREATE INDEX "idx_wiki_pages_updated_at" ON "wiki_pages"("updatedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_workspace_members_user_workspace" ON "workspace_members"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_customRoleId_idx" ON "workspace_members"("workspaceId", "customRoleId");

-- CreateIndex
CREATE INDEX "idx_workspace_members_workspace_role" ON "workspace_members"("workspaceId", "role");

-- CreateIndex
CREATE INDEX "idx_workspace_members_workspace_joined" ON "workspace_members"("workspaceId", "joinedAt" DESC);

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "org_custom_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_custom_roles" ADD CONSTRAINT "org_custom_roles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_cards" ADD CONSTRAINT "role_cards_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_cards" ADD CONSTRAINT "role_cards_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "org_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_cards" ADD CONSTRAINT "role_cards_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_audit_log" ADD CONSTRAINT "org_audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_audit_log" ADD CONSTRAINT "org_audit_log_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_audit_log" ADD CONSTRAINT "org_audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_audit_log" ADD CONSTRAINT "org_audit_log_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_saved_views" ADD CONSTRAINT "org_saved_views_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_activity_exports" ADD CONSTRAINT "org_activity_exports_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_activity_exports" ADD CONSTRAINT "org_activity_exports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_accountability" ADD CONSTRAINT "project_accountability_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_embeddings" ADD CONSTRAINT "context_embeddings_contextItemId_fkey" FOREIGN KEY ("contextItemId") REFERENCES "context_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_summaries" ADD CONSTRAINT "context_summaries_contextItemId_fkey" FOREIGN KEY ("contextItemId") REFERENCES "context_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_qna_log" ADD CONSTRAINT "org_qna_log_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_loopbrain_query_logs" ADD CONSTRAINT "org_loopbrain_query_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_loopbrain_query_logs" ADD CONSTRAINT "org_loopbrain_query_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_loopbrain_queries" ADD CONSTRAINT "org_loopbrain_queries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_loopbrain_queries" ADD CONSTRAINT "org_loopbrain_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_invitations" ADD CONSTRAINT "org_invitations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_invitations" ADD CONSTRAINT "org_invitations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_invitations" ADD CONSTRAINT "org_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_intelligence_snapshots" ADD CONSTRAINT "org_intelligence_snapshots_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_intelligence_settings" ADD CONSTRAINT "org_intelligence_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_ui_preferences" ADD CONSTRAINT "org_ui_preferences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_allocations" ADD CONSTRAINT "project_allocations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_allocations" ADD CONSTRAINT "project_allocations_personId_fkey" FOREIGN KEY ("personId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_responsibilities" ADD CONSTRAINT "role_responsibilities_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
