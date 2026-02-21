-- CreateEnum
CREATE TYPE "OpenLoopType" AS ENUM ('BLOCKED', 'WAITING', 'OVERDUE', 'NEEDS_RESPONSE');

-- CreateEnum
CREATE TYPE "OpenLoopStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AvailabilitySource" AS ENUM ('MANUAL', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "DecisionDomainScope" AS ENUM ('TEAM', 'DEPARTMENT', 'FUNCTION', 'WORKSPACE');

-- CreateEnum
CREATE TYPE "ImpactSubjectType" AS ENUM ('TEAM', 'DEPARTMENT', 'PERSON', 'ROLE', 'DECISION_DOMAIN', 'WORK_REQUEST');

-- CreateEnum
CREATE TYPE "ImpactType" AS ENUM ('BLOCKED', 'DEPENDENT', 'INFORM', 'CONSULT');

-- CreateEnum
CREATE TYPE "ImpactSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "WorkRecommendationAction" AS ENUM ('PROCEED', 'DELAY', 'REASSIGN', 'REQUEST_SUPPORT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL', 'FINALIZED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('SETUP', 'ACTIVE', 'CLOSED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "CycleReviewType" AS ENUM ('SELF_ONLY', 'MANAGER_ONLY', 'COMBINED');

-- CreateEnum
CREATE TYPE "ReviewerRole" AS ENUM ('SELF', 'MANAGER');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('RATING_ONLY', 'TEXT_ONLY', 'RATING_AND_TEXT');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- AlterEnum
ALTER TYPE "AvailabilityType" ADD VALUE 'AVAILABLE';

-- DropForeignKey
ALTER TABLE "project_person_links" DROP CONSTRAINT "project_person_links_userId_fkey";

-- DropForeignKey
ALTER TABLE "workspace_invites" DROP CONSTRAINT "workspace_invites_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "workspace_invites" DROP CONSTRAINT "workspace_invites_positionId_fkey";

-- DropForeignKey
ALTER TABLE "workspace_invites" DROP CONSTRAINT "workspace_invites_workspaceId_fkey";

-- DropIndex
DROP INDEX "idx_users_email";

-- DropIndex
DROP INDEX "idx_workspace_members_workspace_user_role";

-- DropIndex
DROP INDEX "idx_workspaces_slug";

-- AlterTable
ALTER TABLE "_GoalConflicts" ADD CONSTRAINT "_GoalConflicts_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_GoalConflicts_AB_unique";

-- AlterTable
ALTER TABLE "capacity_contracts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "org_positions" ADD COLUMN     "employmentType" TEXT DEFAULT 'full-time',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "person_availability" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "source" "AvailabilitySource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "project_assignees" ADD COLUMN     "orgPositionId" TEXT;

-- AlterTable
ALTER TABLE "project_members" ADD COLUMN     "orgPositionId" TEXT;

-- AlterTable
ALTER TABLE "project_person_links" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "isActive",
DROP COLUMN "lastLoginAt";

-- AlterTable
ALTER TABLE "work_allocations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "workspace_invites";

-- DropEnum
DROP TYPE "ViewerScopeType";

-- CreateTable
CREATE TABLE "loopbrain_pending_actions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_RESPONSE',
    "contextType" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "contextData" JSONB,
    "slackChannelId" TEXT,
    "slackMessageTs" TEXT,
    "slackUserId" TEXT,
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loopbrain_pending_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_issue_resolutions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "issueKey" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "resolvedBy" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolutionNote" TEXT,

    CONSTRAINT "org_issue_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_capacity_settings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lowCapacityHoursThreshold" INTEGER NOT NULL DEFAULT 8,
    "overallocationThreshold" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "minCapacityForCoverage" INTEGER NOT NULL DEFAULT 8,
    "issueWindowDays" INTEGER NOT NULL DEFAULT 7,
    "severeOverloadThresholdPct" DOUBLE PRECISION NOT NULL DEFAULT 1.4,
    "underutilizedThresholdPct" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "defaultWeeklyHoursTarget" INTEGER NOT NULL DEFAULT 40,

    CONSTRAINT "org_capacity_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_capacity_plans" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "weeklyDemandHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_capacity_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loopbrain_user_profiles" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'balanced',
    "verbosity" INTEGER NOT NULL DEFAULT 3,
    "formatting" JSONB NOT NULL DEFAULT '{}',
    "focusProjectIds" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loopbrain_user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loopbrain_chat_feedback" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'chat',
    "rating" TEXT NOT NULL,
    "signal" TEXT,
    "messageId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loopbrain_chat_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loopbrain_open_loops" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "OpenLoopType" NOT NULL,
    "status" "OpenLoopStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loopbrain_open_loops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_coverage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "roleLabel" TEXT,
    "primaryPersonId" TEXT NOT NULL,
    "secondaryPersonIds" TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_effort_defaults" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "xsHours" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "sHours" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "mHours" DOUBLE PRECISION NOT NULL DEFAULT 16,
    "lHours" DOUBLE PRECISION NOT NULL DEFAULT 32,
    "xlHours" DOUBLE PRECISION NOT NULL DEFAULT 64,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_effort_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_domains" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "DecisionDomainScope" NOT NULL DEFAULT 'WORKSPACE',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_authorities" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "primaryPersonId" TEXT,
    "primaryRoleType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_escalation_steps" (
    "id" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "personId" TEXT,
    "roleType" TEXT,

    CONSTRAINT "decision_escalation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_impacts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workRequestId" TEXT NOT NULL,
    "impactKey" TEXT NOT NULL,
    "subjectType" "ImpactSubjectType" NOT NULL,
    "subjectId" TEXT,
    "roleType" TEXT,
    "domainKey" TEXT,
    "impactType" "ImpactType" NOT NULL,
    "severity" "ImpactSeverity" NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_impacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsibility_tags" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsibility_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_responsibility_profiles" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "minSeniority" "SeniorityLevel",
    "maxSeniority" "SeniorityLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_responsibility_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_responsibility_overrides" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_responsibility_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_recommendation_logs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workRequestId" TEXT NOT NULL,
    "recommendationAction" "WorkRecommendationAction" NOT NULL,
    "recommendationReason" TEXT,
    "snapshotJson" JSONB,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_recommendation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proactive_insights" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "recommendations" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "affectedEntities" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "dismissedBy" TEXT,
    "dismissalReason" TEXT,
    "dismissalNote" TEXT,
    "supersedesId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proactive_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_relationships" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "personAId" TEXT NOT NULL,
    "personBId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "meetingsShared" INTEGER NOT NULL DEFAULT 0,
    "projectsShared" INTEGER NOT NULL DEFAULT 0,
    "tasksShared" INTEGER NOT NULL DEFAULT 0,
    "wikisShared" INTEGER NOT NULL DEFAULT 0,
    "lastInteraction" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_activity_metrics" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "weekStarting" TIMESTAMP(3) NOT NULL,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksCreated" INTEGER NOT NULL DEFAULT 0,
    "avgCompletionDays" DOUBLE PRECISION,
    "tasksOverdue" INTEGER NOT NULL DEFAULT 0,
    "meetingsAttended" INTEGER NOT NULL DEFAULT 0,
    "meetingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commentsPosted" INTEGER NOT NULL DEFAULT 0,
    "wikisEdited" INTEGER NOT NULL DEFAULT 0,
    "wikisCreated" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeHrs" DOUBLE PRECISION,
    "tasksReopened" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_activity_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" DOUBLE PRECISION NOT NULL,
    "leaveType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "cycleId" TEXT,
    "reviewerRole" "ReviewerRole" NOT NULL DEFAULT 'MANAGER',
    "goalIds" TEXT[],
    "goalScores" JSONB,
    "overallScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "strengths" TEXT,
    "improvements" TEXT,
    "nextGoals" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_cycles" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CycleStatus" NOT NULL DEFAULT 'SETUP',
    "reviewType" "CycleReviewType" NOT NULL DEFAULT 'COMBINED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_questions" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "description" TEXT,
    "type" "QuestionType" NOT NULL DEFAULT 'RATING_AND_TEXT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_responses" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "rating" INTEGER,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_on_one_templates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_on_one_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_on_one_series" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_on_one_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_on_one_meetings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "seriesId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "calendarEventId" TEXT,
    "goalProgress" JSONB,
    "blockers" TEXT,
    "support" TEXT,
    "nextActions" TEXT,
    "managerNotes" TEXT,
    "employeeNotes" TEXT,
    "sharedNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_on_one_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_on_one_talking_points" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "isDiscussed" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "sourceId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_on_one_talking_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_on_one_action_items" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_on_one_action_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PrimaryTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PrimaryTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AllowedTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AllowedTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ForbiddenTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ForbiddenTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_WorkTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_WorkTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "loopbrain_pending_actions_workspaceId_status_idx" ON "loopbrain_pending_actions"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "loopbrain_pending_actions_slackMessageTs_idx" ON "loopbrain_pending_actions"("slackMessageTs");

-- CreateIndex
CREATE INDEX "loopbrain_pending_actions_assignedTo_status_idx" ON "loopbrain_pending_actions"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "org_issue_resolutions_workspaceId_issueKey_idx" ON "org_issue_resolutions"("workspaceId", "issueKey");

-- CreateIndex
CREATE INDEX "org_issue_resolutions_workspaceId_issueType_idx" ON "org_issue_resolutions"("workspaceId", "issueType");

-- CreateIndex
CREATE INDEX "org_issue_resolutions_workspaceId_entityType_entityId_idx" ON "org_issue_resolutions"("workspaceId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "org_issue_resolutions_workspaceId_issueKey_key" ON "org_issue_resolutions"("workspaceId", "issueKey");

-- CreateIndex
CREATE UNIQUE INDEX "org_capacity_settings_workspaceId_key" ON "org_capacity_settings"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "team_capacity_plans_teamId_key" ON "team_capacity_plans"("teamId");

-- CreateIndex
CREATE INDEX "team_capacity_plans_workspaceId_idx" ON "team_capacity_plans"("workspaceId");

-- CreateIndex
CREATE INDEX "loopbrain_user_profiles_workspaceId_idx" ON "loopbrain_user_profiles"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "loopbrain_user_profiles_workspaceId_userId_key" ON "loopbrain_user_profiles"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "loopbrain_chat_feedback_workspaceId_userId_createdAt_idx" ON "loopbrain_chat_feedback"("workspaceId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "loopbrain_chat_feedback_workspaceId_scope_idx" ON "loopbrain_chat_feedback"("workspaceId", "scope");

-- CreateIndex
CREATE INDEX "loopbrain_open_loops_workspaceId_userId_status_idx" ON "loopbrain_open_loops"("workspaceId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "loopbrain_open_loops_workspaceId_userId_entityType_entityId_key" ON "loopbrain_open_loops"("workspaceId", "userId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "role_coverage_workspaceId_roleType_idx" ON "role_coverage"("workspaceId", "roleType");

-- CreateIndex
CREATE INDEX "role_coverage_workspaceId_primaryPersonId_idx" ON "role_coverage"("workspaceId", "primaryPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "role_coverage_workspaceId_roleType_primaryPersonId_key" ON "role_coverage"("workspaceId", "roleType", "primaryPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "work_effort_defaults_workspaceId_key" ON "work_effort_defaults"("workspaceId");

-- CreateIndex
CREATE INDEX "decision_domains_workspaceId_isArchived_idx" ON "decision_domains"("workspaceId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "decision_domains_workspaceId_key_key" ON "decision_domains"("workspaceId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "decision_authorities_domainId_key" ON "decision_authorities"("domainId");

-- CreateIndex
CREATE INDEX "decision_authorities_workspaceId_idx" ON "decision_authorities"("workspaceId");

-- CreateIndex
CREATE INDEX "decision_escalation_steps_authorityId_idx" ON "decision_escalation_steps"("authorityId");

-- CreateIndex
CREATE INDEX "decision_escalation_steps_workspaceId_idx" ON "decision_escalation_steps"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "decision_escalation_steps_authorityId_stepOrder_key" ON "decision_escalation_steps"("authorityId", "stepOrder");

-- CreateIndex
CREATE INDEX "work_impacts_workspaceId_workRequestId_idx" ON "work_impacts"("workspaceId", "workRequestId");

-- CreateIndex
CREATE INDEX "work_impacts_workspaceId_subjectType_subjectId_idx" ON "work_impacts"("workspaceId", "subjectType", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "work_impacts_workspaceId_impactKey_key" ON "work_impacts"("workspaceId", "impactKey");

-- CreateIndex
CREATE INDEX "responsibility_tags_workspaceId_isArchived_idx" ON "responsibility_tags"("workspaceId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "responsibility_tags_workspaceId_key_key" ON "responsibility_tags"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "role_responsibility_profiles_workspaceId_idx" ON "role_responsibility_profiles"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "role_responsibility_profiles_workspaceId_roleType_key" ON "role_responsibility_profiles"("workspaceId", "roleType");

-- CreateIndex
CREATE INDEX "person_responsibility_overrides_workspaceId_personId_idx" ON "person_responsibility_overrides"("workspaceId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "person_responsibility_overrides_workspaceId_personId_tagId_key" ON "person_responsibility_overrides"("workspaceId", "personId", "tagId");

-- CreateIndex
CREATE INDEX "work_recommendation_logs_workspaceId_workRequestId_createdA_idx" ON "work_recommendation_logs"("workspaceId", "workRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "proactive_insights_workspaceId_status_idx" ON "proactive_insights"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "proactive_insights_workspaceId_category_idx" ON "proactive_insights"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "proactive_insights_workspaceId_priority_idx" ON "proactive_insights"("workspaceId", "priority");

-- CreateIndex
CREATE INDEX "proactive_insights_workspaceId_expiresAt_idx" ON "proactive_insights"("workspaceId", "expiresAt");

-- CreateIndex
CREATE INDEX "proactive_insights_workspaceId_createdAt_idx" ON "proactive_insights"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "person_relationships_workspaceId_personAId_idx" ON "person_relationships"("workspaceId", "personAId");

-- CreateIndex
CREATE INDEX "person_relationships_workspaceId_personBId_idx" ON "person_relationships"("workspaceId", "personBId");

-- CreateIndex
CREATE INDEX "person_relationships_workspaceId_relationshipType_idx" ON "person_relationships"("workspaceId", "relationshipType");

-- CreateIndex
CREATE INDEX "person_relationships_workspaceId_strength_idx" ON "person_relationships"("workspaceId", "strength");

-- CreateIndex
CREATE UNIQUE INDEX "person_relationships_workspaceId_personAId_personBId_key" ON "person_relationships"("workspaceId", "personAId", "personBId");

-- CreateIndex
CREATE INDEX "person_activity_metrics_workspaceId_personId_idx" ON "person_activity_metrics"("workspaceId", "personId");

-- CreateIndex
CREATE INDEX "person_activity_metrics_weekStarting_idx" ON "person_activity_metrics"("weekStarting");

-- CreateIndex
CREATE INDEX "person_activity_metrics_workspaceId_personId_weekStarting_idx" ON "person_activity_metrics"("workspaceId", "personId", "weekStarting");

-- CreateIndex
CREATE UNIQUE INDEX "person_activity_metrics_workspaceId_personId_weekStarting_key" ON "person_activity_metrics"("workspaceId", "personId", "weekStarting");

-- CreateIndex
CREATE INDEX "leave_requests_workspaceId_personId_status_idx" ON "leave_requests"("workspaceId", "personId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_workspaceId_status_idx" ON "leave_requests"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_workspaceId_approvedById_idx" ON "leave_requests"("workspaceId", "approvedById");

-- CreateIndex
CREATE INDEX "leave_requests_startDate_endDate_idx" ON "leave_requests"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "leave_requests_workspaceId_personId_startDate_idx" ON "leave_requests"("workspaceId", "personId", "startDate");

-- CreateIndex
CREATE INDEX "performance_reviews_workspaceId_managerId_status_idx" ON "performance_reviews"("workspaceId", "managerId", "status");

-- CreateIndex
CREATE INDEX "performance_reviews_workspaceId_period_idx" ON "performance_reviews"("workspaceId", "period");

-- CreateIndex
CREATE INDEX "performance_reviews_workspaceId_cycleId_idx" ON "performance_reviews"("workspaceId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "performance_reviews_workspaceId_employeeId_period_reviewerR_key" ON "performance_reviews"("workspaceId", "employeeId", "period", "reviewerRole");

-- CreateIndex
CREATE INDEX "performance_cycles_workspaceId_idx" ON "performance_cycles"("workspaceId");

-- CreateIndex
CREATE INDEX "performance_cycles_workspaceId_status_idx" ON "performance_cycles"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "review_questions_cycleId_idx" ON "review_questions"("cycleId");

-- CreateIndex
CREATE INDEX "review_questions_workspaceId_idx" ON "review_questions"("workspaceId");

-- CreateIndex
CREATE INDEX "review_responses_reviewId_idx" ON "review_responses"("reviewId");

-- CreateIndex
CREATE INDEX "review_responses_questionId_idx" ON "review_responses"("questionId");

-- CreateIndex
CREATE INDEX "review_responses_workspaceId_idx" ON "review_responses"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "review_responses_reviewId_questionId_key" ON "review_responses"("reviewId", "questionId");

-- CreateIndex
CREATE INDEX "one_on_one_templates_workspaceId_idx" ON "one_on_one_templates"("workspaceId");

-- CreateIndex
CREATE INDEX "one_on_one_series_workspaceId_idx" ON "one_on_one_series"("workspaceId");

-- CreateIndex
CREATE INDEX "one_on_one_series_managerId_idx" ON "one_on_one_series"("managerId");

-- CreateIndex
CREATE INDEX "one_on_one_series_employeeId_idx" ON "one_on_one_series"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "one_on_one_series_managerId_employeeId_workspaceId_key" ON "one_on_one_series"("managerId", "employeeId", "workspaceId");

-- CreateIndex
CREATE INDEX "one_on_one_meetings_workspaceId_employeeId_idx" ON "one_on_one_meetings"("workspaceId", "employeeId");

-- CreateIndex
CREATE INDEX "one_on_one_meetings_workspaceId_managerId_idx" ON "one_on_one_meetings"("workspaceId", "managerId");

-- CreateIndex
CREATE INDEX "one_on_one_meetings_scheduledAt_idx" ON "one_on_one_meetings"("scheduledAt");

-- CreateIndex
CREATE INDEX "one_on_one_meetings_seriesId_idx" ON "one_on_one_meetings"("seriesId");

-- CreateIndex
CREATE INDEX "one_on_one_talking_points_workspaceId_idx" ON "one_on_one_talking_points"("workspaceId");

-- CreateIndex
CREATE INDEX "one_on_one_talking_points_meetingId_idx" ON "one_on_one_talking_points"("meetingId");

-- CreateIndex
CREATE INDEX "one_on_one_action_items_workspaceId_idx" ON "one_on_one_action_items"("workspaceId");

-- CreateIndex
CREATE INDEX "one_on_one_action_items_meetingId_idx" ON "one_on_one_action_items"("meetingId");

-- CreateIndex
CREATE INDEX "one_on_one_action_items_assigneeId_idx" ON "one_on_one_action_items"("assigneeId");

-- CreateIndex
CREATE INDEX "_PrimaryTags_B_index" ON "_PrimaryTags"("B");

-- CreateIndex
CREATE INDEX "_AllowedTags_B_index" ON "_AllowedTags"("B");

-- CreateIndex
CREATE INDEX "_ForbiddenTags_B_index" ON "_ForbiddenTags"("B");

-- CreateIndex
CREATE INDEX "_WorkTags_B_index" ON "_WorkTags"("B");

-- CreateIndex
CREATE INDEX "org_positions_parentId_idx" ON "org_positions"("parentId");

-- CreateIndex
CREATE INDEX "idx_org_positions_entity_graph" ON "org_positions"("workspaceId", "teamId", "userId");

-- CreateIndex
CREATE INDEX "org_teams_workspaceId_isActive_idx" ON "org_teams"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "person_availability_workspaceId_source_idx" ON "person_availability"("workspaceId", "source");

-- CreateIndex
CREATE INDEX "idx_person_skills_expertise" ON "person_skills"("workspaceId", "skillId", "proficiency");

-- CreateIndex
CREATE INDEX "project_assignees_projectId_idx" ON "project_assignees"("projectId");

-- CreateIndex
CREATE INDEX "project_assignees_userId_idx" ON "project_assignees"("userId");

-- CreateIndex
CREATE INDEX "project_assignees_orgPositionId_idx" ON "project_assignees"("orgPositionId");

-- CreateIndex
CREATE INDEX "project_members_projectId_idx" ON "project_members"("projectId");

-- CreateIndex
CREATE INDEX "project_members_orgPositionId_idx" ON "project_members"("orgPositionId");

-- CreateIndex
CREATE INDEX "projects_workspaceId_ownerId_idx" ON "projects"("workspaceId", "ownerId");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");

-- CreateIndex
CREATE INDEX "tasks_workspaceId_assigneeId_dueDate_idx" ON "tasks"("workspaceId", "assigneeId", "dueDate");

-- AddForeignKey
ALTER TABLE "loopbrain_pending_actions" ADD CONSTRAINT "loopbrain_pending_actions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_orgPositionId_fkey" FOREIGN KEY ("orgPositionId") REFERENCES "org_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignees" ADD CONSTRAINT "project_assignees_orgPositionId_fkey" FOREIGN KEY ("orgPositionId") REFERENCES "org_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_person_links" ADD CONSTRAINT "project_person_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_issue_resolutions" ADD CONSTRAINT "org_issue_resolutions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_capacity_settings" ADD CONSTRAINT "org_capacity_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_capacity_plans" ADD CONSTRAINT "team_capacity_plans_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_capacity_plans" ADD CONSTRAINT "team_capacity_plans_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "org_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loopbrain_user_profiles" ADD CONSTRAINT "loopbrain_user_profiles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loopbrain_user_profiles" ADD CONSTRAINT "loopbrain_user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loopbrain_chat_feedback" ADD CONSTRAINT "loopbrain_chat_feedback_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loopbrain_chat_feedback" ADD CONSTRAINT "loopbrain_chat_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loopbrain_open_loops" ADD CONSTRAINT "loopbrain_open_loops_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loopbrain_open_loops" ADD CONSTRAINT "loopbrain_open_loops_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_coverage" ADD CONSTRAINT "role_coverage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_effort_defaults" ADD CONSTRAINT "work_effort_defaults_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_domains" ADD CONSTRAINT "decision_domains_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_authorities" ADD CONSTRAINT "decision_authorities_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "decision_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_authorities" ADD CONSTRAINT "decision_authorities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_escalation_steps" ADD CONSTRAINT "decision_escalation_steps_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "decision_authorities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_escalation_steps" ADD CONSTRAINT "decision_escalation_steps_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_impacts" ADD CONSTRAINT "work_impacts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_impacts" ADD CONSTRAINT "work_impacts_workRequestId_fkey" FOREIGN KEY ("workRequestId") REFERENCES "work_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_tags" ADD CONSTRAINT "responsibility_tags_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_responsibility_profiles" ADD CONSTRAINT "role_responsibility_profiles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_responsibility_overrides" ADD CONSTRAINT "person_responsibility_overrides_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_responsibility_overrides" ADD CONSTRAINT "person_responsibility_overrides_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "responsibility_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_recommendation_logs" ADD CONSTRAINT "work_recommendation_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_recommendation_logs" ADD CONSTRAINT "work_recommendation_logs_workRequestId_fkey" FOREIGN KEY ("workRequestId") REFERENCES "work_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_recommendation_logs" ADD CONSTRAINT "work_recommendation_logs_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proactive_insights" ADD CONSTRAINT "proactive_insights_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_relationships" ADD CONSTRAINT "person_relationships_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_activity_metrics" ADD CONSTRAINT "person_activity_metrics_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "performance_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_cycles" ADD CONSTRAINT "performance_cycles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_cycles" ADD CONSTRAINT "performance_cycles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_questions" ADD CONSTRAINT "review_questions_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_questions" ADD CONSTRAINT "review_questions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "performance_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "review_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_templates" ADD CONSTRAINT "one_on_one_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_series" ADD CONSTRAINT "one_on_one_series_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_series" ADD CONSTRAINT "one_on_one_series_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_series" ADD CONSTRAINT "one_on_one_series_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_meetings" ADD CONSTRAINT "one_on_one_meetings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_meetings" ADD CONSTRAINT "one_on_one_meetings_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_meetings" ADD CONSTRAINT "one_on_one_meetings_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_meetings" ADD CONSTRAINT "one_on_one_meetings_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "one_on_one_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_talking_points" ADD CONSTRAINT "one_on_one_talking_points_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_talking_points" ADD CONSTRAINT "one_on_one_talking_points_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "one_on_one_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_action_items" ADD CONSTRAINT "one_on_one_action_items_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_action_items" ADD CONSTRAINT "one_on_one_action_items_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "one_on_one_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrimaryTags" ADD CONSTRAINT "_PrimaryTags_A_fkey" FOREIGN KEY ("A") REFERENCES "responsibility_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrimaryTags" ADD CONSTRAINT "_PrimaryTags_B_fkey" FOREIGN KEY ("B") REFERENCES "role_responsibility_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllowedTags" ADD CONSTRAINT "_AllowedTags_A_fkey" FOREIGN KEY ("A") REFERENCES "responsibility_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllowedTags" ADD CONSTRAINT "_AllowedTags_B_fkey" FOREIGN KEY ("B") REFERENCES "role_responsibility_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ForbiddenTags" ADD CONSTRAINT "_ForbiddenTags_A_fkey" FOREIGN KEY ("A") REFERENCES "responsibility_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ForbiddenTags" ADD CONSTRAINT "_ForbiddenTags_B_fkey" FOREIGN KEY ("B") REFERENCES "role_responsibility_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WorkTags" ADD CONSTRAINT "_WorkTags_A_fkey" FOREIGN KEY ("A") REFERENCES "responsibility_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WorkTags" ADD CONSTRAINT "_WorkTags_B_fkey" FOREIGN KEY ("B") REFERENCES "work_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_projects_space_id" RENAME TO "projects_spaceId_idx";

