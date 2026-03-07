-- Schema Catchup Migration
-- Brings staging/production in sync with schema changes that were applied
-- locally via db push but never created as migration files.

-- ============================================================
-- 1. Create job_descriptions table
-- ============================================================
CREATE TABLE IF NOT EXISTS "job_descriptions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "level" TEXT,
    "jobFamily" TEXT,
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keyMetrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "job_descriptions_workspaceId_title_level_key"
    ON "job_descriptions"("workspaceId", "title", "level");
CREATE INDEX IF NOT EXISTS "job_descriptions_workspaceId_idx"
    ON "job_descriptions"("workspaceId");
CREATE INDEX IF NOT EXISTS "job_descriptions_workspaceId_jobFamily_idx"
    ON "job_descriptions"("workspaceId", "jobFamily");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_descriptions_workspaceId_fkey') THEN
        ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_workspaceId_fkey"
            FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- 2. Create loopbrain_sessions table
-- ============================================================
CREATE TABLE IF NOT EXISTS "loopbrain_sessions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "pendingPlan" JSONB,
    "pendingPlanExpiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loopbrain_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "loopbrain_sessions_conversationId_key"
    ON "loopbrain_sessions"("conversationId");
CREATE INDEX IF NOT EXISTS "loopbrain_sessions_workspaceId_idx"
    ON "loopbrain_sessions"("workspaceId");
CREATE INDEX IF NOT EXISTS "loopbrain_sessions_userId_idx"
    ON "loopbrain_sessions"("userId");
CREATE INDEX IF NOT EXISTS "loopbrain_sessions_conversationId_idx"
    ON "loopbrain_sessions"("conversationId");
CREATE INDEX IF NOT EXISTS "loopbrain_sessions_workspaceId_userId_idx"
    ON "loopbrain_sessions"("workspaceId", "userId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loopbrain_sessions_workspaceId_fkey') THEN
        ALTER TABLE "loopbrain_sessions" ADD CONSTRAINT "loopbrain_sessions_workspaceId_fkey"
            FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- 3. Create notification_preferences table
-- ============================================================
CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_userId_workspaceId_notificationType_key"
    ON "notification_preferences"("userId", "workspaceId", "notificationType");
CREATE INDEX IF NOT EXISTS "notification_preferences_userId_workspaceId_idx"
    ON "notification_preferences"("userId", "workspaceId");
CREATE INDEX IF NOT EXISTS "notification_preferences_workspaceId_idx"
    ON "notification_preferences"("workspaceId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_userId_fkey') THEN
        ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_workspaceId_fkey') THEN
        ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_workspaceId_fkey"
            FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- 4. Add jobDescriptionId column to org_positions
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_positions' AND column_name = 'jobDescriptionId'
    ) THEN
        ALTER TABLE "org_positions" ADD COLUMN "jobDescriptionId" TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "org_positions_jobDescriptionId_idx"
    ON "org_positions"("jobDescriptionId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'org_positions_jobDescriptionId_fkey') THEN
        ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_jobDescriptionId_fkey"
            FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- 5. Add new columns to role_cards
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_cards' AND column_name = 'roleInOrg'
    ) THEN
        ALTER TABLE "role_cards" ADD COLUMN "roleInOrg" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_cards' AND column_name = 'focusArea'
    ) THEN
        ALTER TABLE "role_cards" ADD COLUMN "focusArea" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_cards' AND column_name = 'managerNotes'
    ) THEN
        ALTER TABLE "role_cards" ADD COLUMN "managerNotes" TEXT;
    END IF;
END $$;

-- ============================================================
-- 6. Add new columns to org_invitations
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_invitations' AND column_name = 'title'
    ) THEN
        ALTER TABLE "org_invitations" ADD COLUMN "title" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_invitations' AND column_name = 'departmentId'
    ) THEN
        ALTER TABLE "org_invitations" ADD COLUMN "departmentId" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_invitations' AND column_name = 'teamId'
    ) THEN
        ALTER TABLE "org_invitations" ADD COLUMN "teamId" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_invitations' AND column_name = 'managerId'
    ) THEN
        ALTER TABLE "org_invitations" ADD COLUMN "managerId" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_invitations' AND column_name = 'jobDescriptionId'
    ) THEN
        ALTER TABLE "org_invitations" ADD COLUMN "jobDescriptionId" TEXT;
    END IF;
END $$;
