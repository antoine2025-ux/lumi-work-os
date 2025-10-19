-- CreateTable
CREATE TABLE "wiki_embeds" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT,
    "resourceId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "thumbnail" TEXT,
    "metadata" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wiki_embeds_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "wiki_embeds" ADD CONSTRAINT "wiki_embeds_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
