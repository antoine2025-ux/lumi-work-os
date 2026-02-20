-- Migration: Add workspaceId to 39 relation-scoped models
-- Strategy: Add nullable column -> backfill from parent -> delete orphans -> make NOT NULL -> add FK + index
-- Note: wiki_ai_interactions and wiki_page_views already have workspace_id columns, so we skip adding them
-- Note: Prisma handles transactions automatically, so we don't use BEGIN/COMMIT

-- ============================================================================
-- STEP 1: Add nullable workspaceId columns to all 39 tables
-- ============================================================================

-- Tier 1: Task children (table names from @@map)
ALTER TABLE "subtasks" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "task_comments" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "task_history" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "custom_field_vals" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Tier 2: Project children
ALTER TABLE "project_members" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "project_watchers" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "project_assignees" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "project_documentation" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "project_accountability" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "project_daily_summaries" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "custom_field_defs" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Tier 3: WikiPage children
ALTER TABLE "wiki_favorites" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "wiki_attachments" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "wiki_comments" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "wiki_versions" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "wiki_page_permissions" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "wiki_embeds" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
-- Note: wiki_ai_interactions and wiki_page_views already have workspace_id columns in schema
-- Only add if they don't exist (they may have been added in a previous migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wiki_ai_interactions' AND column_name = 'workspace_id') THEN
    ALTER TABLE "wiki_ai_interactions" ADD COLUMN "workspace_id" VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wiki_page_views' AND column_name = 'workspace_id') THEN
    ALTER TABLE "wiki_page_views" ADD COLUMN "workspace_id" VARCHAR(50);
  END IF;
END $$;

-- Tier 4: Goal children (direct)
-- Wrap in DO blocks to handle tables that may not exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objectives') THEN
    ALTER TABLE "objectives" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
END $$;
-- Wrap all goal-related tables in conditional checks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_comments') THEN
    ALTER TABLE "goal_comments" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_updates') THEN
    ALTER TABLE "goal_updates" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_goal_links') THEN
    ALTER TABLE "project_goal_links" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_stakeholders') THEN
    ALTER TABLE "goal_stakeholders" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_approvals') THEN
    ALTER TABLE "goal_approvals" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_progress_updates') THEN
    ALTER TABLE "goal_progress_updates" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_analytics') THEN
    ALTER TABLE "goal_analytics" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_recommendations') THEN
    ALTER TABLE "goal_recommendations" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_check_ins') THEN
    ALTER TABLE "goal_check_ins" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
END $$;

-- Tier 5: Goal grandchildren
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_results') THEN
    ALTER TABLE "key_results" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_result_updates') THEN
    ALTER TABLE "key_result_updates" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
END $$;

-- Tier 6: Other parent chains
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "onboarding_tasks" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "onboarding_task_assignments" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "task_template_items" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "workflow_assignments" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "role_card_skills" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Tier 7: Decision domain children
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_authorities') THEN
    ALTER TABLE "decision_authorities" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_escalation_steps') THEN
    ALTER TABLE "decision_escalation_steps" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Backfill workspaceId from parent models
-- ============================================================================

-- Tier 1: Task children (parent: tasks via taskId)
UPDATE "subtasks" s SET "workspaceId" = t."workspaceId" FROM "tasks" t WHERE s."taskId" = t."id" AND s."workspaceId" IS NULL;
UPDATE "task_comments" tc SET "workspaceId" = t."workspaceId" FROM "tasks" t WHERE tc."taskId" = t."id" AND tc."workspaceId" IS NULL;
UPDATE "task_history" th SET "workspaceId" = t."workspaceId" FROM "tasks" t WHERE th."taskId" = t."id" AND th."workspaceId" IS NULL;
UPDATE "custom_field_vals" cv SET "workspaceId" = t."workspaceId" FROM "tasks" t WHERE cv."taskId" = t."id" AND cv."workspaceId" IS NULL;

-- Tier 2: Project children (parent: projects via projectId)
UPDATE "project_members" pm SET "workspaceId" = p."workspaceId" FROM "projects" p WHERE pm."projectId" = p."id" AND pm."workspaceId" IS NULL;
UPDATE "project_watchers" pw SET "workspaceId" = p."workspaceId" FROM "projects" p WHERE pw."projectId" = p."id" AND pw."workspaceId" IS NULL;
UPDATE "project_assignees" pa SET "workspaceId" = p."workspaceId" FROM "projects" p WHERE pa."projectId" = p."id" AND pa."workspaceId" IS NULL;
UPDATE "project_documentation" pd SET "workspaceId" = p."workspaceId" FROM "projects" p WHERE pd."projectId" = p."id" AND pd."workspaceId" IS NULL;
UPDATE "project_accountability" pac SET "workspaceId" = p."workspaceId" FROM "projects" p WHERE pac."projectId" = p."id" AND pac."workspaceId" IS NULL;
UPDATE "project_daily_summaries" pds SET "workspaceId" = p."workspaceId" FROM "projects" p WHERE pds."projectId" = p."id" AND pds."workspaceId" IS NULL;
UPDATE "custom_field_defs" cfd SET "workspaceId" = p."workspaceId" FROM "projects" p WHERE cfd."projectId" = p."id" AND cfd."workspaceId" IS NULL;

-- Tier 3: WikiPage children (parent: wiki_pages via pageId or page_id)
UPDATE "wiki_favorites" wf SET "workspaceId" = wp."workspaceId" FROM "wiki_pages" wp WHERE wf."page_id" = wp."id" AND wf."workspaceId" IS NULL;
UPDATE "wiki_attachments" wa SET "workspaceId" = wp."workspaceId" FROM "wiki_pages" wp WHERE wa."pageId" = wp."id" AND wa."workspaceId" IS NULL;
UPDATE "wiki_comments" wc SET "workspaceId" = wp."workspaceId" FROM "wiki_pages" wp WHERE wc."pageId" = wp."id" AND wc."workspaceId" IS NULL;
UPDATE "wiki_versions" wv SET "workspaceId" = wp."workspaceId" FROM "wiki_pages" wp WHERE wv."pageId" = wp."id" AND wv."workspaceId" IS NULL;
UPDATE "wiki_page_permissions" wpp SET "workspaceId" = wp."workspaceId" FROM "wiki_pages" wp WHERE wpp."pageId" = wp."id" AND wpp."workspaceId" IS NULL;
UPDATE "wiki_embeds" we SET "workspaceId" = wp."workspaceId" FROM "wiki_pages" wp WHERE we."pageId" = wp."id" AND we."workspaceId" IS NULL;
-- Only update if workspace_id is NULL (may already be populated)
-- Use DO block to handle case where columns might not exist yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wiki_ai_interactions' AND column_name = 'workspace_id') THEN
    UPDATE "wiki_ai_interactions" wai SET "workspace_id" = wp."workspaceId" FROM "wiki_pages" wp WHERE wai."page_id" = wp."id" AND (wai."workspace_id" IS NULL OR wai."workspace_id" = '');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wiki_page_views' AND column_name = 'workspace_id') THEN
    UPDATE "wiki_page_views" wpv SET "workspace_id" = wp."workspaceId" FROM "wiki_pages" wp WHERE wpv."page_id" = wp."id" AND (wpv."workspace_id" IS NULL OR wpv."workspace_id" = '');
  END IF;
END $$;

-- Tier 4: Goal children (parent: goals via goalId)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objectives') THEN
    UPDATE "objectives" o SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE o."goalId" = g."id" AND o."workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_comments') THEN
    UPDATE "goal_comments" gc SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gc."goalId" = g."id" AND gc."workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_updates') THEN
    UPDATE "goal_updates" gu SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gu."goalId" = g."id" AND gu."workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_goal_links') THEN
    UPDATE "project_goal_links" pgl SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE pgl."goalId" = g."id" AND pgl."workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_stakeholders') THEN
    UPDATE "goal_stakeholders" gs SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gs."goalId" = g."id" AND gs."workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_approvals') THEN
    UPDATE "goal_approvals" ga SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE ga."goalId" = g."id" AND ga."workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_progress_updates') THEN
    UPDATE "goal_progress_updates" gpu SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gpu."goalId" = g."id" AND gpu."workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_analytics') THEN
    UPDATE "goal_analytics" gan SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gan."goalId" = g."id" AND gan."workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_recommendations') THEN
    UPDATE "goal_recommendations" gr SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gr."goalId" = g."id" AND gr."workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_check_ins') THEN
    UPDATE "goal_check_ins" gci SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gci."goalId" = g."id" AND gci."workspaceId" IS NULL;
  END IF;
END $$;

-- Tier 5: Goal grandchildren (two-hop joins)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_results') 
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objectives') THEN
    UPDATE "key_results" kr SET "workspaceId" = g."workspaceId"
      FROM "objectives" o JOIN "goals" g ON o."goalId" = g."id"
      WHERE kr."objectiveId" = o."id" AND kr."workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_result_updates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_results')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objectives') THEN
    UPDATE "key_result_updates" kru SET "workspaceId" = g."workspaceId"
      FROM "key_results" kr JOIN "objectives" o ON kr."objectiveId" = o."id" JOIN "goals" g ON o."goalId" = g."id"
      WHERE kru."keyResultId" = kr."id" AND kru."workspaceId" IS NULL;
  END IF;
END $$;

-- Tier 6: Other parent chains
UPDATE "chat_messages" cm SET "workspaceId" = cs."workspaceId" FROM "chat_sessions" cs WHERE cm."sessionId" = cs."id" AND cm."workspaceId" IS NULL;
UPDATE "onboarding_tasks" ot SET "workspaceId" = otpl."workspaceId" FROM "onboarding_templates" otpl WHERE ot."templateId" = otpl."id" AND ot."workspaceId" IS NULL;
UPDATE "onboarding_task_assignments" ota SET "workspaceId" = op."workspaceId" FROM "onboarding_plans" op WHERE ota."planId" = op."id" AND ota."workspaceId" IS NULL;
UPDATE "task_template_items" tti SET "workspaceId" = tt."workspaceId" FROM "task_templates" tt WHERE tti."templateId" = tt."id" AND tti."workspaceId" IS NULL;
UPDATE "workflow_assignments" wa SET "workspaceId" = wi."workspaceId" FROM "workflow_instances" wi WHERE wa."instanceId" = wi."id" AND wa."workspaceId" IS NULL;
UPDATE "role_card_skills" rcs SET "workspaceId" = rc."workspaceId" FROM "role_cards" rc WHERE rcs."roleCardId" = rc."id" AND rcs."workspaceId" IS NULL;

-- Tier 7: Decision domain children
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_authorities')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_domains') THEN
    UPDATE "decision_authorities" da SET "workspaceId" = dd."workspaceId" FROM "decision_domains" dd WHERE da."domainId" = dd."id" AND da."workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_escalation_steps')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_authorities')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_domains') THEN
    UPDATE "decision_escalation_steps" des SET "workspaceId" = dd."workspaceId"
      FROM "decision_authorities" da JOIN "decision_domains" dd ON da."domainId" = dd."id"
      WHERE des."authorityId" = da."id" AND des."workspaceId" IS NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Delete orphaned rows (parent deleted but child remains)
-- These would have NULL workspaceId after backfill
-- ============================================================================

DELETE FROM "subtasks" WHERE "workspaceId" IS NULL;
DELETE FROM "task_comments" WHERE "workspaceId" IS NULL;
DELETE FROM "task_history" WHERE "workspaceId" IS NULL;
DELETE FROM "custom_field_vals" WHERE "workspaceId" IS NULL;
DELETE FROM "project_members" WHERE "workspaceId" IS NULL;
DELETE FROM "project_watchers" WHERE "workspaceId" IS NULL;
DELETE FROM "project_assignees" WHERE "workspaceId" IS NULL;
DELETE FROM "project_documentation" WHERE "workspaceId" IS NULL;
DELETE FROM "project_accountability" WHERE "workspaceId" IS NULL;
DELETE FROM "project_daily_summaries" WHERE "workspaceId" IS NULL;
DELETE FROM "custom_field_defs" WHERE "workspaceId" IS NULL;
DELETE FROM "wiki_favorites" WHERE "workspaceId" IS NULL;
DELETE FROM "wiki_attachments" WHERE "workspaceId" IS NULL;
DELETE FROM "wiki_comments" WHERE "workspaceId" IS NULL;
DELETE FROM "wiki_versions" WHERE "workspaceId" IS NULL;
DELETE FROM "wiki_page_permissions" WHERE "workspaceId" IS NULL;
DELETE FROM "wiki_embeds" WHERE "workspaceId" IS NULL;
DELETE FROM "wiki_ai_interactions" WHERE "workspace_id" IS NULL;
DELETE FROM "wiki_page_views" WHERE "workspace_id" IS NULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objectives') THEN
    DELETE FROM "objectives" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_comments') THEN
    DELETE FROM "goal_comments" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_updates') THEN
    DELETE FROM "goal_updates" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_goal_links') THEN
    DELETE FROM "project_goal_links" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_stakeholders') THEN
    DELETE FROM "goal_stakeholders" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_approvals') THEN
    DELETE FROM "goal_approvals" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_progress_updates') THEN
    DELETE FROM "goal_progress_updates" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_analytics') THEN
    DELETE FROM "goal_analytics" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_recommendations') THEN
    DELETE FROM "goal_recommendations" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_check_ins') THEN
    DELETE FROM "goal_check_ins" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_results') THEN
    DELETE FROM "key_results" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_result_updates') THEN
    DELETE FROM "key_result_updates" WHERE "workspaceId" IS NULL;
  END IF;
END $$;
DELETE FROM "chat_messages" WHERE "workspaceId" IS NULL;
DELETE FROM "onboarding_tasks" WHERE "workspaceId" IS NULL;
DELETE FROM "onboarding_task_assignments" WHERE "workspaceId" IS NULL;
DELETE FROM "task_template_items" WHERE "workspaceId" IS NULL;
DELETE FROM "workflow_assignments" WHERE "workspaceId" IS NULL;
DELETE FROM "role_card_skills" WHERE "workspaceId" IS NULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_authorities') THEN
    DELETE FROM "decision_authorities" WHERE "workspaceId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_escalation_steps') THEN
    DELETE FROM "decision_escalation_steps" WHERE "workspaceId" IS NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Make columns NOT NULL
-- ============================================================================

ALTER TABLE "subtasks" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "task_comments" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "task_history" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "custom_field_vals" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "project_members" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "project_watchers" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "project_assignees" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "project_documentation" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "project_accountability" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "project_daily_summaries" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "custom_field_defs" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "wiki_favorites" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "wiki_attachments" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "wiki_comments" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "wiki_versions" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "wiki_page_permissions" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "wiki_embeds" ALTER COLUMN "workspaceId" SET NOT NULL;
-- Only set NOT NULL if column is nullable (may already be NOT NULL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wiki_ai_interactions' AND column_name = 'workspace_id' AND is_nullable = 'YES') THEN
    ALTER TABLE "wiki_ai_interactions" ALTER COLUMN "workspace_id" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wiki_page_views' AND column_name = 'workspace_id' AND is_nullable = 'YES') THEN
    ALTER TABLE "wiki_page_views" ALTER COLUMN "workspace_id" SET NOT NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objectives')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "objectives" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_comments')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_comments' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "goal_comments" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_updates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_updates' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "goal_updates" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_goal_links')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_goal_links' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "project_goal_links" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_stakeholders')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_stakeholders' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "goal_stakeholders" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_approvals')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_approvals' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "goal_approvals" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_progress_updates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_progress_updates' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "goal_progress_updates" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_analytics')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_analytics' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "goal_analytics" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_recommendations')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_recommendations' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "goal_recommendations" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_check_ins')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_check_ins' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "goal_check_ins" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_results')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'key_results' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "key_results" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_result_updates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'key_result_updates' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "key_result_updates" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
END $$;
ALTER TABLE "chat_messages" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "onboarding_tasks" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "onboarding_task_assignments" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "task_template_items" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "workflow_assignments" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "role_card_skills" ALTER COLUMN "workspaceId" SET NOT NULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_authorities')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'decision_authorities' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "decision_authorities" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_escalation_steps')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'decision_escalation_steps' AND column_name = 'workspaceId' AND is_nullable = 'YES') THEN
    ALTER TABLE "decision_escalation_steps" ALTER COLUMN "workspaceId" SET NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Add foreign key constraints
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subtasks_workspaceId_fkey' AND table_name = 'subtasks') THEN
    ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_comments_workspaceId_fkey' AND table_name = 'task_comments') THEN
    ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_history_workspaceId_fkey' AND table_name = 'task_history') THEN
    ALTER TABLE "task_history" ADD CONSTRAINT "task_history_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'custom_field_vals_workspaceId_fkey' AND table_name = 'custom_field_vals') THEN
    ALTER TABLE "custom_field_vals" ADD CONSTRAINT "custom_field_vals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_members_workspaceId_fkey' AND table_name = 'project_members') THEN
    ALTER TABLE "project_members" ADD CONSTRAINT "project_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_watchers_workspaceId_fkey' AND table_name = 'project_watchers') THEN
    ALTER TABLE "project_watchers" ADD CONSTRAINT "project_watchers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_assignees_workspaceId_fkey' AND table_name = 'project_assignees') THEN
    ALTER TABLE "project_assignees" ADD CONSTRAINT "project_assignees_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_documentation_workspaceId_fkey' AND table_name = 'project_documentation') THEN
    ALTER TABLE "project_documentation" ADD CONSTRAINT "project_documentation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_accountability_workspaceId_fkey' AND table_name = 'project_accountability') THEN
    ALTER TABLE "project_accountability" ADD CONSTRAINT "project_accountability_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_daily_summaries_workspaceId_fkey' AND table_name = 'project_daily_summaries') THEN
    ALTER TABLE "project_daily_summaries" ADD CONSTRAINT "project_daily_summaries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'custom_field_defs_workspaceId_fkey' AND table_name = 'custom_field_defs') THEN
    ALTER TABLE "custom_field_defs" ADD CONSTRAINT "custom_field_defs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'wiki_favorites_workspaceId_fkey' AND table_name = 'wiki_favorites') THEN
    ALTER TABLE "wiki_favorites" ADD CONSTRAINT "wiki_favorites_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'wiki_attachments_workspaceId_fkey' AND table_name = 'wiki_attachments') THEN
    ALTER TABLE "wiki_attachments" ADD CONSTRAINT "wiki_attachments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'wiki_comments_workspaceId_fkey' AND table_name = 'wiki_comments') THEN
    ALTER TABLE "wiki_comments" ADD CONSTRAINT "wiki_comments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'wiki_versions_workspaceId_fkey' AND table_name = 'wiki_versions') THEN
    ALTER TABLE "wiki_versions" ADD CONSTRAINT "wiki_versions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'wiki_page_permissions_workspaceId_fkey' AND table_name = 'wiki_page_permissions') THEN
    ALTER TABLE "wiki_page_permissions" ADD CONSTRAINT "wiki_page_permissions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'wiki_embeds_workspaceId_fkey' AND table_name = 'wiki_embeds') THEN
    ALTER TABLE "wiki_embeds" ADD CONSTRAINT "wiki_embeds_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
-- Only add FK if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'wiki_ai_interactions_workspace_id_fkey' AND table_name = 'wiki_ai_interactions') THEN
    ALTER TABLE "wiki_ai_interactions" ADD CONSTRAINT "wiki_ai_interactions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'wiki_page_views_workspace_id_fkey' AND table_name = 'wiki_page_views') THEN
    ALTER TABLE "wiki_page_views" ADD CONSTRAINT "wiki_page_views_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objectives')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'objectives_workspaceId_fkey' AND table_name = 'objectives') THEN
      ALTER TABLE "objectives" ADD CONSTRAINT "objectives_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_comments')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_comments' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'goal_comments_workspaceId_fkey' AND table_name = 'goal_comments') THEN
      ALTER TABLE "goal_comments" ADD CONSTRAINT "goal_comments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_updates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_updates' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'goal_updates_workspaceId_fkey' AND table_name = 'goal_updates') THEN
      ALTER TABLE "goal_updates" ADD CONSTRAINT "goal_updates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_goal_links')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_goal_links' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_goal_links_workspaceId_fkey' AND table_name = 'project_goal_links') THEN
      ALTER TABLE "project_goal_links" ADD CONSTRAINT "project_goal_links_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_stakeholders')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_stakeholders' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'goal_stakeholders_workspaceId_fkey' AND table_name = 'goal_stakeholders') THEN
      ALTER TABLE "goal_stakeholders" ADD CONSTRAINT "goal_stakeholders_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_approvals')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_approvals' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'goal_approvals_workspaceId_fkey' AND table_name = 'goal_approvals') THEN
      ALTER TABLE "goal_approvals" ADD CONSTRAINT "goal_approvals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_progress_updates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_progress_updates' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'goal_progress_updates_workspaceId_fkey' AND table_name = 'goal_progress_updates') THEN
      ALTER TABLE "goal_progress_updates" ADD CONSTRAINT "goal_progress_updates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_analytics')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_analytics' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'goal_analytics_workspaceId_fkey' AND table_name = 'goal_analytics') THEN
      ALTER TABLE "goal_analytics" ADD CONSTRAINT "goal_analytics_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_recommendations')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_recommendations' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'goal_recommendations_workspaceId_fkey' AND table_name = 'goal_recommendations') THEN
      ALTER TABLE "goal_recommendations" ADD CONSTRAINT "goal_recommendations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_check_ins')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_check_ins' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'goal_check_ins_workspaceId_fkey' AND table_name = 'goal_check_ins') THEN
      ALTER TABLE "goal_check_ins" ADD CONSTRAINT "goal_check_ins_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_results')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'key_results' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'key_results_workspaceId_fkey' AND table_name = 'key_results') THEN
      ALTER TABLE "key_results" ADD CONSTRAINT "key_results_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_result_updates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'key_result_updates' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'key_result_updates_workspaceId_fkey' AND table_name = 'key_result_updates') THEN
      ALTER TABLE "key_result_updates" ADD CONSTRAINT "key_result_updates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_messages_workspaceId_fkey' AND table_name = 'chat_messages') THEN
    ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'onboarding_tasks_workspaceId_fkey' AND table_name = 'onboarding_tasks') THEN
    ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'onboarding_task_assignments_workspaceId_fkey' AND table_name = 'onboarding_task_assignments') THEN
    ALTER TABLE "onboarding_task_assignments" ADD CONSTRAINT "onboarding_task_assignments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_template_items_workspaceId_fkey' AND table_name = 'task_template_items') THEN
    ALTER TABLE "task_template_items" ADD CONSTRAINT "task_template_items_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'workflow_assignments_workspaceId_fkey' AND table_name = 'workflow_assignments') THEN
    ALTER TABLE "workflow_assignments" ADD CONSTRAINT "workflow_assignments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'role_card_skills_workspaceId_fkey' AND table_name = 'role_card_skills') THEN
    ALTER TABLE "role_card_skills" ADD CONSTRAINT "role_card_skills_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_authorities')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'decision_authorities' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'decision_authorities_workspaceId_fkey' AND table_name = 'decision_authorities') THEN
      ALTER TABLE "decision_authorities" ADD CONSTRAINT "decision_authorities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_escalation_steps')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'decision_escalation_steps' AND column_name = 'workspaceId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'decision_escalation_steps_workspaceId_fkey' AND table_name = 'decision_escalation_steps') THEN
      ALTER TABLE "decision_escalation_steps" ADD CONSTRAINT "decision_escalation_steps_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Add indexes for workspace filtering performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS "subtasks_workspaceId_idx" ON "subtasks"("workspaceId");
CREATE INDEX IF NOT EXISTS "task_comments_workspaceId_idx" ON "task_comments"("workspaceId");
CREATE INDEX IF NOT EXISTS "task_history_workspaceId_idx" ON "task_history"("workspaceId");
CREATE INDEX IF NOT EXISTS "custom_field_vals_workspaceId_idx" ON "custom_field_vals"("workspaceId");
CREATE INDEX IF NOT EXISTS "project_members_workspaceId_idx" ON "project_members"("workspaceId");
CREATE INDEX IF NOT EXISTS "project_watchers_workspaceId_idx" ON "project_watchers"("workspaceId");
CREATE INDEX IF NOT EXISTS "project_assignees_workspaceId_idx" ON "project_assignees"("workspaceId");
CREATE INDEX IF NOT EXISTS "project_documentation_workspaceId_idx" ON "project_documentation"("workspaceId");
CREATE INDEX IF NOT EXISTS "project_accountability_workspaceId_idx" ON "project_accountability"("workspaceId");
CREATE INDEX IF NOT EXISTS "project_daily_summaries_workspaceId_idx" ON "project_daily_summaries"("workspaceId");
CREATE INDEX IF NOT EXISTS "custom_field_defs_workspaceId_idx" ON "custom_field_defs"("workspaceId");
CREATE INDEX IF NOT EXISTS "wiki_favorites_workspaceId_idx" ON "wiki_favorites"("workspaceId");
CREATE INDEX IF NOT EXISTS "wiki_attachments_workspaceId_idx" ON "wiki_attachments"("workspaceId");
CREATE INDEX IF NOT EXISTS "wiki_comments_workspaceId_idx" ON "wiki_comments"("workspaceId");
CREATE INDEX IF NOT EXISTS "wiki_versions_workspaceId_idx" ON "wiki_versions"("workspaceId");
CREATE INDEX IF NOT EXISTS "wiki_page_permissions_workspaceId_idx" ON "wiki_page_permissions"("workspaceId");
CREATE INDEX IF NOT EXISTS "wiki_embeds_workspaceId_idx" ON "wiki_embeds"("workspaceId");
CREATE INDEX IF NOT EXISTS "wiki_ai_interactions_workspace_id_idx" ON "wiki_ai_interactions"("workspace_id");
CREATE INDEX IF NOT EXISTS "wiki_page_views_workspace_id_idx" ON "wiki_page_views"("workspace_id");
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objectives')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "objectives_workspaceId_idx" ON "objectives"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_comments')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_comments' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "goal_comments_workspaceId_idx" ON "goal_comments"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_updates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_updates' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "goal_updates_workspaceId_idx" ON "goal_updates"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_goal_links')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_goal_links' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "project_goal_links_workspaceId_idx" ON "project_goal_links"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_stakeholders')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_stakeholders' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "goal_stakeholders_workspaceId_idx" ON "goal_stakeholders"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_approvals')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_approvals' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "goal_approvals_workspaceId_idx" ON "goal_approvals"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_progress_updates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_progress_updates' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "goal_progress_updates_workspaceId_idx" ON "goal_progress_updates"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_analytics')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_analytics' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "goal_analytics_workspaceId_idx" ON "goal_analytics"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_recommendations')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_recommendations' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "goal_recommendations_workspaceId_idx" ON "goal_recommendations"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_check_ins')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_check_ins' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "goal_check_ins_workspaceId_idx" ON "goal_check_ins"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_results')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'key_results' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "key_results_workspaceId_idx" ON "key_results"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_result_updates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'key_result_updates' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "key_result_updates_workspaceId_idx" ON "key_result_updates"("workspaceId");
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "chat_messages_workspaceId_idx" ON "chat_messages"("workspaceId");
CREATE INDEX IF NOT EXISTS "onboarding_tasks_workspaceId_idx" ON "onboarding_tasks"("workspaceId");
CREATE INDEX IF NOT EXISTS "onboarding_task_assignments_workspaceId_idx" ON "onboarding_task_assignments"("workspaceId");
CREATE INDEX IF NOT EXISTS "task_template_items_workspaceId_idx" ON "task_template_items"("workspaceId");
CREATE INDEX IF NOT EXISTS "workflow_assignments_workspaceId_idx" ON "workflow_assignments"("workspaceId");
CREATE INDEX IF NOT EXISTS "role_card_skills_workspaceId_idx" ON "role_card_skills"("workspaceId");
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_authorities')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'decision_authorities' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "decision_authorities_workspaceId_idx" ON "decision_authorities"("workspaceId");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_escalation_steps')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'decision_escalation_steps' AND column_name = 'workspaceId') THEN
    CREATE INDEX IF NOT EXISTS "decision_escalation_steps_workspaceId_idx" ON "decision_escalation_steps"("workspaceId");
  END IF;
END $$;
