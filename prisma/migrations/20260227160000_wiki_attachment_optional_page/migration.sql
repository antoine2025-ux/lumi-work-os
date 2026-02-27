-- AlterTable: Make WikiAttachment.pageId optional and fileUrl use TEXT for base64 support
ALTER TABLE "wiki_attachments" ALTER COLUMN "pageId" DROP NOT NULL;

-- Change fileUrl to TEXT type (PostgreSQL TEXT for long base64 data URLs)
ALTER TABLE "wiki_attachments" ALTER COLUMN "fileUrl" TYPE TEXT;

-- Add index on pageId for linking queries
CREATE INDEX IF NOT EXISTS "wiki_attachments_pageId_idx" ON "wiki_attachments"("pageId");
