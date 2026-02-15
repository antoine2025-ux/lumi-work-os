-- Migration: Add workspaceId to 39 relation-scoped models
-- Strategy: Add nullable column -> backfill from parent -> delete orphans -> make NOT NULL -> add FK + index

BEGIN;

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
ALTER TABLE "wiki_ai_interactions" ADD COLUMN IF NOT EXISTS "workspace_id" VARCHAR(50);
ALTER TABLE "wiki_page_views" ADD COLUMN IF NOT EXISTS "workspace_id" VARCHAR(50);

-- Tier 4: Goal children (direct)
ALTER TABLE "objectives" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "goal_comments" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "goal_updates" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "project_goal_links" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "goal_stakeholders" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "goal_approvals" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "goal_progress_updates" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "goal_analytics" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "goal_recommendations" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "goal_check_ins" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Tier 5: Goal grandchildren
ALTER TABLE "key_results" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "key_result_updates" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Tier 6: Other parent chains
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "onboarding_tasks" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "onboarding_task_assignments" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "task_template_items" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "workflow_assignments" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "role_card_skills" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Tier 7: Decision domain children
ALTER TABLE "decision_authorities" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "decision_escalation_steps" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

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
UPDATE "wiki_ai_interactions" wai SET "workspace_id" = wp."workspaceId" FROM "wiki_pages" wp WHERE wai."page_id" = wp."id" AND wai."workspace_id" IS NULL;
UPDATE "wiki_page_views" wpv SET "workspace_id" = wp."workspaceId" FROM "wiki_pages" wp WHERE wpv."page_id" = wp."id" AND wpv."workspace_id" IS NULL;

-- Tier 4: Goal children (parent: goals via goalId)
UPDATE "objectives" o SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE o."goalId" = g."id" AND o."workspaceId" IS NULL;
UPDATE "goal_comments" gc SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gc."goalId" = g."id" AND gc."workspaceId" IS NULL;
UPDATE "goal_updates" gu SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gu."goalId" = g."id" AND gu."workspaceId" IS NULL;
UPDATE "project_goal_links" pgl SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE pgl."goalId" = g."id" AND pgl."workspaceId" IS NULL;
UPDATE "goal_stakeholders" gs SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gs."goalId" = g."id" AND gs."workspaceId" IS NULL;
UPDATE "goal_approvals" ga SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE ga."goalId" = g."id" AND ga."workspaceId" IS NULL;
UPDATE "goal_progress_updates" gpu SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gpu."goalId" = g."id" AND gpu."workspaceId" IS NULL;
UPDATE "goal_analytics" gan SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gan."goalId" = g."id" AND gan."workspaceId" IS NULL;
UPDATE "goal_recommendations" gr SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gr."goalId" = g."id" AND gr."workspaceId" IS NULL;
UPDATE "goal_check_ins" gci SET "workspaceId" = g."workspaceId" FROM "goals" g WHERE gci."goalId" = g."id" AND gci."workspaceId" IS NULL;

-- Tier 5: Goal grandchildren (two-hop joins)
UPDATE "key_results" kr SET "workspaceId" = g."workspaceId"
  FROM "objectives" o JOIN "goals" g ON o."goalId" = g."id"
  WHERE kr."objectiveId" = o."id" AND kr."workspaceId" IS NULL;

UPDATE "key_result_updates" kru SET "workspaceId" = g."workspaceId"
  FROM "key_results" kr JOIN "objectives" o ON kr."objectiveId" = o."id" JOIN "goals" g ON o."goalId" = g."id"
  WHERE kru."keyResultId" = kr."id" AND kru."workspaceId" IS NULL;

-- Tier 6: Other parent chains
UPDATE "chat_messages" cm SET "workspaceId" = cs."workspaceId" FROM "chat_sessions" cs WHERE cm."sessionId" = cs."id" AND cm."workspaceId" IS NULL;
UPDATE "onboarding_tasks" ot SET "workspaceId" = otpl."workspaceId" FROM "onboarding_templates" otpl WHERE ot."templateId" = otpl."id" AND ot."workspaceId" IS NULL;
UPDATE "onboarding_task_assignments" ota SET "workspaceId" = op."workspaceId" FROM "onboarding_plans" op WHERE ota."planId" = op."id" AND ota."workspaceId" IS NULL;
UPDATE "task_template_items" tti SET "workspaceId" = tt."workspaceId" FROM "task_templates" tt WHERE tti."templateId" = tt."id" AND tti."workspaceId" IS NULL;
UPDATE "workflow_assignments" wa SET "workspaceId" = wi."workspaceId" FROM "workflow_instances" wi WHERE wa."instanceId" = wi."id" AND wa."workspaceId" IS NULL;
UPDATE "role_card_skills" rcs SET "workspaceId" = rc."workspaceId" FROM "role_cards" rc WHERE rcs."roleCardId" = rc."id" AND rcs."workspaceId" IS NULL;

-- Tier 7: Decision domain children
UPDATE "decision_authorities" da SET "workspaceId" = dd."workspaceId" FROM "decision_domains" dd WHERE da."domainId" = dd."id" AND da."workspaceId" IS NULL;
UPDATE "decision_escalation_steps" des SET "workspaceId" = dd."workspaceId"
  FROM "decision_authorities" da JOIN "decision_domains" dd ON da."domainId" = dd."id"
  WHERE des."authorityId" = da."id" AND des."workspaceId" IS NULL;

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
DELETE FROM "objectives" WHERE "workspaceId" IS NULL;
DELETE FROM "goal_comments" WHERE "workspaceId" IS NULL;
DELETE FROM "goal_updates" WHERE "workspaceId" IS NULL;
DELETE FROM "project_goal_links" WHERE "workspaceId" IS NULL;
DELETE FROM "goal_stakeholders" WHERE "workspaceId" IS NULL;
DELETE FROM "goal_approvals" WHERE "workspaceId" IS NULL;
DELETE FROM "goal_progress_updates" WHERE "workspaceId" IS NULL;
DELETE FROM "goal_analytics" WHERE "workspaceId" IS NULL;
DELETE FROM "goal_recommendations" WHERE "workspaceId" IS NULL;
DELETE FROM "goal_check_ins" WHERE "workspaceId" IS NULL;
DELETE FROM "key_results" WHERE "workspaceId" IS NULL;
DELETE FROM "key_result_updates" WHERE "workspaceId" IS NULL;
DELETE FROM "chat_messages" WHERE "workspaceId" IS NULL;
DELETE FROM "onboarding_tasks" WHERE "workspaceId" IS NULL;
DELETE FROM "onboarding_task_assignments" WHERE "workspaceId" IS NULL;
DELETE FROM "task_template_items" WHERE "workspaceId" IS NULL;
DELETE FROM "workflow_assignments" WHERE "workspaceId" IS NULL;
DELETE FROM "role_card_skills" WHERE "workspaceId" IS NULL;
DELETE FROM "decision_authorities" WHERE "workspaceId" IS NULL;
DELETE FROM "decision_escalation_steps" WHERE "workspaceId" IS NULL;

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
ALTER TABLE "wiki_ai_interactions" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "wiki_page_views" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "objectives" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "goal_comments" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "goal_updates" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "project_goal_links" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "goal_stakeholders" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "goal_approvals" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "goal_progress_updates" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "goal_analytics" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "goal_recommendations" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "goal_check_ins" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "key_results" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "key_result_updates" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "chat_messages" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "onboarding_tasks" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "onboarding_task_assignments" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "task_template_items" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "workflow_assignments" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "role_card_skills" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "decision_authorities" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "decision_escalation_steps" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============================================================================
-- STEP 5: Add foreign key constraints
-- ============================================================================

ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_field_vals" ADD CONSTRAINT "custom_field_vals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_watchers" ADD CONSTRAINT "project_watchers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_assignees" ADD CONSTRAINT "project_assignees_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_documentation" ADD CONSTRAINT "project_documentation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_accountability" ADD CONSTRAINT "project_accountability_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_daily_summaries" ADD CONSTRAINT "project_daily_summaries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_field_defs" ADD CONSTRAINT "custom_field_defs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wiki_favorites" ADD CONSTRAINT "wiki_favorites_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wiki_attachments" ADD CONSTRAINT "wiki_attachments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wiki_comments" ADD CONSTRAINT "wiki_comments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wiki_versions" ADD CONSTRAINT "wiki_versions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wiki_page_permissions" ADD CONSTRAINT "wiki_page_permissions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wiki_embeds" ADD CONSTRAINT "wiki_embeds_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wiki_ai_interactions" ADD CONSTRAINT "wiki_ai_interactions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wiki_page_views" ADD CONSTRAINT "wiki_page_views_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_comments" ADD CONSTRAINT "goal_comments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_updates" ADD CONSTRAINT "goal_updates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_goal_links" ADD CONSTRAINT "project_goal_links_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_stakeholders" ADD CONSTRAINT "goal_stakeholders_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_approvals" ADD CONSTRAINT "goal_approvals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_progress_updates" ADD CONSTRAINT "goal_progress_updates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_analytics" ADD CONSTRAINT "goal_analytics_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_recommendations" ADD CONSTRAINT "goal_recommendations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_check_ins" ADD CONSTRAINT "goal_check_ins_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "key_result_updates" ADD CONSTRAINT "key_result_updates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_task_assignments" ADD CONSTRAINT "onboarding_task_assignments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_template_items" ADD CONSTRAINT "task_template_items_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_assignments" ADD CONSTRAINT "workflow_assignments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_card_skills" ADD CONSTRAINT "role_card_skills_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "decision_authorities" ADD CONSTRAINT "decision_authorities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "decision_escalation_steps" ADD CONSTRAINT "decision_escalation_steps_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
CREATE INDEX IF NOT EXISTS "objectives_workspaceId_idx" ON "objectives"("workspaceId");
CREATE INDEX IF NOT EXISTS "goal_comments_workspaceId_idx" ON "goal_comments"("workspaceId");
CREATE INDEX IF NOT EXISTS "goal_updates_workspaceId_idx" ON "goal_updates"("workspaceId");
CREATE INDEX IF NOT EXISTS "project_goal_links_workspaceId_idx" ON "project_goal_links"("workspaceId");
CREATE INDEX IF NOT EXISTS "goal_stakeholders_workspaceId_idx" ON "goal_stakeholders"("workspaceId");
CREATE INDEX IF NOT EXISTS "goal_approvals_workspaceId_idx" ON "goal_approvals"("workspaceId");
CREATE INDEX IF NOT EXISTS "goal_progress_updates_workspaceId_idx" ON "goal_progress_updates"("workspaceId");
CREATE INDEX IF NOT EXISTS "goal_analytics_workspaceId_idx" ON "goal_analytics"("workspaceId");
CREATE INDEX IF NOT EXISTS "goal_recommendations_workspaceId_idx" ON "goal_recommendations"("workspaceId");
CREATE INDEX IF NOT EXISTS "goal_check_ins_workspaceId_idx" ON "goal_check_ins"("workspaceId");
CREATE INDEX IF NOT EXISTS "key_results_workspaceId_idx" ON "key_results"("workspaceId");
CREATE INDEX IF NOT EXISTS "key_result_updates_workspaceId_idx" ON "key_result_updates"("workspaceId");
CREATE INDEX IF NOT EXISTS "chat_messages_workspaceId_idx" ON "chat_messages"("workspaceId");
CREATE INDEX IF NOT EXISTS "onboarding_tasks_workspaceId_idx" ON "onboarding_tasks"("workspaceId");
CREATE INDEX IF NOT EXISTS "onboarding_task_assignments_workspaceId_idx" ON "onboarding_task_assignments"("workspaceId");
CREATE INDEX IF NOT EXISTS "task_template_items_workspaceId_idx" ON "task_template_items"("workspaceId");
CREATE INDEX IF NOT EXISTS "workflow_assignments_workspaceId_idx" ON "workflow_assignments"("workspaceId");
CREATE INDEX IF NOT EXISTS "role_card_skills_workspaceId_idx" ON "role_card_skills"("workspaceId");
CREATE INDEX IF NOT EXISTS "decision_authorities_workspaceId_idx" ON "decision_authorities"("workspaceId");
CREATE INDEX IF NOT EXISTS "decision_escalation_steps_workspaceId_idx" ON "decision_escalation_steps"("workspaceId");

COMMIT;
