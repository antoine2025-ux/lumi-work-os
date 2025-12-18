-- Create ContentFormat enum
CREATE TYPE "ContentFormat" AS ENUM ('HTML', 'JSON');

-- AlterTable: Add contentJson, contentFormat, and textContent to wiki_pages
ALTER TABLE "wiki_pages" 
  ADD COLUMN "contentJson" JSONB,
  ADD COLUMN "contentFormat" "ContentFormat" NOT NULL DEFAULT 'HTML',
  ADD COLUMN "textContent" TEXT;

-- AlterTable: Add contentJson, contentFormat, and textContent to wiki_versions
ALTER TABLE "wiki_versions" 
  ADD COLUMN "contentJson" JSONB,
  ADD COLUMN "contentFormat" "ContentFormat" NOT NULL DEFAULT 'HTML',
  ADD COLUMN "textContent" TEXT;

-- Set default contentFormat to HTML for all existing rows (defensive, but DEFAULT should handle this)
-- Safety: Update any NULL values before enforcing NOT NULL (for environments where migration ran partially)
UPDATE "wiki_pages" SET "contentFormat" = 'HTML' WHERE "contentFormat" IS NULL;
UPDATE "wiki_versions" SET "contentFormat" = 'HTML' WHERE "contentFormat" IS NULL;

