-- CreateTable
CREATE TABLE "project_documentation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_project_documentation_project" ON "project_documentation"("projectId");

-- CreateIndex
CREATE INDEX "idx_project_documentation_wiki_page" ON "project_documentation"("wikiPageId");

-- CreateIndex
CREATE UNIQUE INDEX "project_documentation_projectId_wikiPageId_key" ON "project_documentation"("projectId", "wikiPageId");

-- AddForeignKey
ALTER TABLE "project_documentation" ADD CONSTRAINT "project_documentation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documentation" ADD CONSTRAINT "project_documentation_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;


