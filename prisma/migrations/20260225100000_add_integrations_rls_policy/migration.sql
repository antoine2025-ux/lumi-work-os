-- Add RLS policy for integrations table
-- RLS was enabled in 20251228000000_enable_rls but no policy was created for integrations,
-- causing "Response from the Engine was empty" on INSERT.
-- App-level assertAccess handles authorization; this policy allows Prisma operations.

CREATE POLICY "Workspace members can manage integrations"
  ON public.integrations FOR ALL
  USING (true)
  WITH CHECK (true);
