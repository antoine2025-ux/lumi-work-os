-- CreateEnum
CREATE TYPE "GoalLevel" AS ENUM ('COMPANY', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('QUARTERLY', 'ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KeyResultStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('PERCENT', 'NUMBER', 'BOOLEAN', 'CURRENCY');

-- CreateEnum
CREATE TYPE "GoalUpdateType" AS ENUM ('PROGRESS_UPDATE', 'STATUS_CHANGE', 'OBJECTIVE_ADDED', 'OBJECTIVE_UPDATED', 'OBJECTIVE_REMOVED', 'KEY_RESULT_UPDATED', 'COMMENT_ADDED', 'PROJECT_LINKED', 'PROJECT_UNLINKED');

-- CreateEnum
CREATE TYPE "StakeholderRole" AS ENUM ('OWNER', 'CONTRIBUTOR', 'VIEWER', 'REVIEWER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('REQUIRED', 'CONTRIBUTING', 'SUPPORTING');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('PROGRESS_AT_RISK', 'RESOURCE_REALLOCATION', 'TIMELINE_ADJUSTMENT', 'STAKEHOLDER_ENGAGEMENT', 'PROJECT_PRIORITIZATION');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'IMPLEMENTING', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "WorkflowTrigger" AS ENUM ('GOAL_PROGRESS_STALLED', 'GOAL_AT_RISK', 'PROJECT_COMPLETION', 'DEADLINE_APPROACHING', 'STAKEHOLDER_UPDATE_REQUIRED');

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" "GoalLevel" NOT NULL,
    "ownerId" TEXT,
    "parentId" TEXT,
    "period" "GoalPeriod" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "quarter" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'DRAFT',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alignmentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "reviewCycle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objectives" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_results" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" "MetricType" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "KeyResultStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "key_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_result_updates" (
    "id" TEXT NOT NULL,
    "keyResultId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "previousValue" DOUBLE PRECISION NOT NULL,
    "newValue" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "key_result_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_comments" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_updates" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "updateType" "GoalUpdateType" NOT NULL,
    "content" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_goal_links" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contributionType" "ContributionType" NOT NULL DEFAULT 'CONTRIBUTING',
    "expectedImpact" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "actualImpact" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoUpdate" BOOLEAN NOT NULL DEFAULT true,
    "syncRules" JSONB,

    CONSTRAINT "project_goal_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_templates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" "GoalLevel" NOT NULL,
    "template" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "goal_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_stakeholders" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "StakeholderRole" NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_stakeholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_approvals" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_progress_updates" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "sourceId" TEXT,
    "previousProgress" DOUBLE PRECISION NOT NULL,
    "newProgress" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT NOT NULL,

    CONSTRAINT "goal_progress_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_analytics" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "progressVelocity" DOUBLE PRECISION NOT NULL,
    "projectedCompletion" TIMESTAMP(3),
    "riskScore" DOUBLE PRECISION NOT NULL,
    "updateFrequency" DOUBLE PRECISION NOT NULL,
    "stakeholderEngagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "teamProductivity" DOUBLE PRECISION,
    "projectAlignment" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_recommendations" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "RecommendationType" NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggestedActions" JSONB NOT NULL,
    "automatable" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION NOT NULL,
    "impact" DOUBLE PRECISION NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "implementedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_check_ins" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "progressUpdate" DOUBLE PRECISION,
    "blockers" TEXT,
    "support" TEXT,
    "confidence" DOUBLE PRECISION,
    "systemUpdates" JSONB,
    "recommendations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_workflow_rules" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "WorkflowTrigger" NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_workflow_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable for goal conflicts (many-to-many self-relation)
CREATE TABLE "_GoalConflicts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "goals_workspaceId_idx" ON "goals"("workspaceId");

-- CreateIndex
CREATE INDEX "goals_workspaceId_level_idx" ON "goals"("workspaceId", "level");

-- CreateIndex
CREATE INDEX "goals_workspaceId_ownerId_idx" ON "goals"("workspaceId", "ownerId");

-- CreateIndex
CREATE INDEX "goals_workspaceId_quarter_idx" ON "goals"("workspaceId", "quarter");

-- CreateIndex
CREATE INDEX "goals_workspaceId_status_idx" ON "goals"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "goals_parentId_idx" ON "goals"("parentId");

-- CreateIndex
CREATE INDEX "goals_workspaceId_level_reviewCycle_idx" ON "goals"("workspaceId", "level", "reviewCycle");

-- CreateIndex
CREATE INDEX "objectives_goalId_idx" ON "objectives"("goalId");

-- CreateIndex
CREATE INDEX "objectives_workspaceId_idx" ON "objectives"("workspaceId");

-- CreateIndex
CREATE INDEX "key_results_objectiveId_idx" ON "key_results"("objectiveId");

-- CreateIndex
CREATE INDEX "key_results_workspaceId_idx" ON "key_results"("workspaceId");

-- CreateIndex
CREATE INDEX "key_result_updates_keyResultId_idx" ON "key_result_updates"("keyResultId");

-- CreateIndex
CREATE INDEX "key_result_updates_createdAt_idx" ON "key_result_updates"("createdAt");

-- CreateIndex
CREATE INDEX "key_result_updates_workspaceId_idx" ON "key_result_updates"("workspaceId");

-- CreateIndex
CREATE INDEX "goal_comments_goalId_idx" ON "goal_comments"("goalId");

-- CreateIndex
CREATE INDEX "goal_comments_createdAt_idx" ON "goal_comments"("createdAt");

-- CreateIndex
CREATE INDEX "goal_comments_workspaceId_idx" ON "goal_comments"("workspaceId");

-- CreateIndex
CREATE INDEX "goal_updates_goalId_idx" ON "goal_updates"("goalId");

-- CreateIndex
CREATE INDEX "goal_updates_createdAt_idx" ON "goal_updates"("createdAt");

-- CreateIndex
CREATE INDEX "goal_updates_workspaceId_idx" ON "goal_updates"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "project_goal_links_goalId_projectId_key" ON "project_goal_links"("goalId", "projectId");

-- CreateIndex
CREATE INDEX "project_goal_links_goalId_idx" ON "project_goal_links"("goalId");

-- CreateIndex
CREATE INDEX "project_goal_links_projectId_idx" ON "project_goal_links"("projectId");

-- CreateIndex
CREATE INDEX "project_goal_links_workspaceId_idx" ON "project_goal_links"("workspaceId");

-- CreateIndex
CREATE INDEX "goal_templates_workspaceId_idx" ON "goal_templates"("workspaceId");

-- CreateIndex
CREATE INDEX "goal_templates_workspaceId_level_idx" ON "goal_templates"("workspaceId", "level");

-- CreateIndex
CREATE INDEX "goal_templates_workspaceId_isActive_idx" ON "goal_templates"("workspaceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "goal_stakeholders_goalId_userId_key" ON "goal_stakeholders"("goalId", "userId");

-- CreateIndex
CREATE INDEX "goal_stakeholders_goalId_idx" ON "goal_stakeholders"("goalId");

-- CreateIndex
CREATE INDEX "goal_stakeholders_userId_idx" ON "goal_stakeholders"("userId");

-- CreateIndex
CREATE INDEX "goal_stakeholders_workspaceId_idx" ON "goal_stakeholders"("workspaceId");

-- CreateIndex
CREATE INDEX "goal_approvals_goalId_idx" ON "goal_approvals"("goalId");

-- CreateIndex
CREATE INDEX "goal_approvals_approverId_status_idx" ON "goal_approvals"("approverId", "status");

-- CreateIndex
CREATE INDEX "goal_approvals_workspaceId_idx" ON "goal_approvals"("workspaceId");

-- CreateIndex
CREATE INDEX "goal_progress_updates_goalId_createdAt_idx" ON "goal_progress_updates"("goalId", "createdAt");

-- CreateIndex
CREATE INDEX "goal_progress_updates_updatedById_idx" ON "goal_progress_updates"("updatedById");

-- CreateIndex
CREATE INDEX "goal_progress_updates_workspaceId_idx" ON "goal_progress_updates"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "goal_analytics_goalId_period_key" ON "goal_analytics"("goalId", "period");

-- CreateIndex
CREATE INDEX "goal_analytics_riskScore_idx" ON "goal_analytics"("riskScore");

-- CreateIndex
CREATE INDEX "goal_analytics_workspaceId_idx" ON "goal_analytics"("workspaceId");

-- CreateIndex
CREATE INDEX "goal_recommendations_goalId_status_idx" ON "goal_recommendations"("goalId", "status");

-- CreateIndex
CREATE INDEX "goal_recommendations_priority_status_idx" ON "goal_recommendations"("priority", "status");

-- CreateIndex
CREATE INDEX "goal_recommendations_workspaceId_idx" ON "goal_recommendations"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "goal_check_ins_goalId_userId_period_key" ON "goal_check_ins"("goalId", "userId", "period");

-- CreateIndex
CREATE INDEX "goal_check_ins_goalId_createdAt_idx" ON "goal_check_ins"("goalId", "createdAt");

-- CreateIndex
CREATE INDEX "goal_check_ins_workspaceId_idx" ON "goal_check_ins"("workspaceId");

-- CreateIndex
CREATE INDEX "goal_workflow_rules_workspaceId_isActive_idx" ON "goal_workflow_rules"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "goal_workflow_rules_trigger_idx" ON "goal_workflow_rules"("trigger");

-- CreateIndex
CREATE UNIQUE INDEX "_GoalConflicts_AB_unique" ON "_GoalConflicts"("A", "B");

-- CreateIndex
CREATE INDEX "_GoalConflicts_B_index" ON "_GoalConflicts"("B");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "goals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_result_updates" ADD CONSTRAINT "key_result_updates_keyResultId_fkey" FOREIGN KEY ("keyResultId") REFERENCES "key_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_result_updates" ADD CONSTRAINT "key_result_updates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_result_updates" ADD CONSTRAINT "key_result_updates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_comments" ADD CONSTRAINT "goal_comments_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_comments" ADD CONSTRAINT "goal_comments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_comments" ADD CONSTRAINT "goal_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_updates" ADD CONSTRAINT "goal_updates_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_updates" ADD CONSTRAINT "goal_updates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_updates" ADD CONSTRAINT "goal_updates_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_goal_links" ADD CONSTRAINT "project_goal_links_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_goal_links" ADD CONSTRAINT "project_goal_links_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_goal_links" ADD CONSTRAINT "project_goal_links_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_templates" ADD CONSTRAINT "goal_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_templates" ADD CONSTRAINT "goal_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_stakeholders" ADD CONSTRAINT "goal_stakeholders_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_stakeholders" ADD CONSTRAINT "goal_stakeholders_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_stakeholders" ADD CONSTRAINT "goal_stakeholders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_approvals" ADD CONSTRAINT "goal_approvals_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_approvals" ADD CONSTRAINT "goal_approvals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_approvals" ADD CONSTRAINT "goal_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_progress_updates" ADD CONSTRAINT "goal_progress_updates_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_progress_updates" ADD CONSTRAINT "goal_progress_updates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_progress_updates" ADD CONSTRAINT "goal_progress_updates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_analytics" ADD CONSTRAINT "goal_analytics_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_analytics" ADD CONSTRAINT "goal_analytics_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_recommendations" ADD CONSTRAINT "goal_recommendations_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_recommendations" ADD CONSTRAINT "goal_recommendations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_check_ins" ADD CONSTRAINT "goal_check_ins_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_check_ins" ADD CONSTRAINT "goal_check_ins_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_check_ins" ADD CONSTRAINT "goal_check_ins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_workflow_rules" ADD CONSTRAINT "goal_workflow_rules_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GoalConflicts" ADD CONSTRAINT "_GoalConflicts_A_fkey" FOREIGN KEY ("A") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GoalConflicts" ADD CONSTRAINT "_GoalConflicts_B_fkey" FOREIGN KEY ("B") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

