-- Enable Row Level Security (RLS) on all public tables
-- This migration enables RLS and creates policies that match the app's workspace-based access control

-- Enable RLS on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_embeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_vals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_OnboardingTaskToUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;

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
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid()::text = id);

-- Policies for Workspaces - users can only see workspaces they're members of
CREATE POLICY "Users can view workspaces they belong to"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members."workspaceId" = workspaces.id
      AND workspace_members."userId" = auth.uid()::text
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
      AND workspace_members."userId" = auth.uid()::text
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
      AND wm."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Workspace owners can manage members"
  ON public.workspace_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm."workspaceId" = workspace_members."workspaceId"
      AND wm."userId" = auth.uid()::text
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
  USING (public.has_workspace_access("workspaceId", auth.uid()::text));

CREATE POLICY "Workspace members can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.has_workspace_access("workspaceId", auth.uid()::text));

CREATE POLICY "Workspace members can update projects"
  ON public.projects FOR UPDATE
  USING (public.has_workspace_access("workspaceId", auth.uid()::text));

CREATE POLICY "Workspace admins can delete projects"
  ON public.projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE "workspaceId" = projects."workspaceId"
      AND "userId" = auth.uid()::text
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Policies for Tasks - workspace scoped
CREATE POLICY "Workspace members can view tasks"
  ON public.tasks FOR SELECT
  USING (public.has_workspace_access("workspaceId", auth.uid()::text));

CREATE POLICY "Workspace members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.has_workspace_access("workspaceId", auth.uid()::text));

CREATE POLICY "Workspace members can update tasks"
  ON public.tasks FOR UPDATE
  USING (public.has_workspace_access("workspaceId", auth.uid()::text));

CREATE POLICY "Workspace members can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.has_workspace_access("workspaceId", auth.uid()::text));

-- Policies for Wiki Pages - workspace scoped
CREATE POLICY "Workspace members can view wiki pages"
  ON public.wiki_pages FOR SELECT
  USING (public.has_workspace_access("workspaceId", auth.uid()::text));

CREATE POLICY "Workspace members can create wiki pages"
  ON public.wiki_pages FOR INSERT
  WITH CHECK (public.has_workspace_access("workspaceId", auth.uid()::text));

CREATE POLICY "Workspace members can update wiki pages"
  ON public.wiki_pages FOR UPDATE
  USING (public.has_workspace_access("workspaceId", auth.uid()::text));

CREATE POLICY "Workspace members can delete wiki pages"
  ON public.wiki_pages FOR DELETE
  USING (public.has_workspace_access("workspaceId", auth.uid()::text));

-- Apply similar policies to other workspace-scoped tables
-- Project Members
CREATE POLICY "Workspace members can manage project members"
  ON public.project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members."projectId"
      AND public.has_workspace_access(p."workspaceId", auth.uid()::text)
    )
  );

-- Subtasks
CREATE POLICY "Workspace members can manage subtasks"
  ON public.subtasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = subtasks."taskId"
      AND public.has_workspace_access(t."workspaceId", auth.uid()::text)
    )
  );

-- Task Comments
CREATE POLICY "Workspace members can manage task comments"
  ON public.task_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments."taskId"
      AND public.has_workspace_access(t."workspaceId", auth.uid()::text)
    )
  );

-- Chat Sessions
CREATE POLICY "Workspace members can manage chat sessions"
  ON public.chat_sessions FOR ALL
  USING (public.has_workspace_access("workspaceId", auth.uid()::text));

-- Chat Messages
CREATE POLICY "Workspace members can manage chat messages"
  ON public.chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_messages."sessionId"
      AND public.has_workspace_access(cs."workspaceId", auth.uid()::text)
    )
  );

-- Wiki Workspaces
CREATE POLICY "Workspace members can manage wiki workspaces"
  ON public.wiki_workspaces FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = wiki_workspaces."workspace_id"::text
      AND public.has_workspace_access(w.id, auth.uid()::text)
    )
  );

-- Wiki Comments
CREATE POLICY "Workspace members can manage wiki comments"
  ON public.wiki_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.wiki_pages wp
      WHERE wp.id = wiki_comments."pageId"
      AND public.has_workspace_access(wp."workspaceId", auth.uid()::text)
    )
  );

-- Activities
CREATE POLICY "Workspace members can view activities"
  ON public.activities FOR SELECT
  USING (public.has_workspace_access("workspaceId", auth.uid()::text));

CREATE POLICY "System can create activities"
  ON public.activities FOR INSERT
  WITH CHECK (true);

-- Epics
CREATE POLICY "Workspace members can manage epics"
  ON public.epics FOR ALL
  USING (public.has_workspace_access("workspaceId", auth.uid()::text));

-- Milestones
CREATE POLICY "Workspace members can manage milestones"
  ON public.milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = milestones."projectId"
      AND public.has_workspace_access(p."workspaceId", auth.uid()::text)
    )
  );

-- IMPORTANT: This app uses NextAuth, not Supabase Auth
-- Therefore, RLS policies using auth.uid() won't work for application queries
-- Prisma uses service role which bypasses RLS anyway

-- These policies protect against:
-- 1. Direct PostgREST API access (if enabled)
-- 2. Supabase's auto-generated REST API
-- 3. Any direct database access using anon/authenticated roles

-- For NextAuth apps, the application-level access control (assertAccess) 
-- is your primary security layer. RLS provides defense in depth.

-- Allow service role (Prisma) to bypass RLS
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Disable RLS for service role (default behavior)
-- Service role bypasses RLS by default in Supabase

-- Note: These policies will block PostgREST API access if someone
-- tries to access your database via Supabase's REST API with anon key.
-- Your Prisma queries will continue to work normally via service role.

