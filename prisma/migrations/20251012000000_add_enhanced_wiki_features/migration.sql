-- Migration: Add enhanced wiki features
-- This migration adds new fields and tables for the enhanced wiki system
-- without breaking existing functionality

-- Add new fields to existing wiki_pages table
ALTER TABLE wiki_pages 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS workspace_type VARCHAR(50) DEFAULT 'team',
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2);

-- Create wiki_workspaces table for organization
CREATE TABLE IF NOT EXISTS wiki_workspaces (
  id VARCHAR(50) PRIMARY KEY,
  workspace_id VARCHAR(50) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'team' CHECK (type IN ('personal', 'team', 'project')),
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(50) DEFAULT 'layers',
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_by_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create wiki_page_views table for tracking views
CREATE TABLE IF NOT EXISTS wiki_page_views (
  id VARCHAR(50) PRIMARY KEY,
  page_id VARCHAR(50) NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create wiki_favorites table for bookmarks
CREATE TABLE IF NOT EXISTS wiki_favorites (
  id VARCHAR(50) PRIMARY KEY,
  page_id VARCHAR(50) NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(page_id, user_id)
);

-- Create wiki_ai_interactions table for AI usage tracking
CREATE TABLE IF NOT EXISTS wiki_ai_interactions (
  id VARCHAR(50) PRIMARY KEY,
  page_id VARCHAR(50) REFERENCES wiki_pages(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('analysis', 'generation', 'tagging', 'suggestion', 'quality_check')),
  input_data JSONB,
  output_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wiki_pages_view_count ON wiki_pages(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_featured ON wiki_pages(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_wiki_pages_workspace_type ON wiki_pages(workspace_type);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_last_viewed ON wiki_pages(last_viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_wiki_workspaces_workspace_id ON wiki_workspaces(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wiki_workspaces_type ON wiki_workspaces(type);
CREATE INDEX IF NOT EXISTS idx_wiki_workspaces_created_by ON wiki_workspaces(created_by_id);

CREATE INDEX IF NOT EXISTS idx_wiki_page_views_page_id ON wiki_page_views(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_views_user_id ON wiki_page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_views_viewed_at ON wiki_page_views(viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_wiki_favorites_user_id ON wiki_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_favorites_page_id ON wiki_favorites(page_id);

CREATE INDEX IF NOT EXISTS idx_wiki_ai_interactions_user_id ON wiki_ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_ai_interactions_page_id ON wiki_ai_interactions(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_ai_interactions_type ON wiki_ai_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_wiki_ai_interactions_created_at ON wiki_ai_interactions(created_at DESC);

-- Insert default workspaces for existing workspaces
INSERT INTO wiki_workspaces (id, workspace_id, name, type, color, icon, created_by_id)
SELECT 
  'personal-' || w.id,
  w.id,
  'Personal Space',
  'personal',
  '#10b981',
  'file-text',
  w."ownerId"
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM wiki_workspaces ww WHERE ww.workspace_id = w.id AND ww.type = 'personal'
);

INSERT INTO wiki_workspaces (id, workspace_id, name, type, color, icon, created_by_id)
SELECT 
  'team-' || w.id,
  w.id,
  'Team Workspace',
  'team',
  '#3b82f6',
  'layers',
  w."ownerId"
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM wiki_workspaces ww WHERE ww.workspace_id = w.id AND ww.type = 'team'
);

-- Update existing wiki pages with default workspace type
UPDATE wiki_pages 
SET workspace_type = 'team' 
WHERE workspace_type IS NULL;

-- Create function to update view count
CREATE OR REPLACE FUNCTION update_wiki_page_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wiki_pages 
  SET view_count = view_count + 1,
      last_viewed_at = NOW()
  WHERE id = NEW.page_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for view count updates
DROP TRIGGER IF EXISTS trigger_update_wiki_page_view_count ON wiki_page_views;
CREATE TRIGGER trigger_update_wiki_page_view_count
  AFTER INSERT ON wiki_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_wiki_page_view_count();

-- Create function to update workspace page counts
CREATE OR REPLACE FUNCTION update_workspace_page_count()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be implemented to update workspace page counts
  -- For now, we'll leave it as a placeholder
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comments to tables for documentation
COMMENT ON TABLE wiki_workspaces IS 'Organizational workspaces for wiki pages (personal, team, project)';
COMMENT ON TABLE wiki_page_views IS 'Tracks page views for analytics and recent pages';
COMMENT ON TABLE wiki_favorites IS 'User bookmarks for wiki pages';
COMMENT ON TABLE wiki_ai_interactions IS 'Tracks AI interactions for analytics and improvement';

COMMENT ON COLUMN wiki_pages.view_count IS 'Number of times this page has been viewed';
COMMENT ON COLUMN wiki_pages.is_featured IS 'Whether this page is featured/promoted';
COMMENT ON COLUMN wiki_pages.workspace_type IS 'Type of workspace this page belongs to';
COMMENT ON COLUMN wiki_pages.last_viewed_at IS 'When this page was last viewed';
COMMENT ON COLUMN wiki_pages.ai_analysis IS 'AI analysis results stored as JSON';
COMMENT ON COLUMN wiki_pages.quality_score IS 'AI-generated quality score (0.00-1.00)';
