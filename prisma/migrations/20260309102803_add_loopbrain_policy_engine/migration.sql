-- CreateEnum
CREATE TYPE "PolicyScheduleType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CRON');

-- CreateEnum
CREATE TYPE "PolicyTriggerType" AS ENUM ('SCHEDULE', 'EMAIL_KEYWORD', 'TASK_STATUS_CHANGE', 'CALENDAR_EVENT');

-- CreateEnum
CREATE TYPE "PolicyExecutionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILURE', 'PARTIAL', 'TIMEOUT', 'CANCELLED');

-- CreateTable
CREATE TABLE "loopbrain_policies" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "compiledPlan" JSONB,
    "compiledAt" TIMESTAMP(3),
    "compileError" TEXT,
    "scheduleType" "PolicyScheduleType",
    "scheduleConfig" JSONB,
    "nextRunAt" TIMESTAMP(3),
    "triggerType" "PolicyTriggerType" NOT NULL DEFAULT 'SCHEDULE',
    "triggerConfig" JSONB,
    "maxActions" INTEGER NOT NULL DEFAULT 50,
    "maxDurationMs" INTEGER NOT NULL DEFAULT 300000,
    "tokenBudget" INTEGER NOT NULL DEFAULT 50000,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "disabledReason" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loopbrain_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_executions" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PolicyExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "triggerSource" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "actionsCount" INTEGER NOT NULL DEFAULT 0,
    "tokenUsage" INTEGER,
    "result" JSONB,
    "errorMessage" TEXT,
    "userFeedback" TEXT,

    CONSTRAINT "policy_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_action_logs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "toolName" TEXT NOT NULL,
    "params" JSONB,
    "success" BOOLEAN NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loopbrain_policies_workspaceId_idx" ON "loopbrain_policies"("workspaceId");

-- CreateIndex
CREATE INDEX "loopbrain_policies_workspaceId_enabled_idx" ON "loopbrain_policies"("workspaceId", "enabled");

-- CreateIndex
CREATE INDEX "loopbrain_policies_workspaceId_userId_idx" ON "loopbrain_policies"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "loopbrain_policies_enabled_nextRunAt_idx" ON "loopbrain_policies"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "loopbrain_policies_enabled_triggerType_idx" ON "loopbrain_policies"("enabled", "triggerType");

-- CreateIndex
CREATE INDEX "policy_executions_policyId_idx" ON "policy_executions"("policyId");

-- CreateIndex
CREATE INDEX "policy_executions_workspaceId_idx" ON "policy_executions"("workspaceId");

-- CreateIndex
CREATE INDEX "policy_executions_policyId_startedAt_idx" ON "policy_executions"("policyId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "policy_executions_workspaceId_startedAt_idx" ON "policy_executions"("workspaceId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "policy_action_logs_executionId_idx" ON "policy_action_logs"("executionId");

-- AddForeignKey
ALTER TABLE "loopbrain_policies" ADD CONSTRAINT "loopbrain_policies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loopbrain_policies" ADD CONSTRAINT "loopbrain_policies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_executions" ADD CONSTRAINT "policy_executions_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "loopbrain_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_action_logs" ADD CONSTRAINT "policy_action_logs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "policy_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
