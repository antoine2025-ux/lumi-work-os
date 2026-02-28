-- CreateTable
CREATE TABLE IF NOT EXISTS "task_wiki_links" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_wiki_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "task_wiki_links_taskId_idx" ON "task_wiki_links"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "task_wiki_links_wikiPageId_idx" ON "task_wiki_links"("wikiPageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "task_wiki_links_workspaceId_idx" ON "task_wiki_links"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "task_wiki_links_taskId_wikiPageId_key" ON "task_wiki_links"("taskId", "wikiPageId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'task_wiki_links_taskId_fkey'
    ) THEN
        ALTER TABLE "task_wiki_links" ADD CONSTRAINT "task_wiki_links_taskId_fkey" 
        FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'task_wiki_links_wikiPageId_fkey'
    ) THEN
        ALTER TABLE "task_wiki_links" ADD CONSTRAINT "task_wiki_links_wikiPageId_fkey" 
        FOREIGN KEY ("wikiPageId") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'task_wiki_links_workspaceId_fkey'
    ) THEN
        ALTER TABLE "task_wiki_links" ADD CONSTRAINT "task_wiki_links_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
