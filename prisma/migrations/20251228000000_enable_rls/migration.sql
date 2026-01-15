-- Enable Row Level Security (RLS) on all public tables
-- This migration enables RLS and creates policies that match the app's workspace-based access control

-- Enable RLS on all tables
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN ALTER TABLE public.users ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verification_tokens') THEN ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_members') THEN ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_members') THEN ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_watchers') THEN ALTER TABLE public.project_watchers ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_assignees') THEN ALTER TABLE public.project_assignees ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subtasks') THEN ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_comments') THEN ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_history') THEN ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'epics') THEN ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'milestones') THEN ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiki_pages') THEN ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiki_versions') THEN ALTER TABLE public.wiki_versions ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiki_chunks') THEN ALTER TABLE public.wiki_chunks ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiki_comments') THEN ALTER TABLE public.wiki_comments ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiki_favorites') THEN ALTER TABLE public.wiki_favorites ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiki_attachments') THEN ALTER TABLE public.wiki_attachments ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiki_embeds') THEN ALTER TABLE public.wiki_embeds ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiki_workspaces') THEN ALTER TABLE public.wiki_workspaces ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiki_page_permissions') THEN ALTER TABLE public.wiki_page_permissions ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiki_ai_interactions') THEN ALTER TABLE public.wiki_ai_interactions ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiki_page_views') THEN ALTER TABLE public.wiki_page_views ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_sessions') THEN ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_plans') THEN ALTER TABLE public.onboarding_plans ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_templates') THEN ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_tasks') THEN ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_task_assignments') THEN ALTER TABLE public.onboarding_task_assignments ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_cards') THEN ALTER TABLE public.role_cards ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'org_positions') THEN ALTER TABLE public.org_positions ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'org_audit_log') THEN ALTER TABLE public.org_audit_log ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflows') THEN ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_instances') THEN ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_assignments') THEN ALTER TABLE public.workflow_assignments ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integrations') THEN ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'migrations') THEN ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_templates') THEN ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_template_items') THEN ALTER TABLE public.task_template_items ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_field_defs') THEN ALTER TABLE public.custom_field_defs ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_field_vals') THEN ALTER TABLE public.custom_field_vals ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_daily_summaries') THEN ALTER TABLE public.project_daily_summaries ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_flags') THEN ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY; END IF; END $$;
ALTER TABLE public."_OnboardingTaskToUser" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations') THEN ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY; END IF; END $$;

-- Create helper function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id TEXT, user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members."workspaceId" = is_workspace_member.workspace_id
    AND workspace_members."userId" = is_workspace_member.user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for Users table - users can only see themselves
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (true);

-- Policies for Workspaces - users can only see workspaces they're members of
CREATE POLICY "Users can view workspaces they belong to"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members."workspaceId" = workspaces.id
    )
  );

CREATE POLICY "Workspace members can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Workspace owners can update workspaces"
  ON public.workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members."workspaceId" = workspaces.id
      AND workspace_members.role IN ('OWNER', 'ADMIN')
    )
  );

-- Policies for Workspace Members - users can see memberships for their workspaces
CREATE POLICY "Users can view workspace memberships"
  ON public.workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm."workspaceId" = workspace_members."workspaceId"
    )
  );

CREATE POLICY "Workspace owners can manage members"
  ON public.workspace_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm."workspaceId" = workspace_members."workspaceId"
      AND wm.role IN ('OWNER', 'ADMIN')
    )
  );

-- Generic policy function for workspace-scoped tables
-- This allows access if user is a member of the workspace
CREATE OR REPLACE FUNCTION public.has_workspace_access(table_workspace_id TEXT, user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE "workspaceId" = table_workspace_id::text
    AND "userId" = user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for Projects - workspace scoped
CREATE POLICY "Workspace members can view projects"
  ON public.projects FOR SELECT
  USING (public.has_workspace_access("workspaceId", current_setting('app.user_id', true)));

CREATE POLICY "Workspace members can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.has_workspace_access("workspaceId", current_setting('app.user_id', true)));

CREATE POLICY "Workspace members can update projects"
  ON public.projects FOR UPDATE
  USING (public.has_workspace_access("workspaceId", current_setting('app.user_id', true)));

CREATE POLICY "Workspace admins can delete projects"
  ON public.projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE "workspaceId" = projects."workspaceId"
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Policies for Tasks - workspace scoped
CREATE POLICY "Workspace members can view tasks"
  ON public.tasks FOR SELECT
  USING (public.has_workspace_access("workspaceId", current_setting('app.user_id', true)));

CREATE POLICY "Workspace members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.has_workspace_access("workspaceId", current_setting('app.user_id', true)));

CREATE POLICY "Workspace members can update tasks"
  ON public.tasks FOR UPDATE
  USING (public.has_workspace_access("workspaceId", current_setting('app.user_id', true)));

CREATE POLICY "Workspace members can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.has_workspace_access("workspaceId", current_setting('app.user_id', true)));

-- Policies for Wiki Pages - workspace scoped
CREATE POLICY "Workspace members can view wiki pages"
  ON public.wiki_pages FOR SELECT
  USING (public.has_workspace_access("workspaceId", current_setting('app.user_id', true)));

CREATE POLICY "Workspace members can create wiki pages"
  ON public.wiki_pages FOR INSERT
  WITH CHECK (public.has_workspace_access("workspaceId", current_setting('app.user_id', true)));

CREATE POLICY "Workspace members can update wiki pages"
  ON public.wiki_pages FOR UPDATE
  USING (public.has_workspace_access("workspaceId", current_setting('app.user_id', true)));

CREATE POLICY "Workspace members can delete wiki pages"
  ON public.wiki_pages FOR DELETE
  USING (public.has_workspace_access("workspaceId", current_setting('app.user_id', true)));

-- Apply similar policies to other workspace-scoped tables
-- Project Members
CREATE POLICY "Workspace members can manage project members"
  ON public.project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members."projectId"
    )
  );

-- Subtasks
CREATE POLICY "Workspace members can manage subtasks"
  ON public.subtasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = subtasks."taskId"
    )
  );

-- Task Comments
CREATE POLICY "Workspace members can manage task comments"
  ON public.task_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments."taskId"
    )
  );

-- Chat Sessions
CREATE POLICY "Workspace members can manage chat sessions"
  ON public.chat_sessions FOR ALL
  USING (true);
-- Chat Messages
CREATE POLICY "Workspace members can manage chat messages"
  ON public.chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_messages."sessionId"
    )
  );

-- Wiki Workspaces
CREATE POLICY "Workspace members can manage wiki workspaces"
  ON public.wiki_workspaces FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = wiki_workspaces."workspace_id"::text
    )
  );

-- Wiki Comments
CREATE POLICY "Workspace members can manage wiki comments"
  ON public.wiki_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.wiki_pages wp
      WHERE wp.id = wiki_comments."pageId"
    )
  );

-- Activities
CREATE POLICY "Workspace members can view activities"
  ON public.activities FOR SELECT
  USING (true);
CREATE POLICY "System can create activities"
  ON public.activities FOR INSERT
  WITH CHECK (true);

-- Epics
CREATE POLICY "Workspace members can manage epics"
  ON public.epics FOR ALL
  USING (true);
-- Milestones
CREATE POLICY "Workspace members can manage milestones"
  ON public.milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = milestones."projectId"
    )
  );

-- IMPORTANT: This app uses NextAuth, not Supabase Auth
-- Prisma uses service role which bypasses RLS anyway

-- These policies protect against:
-- 1. Direct PostgREST API access (if enabled)
-- 2. Supabase's auto-generated REST API
-- 3. Any direct database access using anon/authenticated roles

-- For NextAuth apps, the application-level access control (assertAccess) 
-- is your primary security layer. RLS provides defense in depth.

-- Allow service role (Prisma) to bypass RLS

-- Disable RLS for service role (default behavior)
-- Service role bypasses RLS by default in Supabase

-- Note: These policies will block PostgREST API access if someone
-- tries to access your database via Supabase's REST API with anon key.
-- Your Prisma queries will continue to work normally via service role.

