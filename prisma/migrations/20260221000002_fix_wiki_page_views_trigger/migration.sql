-- Fix: trigger_update_wiki_page_view_count was mistakenly attached to
-- wiki_workspaces instead of wiki_page_views in migration
-- 20251012000000_add_enhanced_wiki_features.
--
-- The trigger function calls NEW.page_id, which does not exist on
-- wiki_workspaces. Any INSERT into wiki_workspaces therefore raises:
--   record "new" has no field "page_id"
-- which Prisma surfaces as: "The column new does not exist in the current database."
--
-- Fix: drop the misplaced trigger, recreate it on the correct table.

-- 1. Drop the misplaced trigger from wiki_workspaces (idempotent)
DROP TRIGGER IF EXISTS trigger_update_wiki_page_view_count ON wiki_workspaces;

-- 2. Recreate on the correct table (wiki_page_views) — also drop first to be idempotent
DROP TRIGGER IF EXISTS trigger_update_wiki_page_view_count ON wiki_page_views;
CREATE TRIGGER trigger_update_wiki_page_view_count
  AFTER INSERT ON wiki_page_views
  FOR EACH ROW
  EXECUTE FUNCTION update_wiki_page_view_count();
