-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "draftBody" TEXT,
ADD COLUMN     "draftFormat" TEXT NOT NULL DEFAULT 'markdown',
ADD COLUMN     "draftTitle" TEXT,
ADD COLUMN     "intent" TEXT NOT NULL DEFAULT 'assist',
ADD COLUMN     "pageSettings" JSONB,
ADD COLUMN     "phase" TEXT NOT NULL DEFAULT 'idle',
ADD COLUMN     "requirementNotes" JSONB,
ADD COLUMN     "target" TEXT NOT NULL DEFAULT 'wiki_page',
ADD COLUMN     "wikiUrl" TEXT;
