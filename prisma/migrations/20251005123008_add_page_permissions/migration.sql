-- AlterTable
ALTER TABLE "wiki_pages" ADD COLUMN     "permissionLevel" TEXT NOT NULL DEFAULT 'team';

-- CreateTable
CREATE TABLE "wiki_page_permissions" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "WorkspaceRole",
    "permission" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wiki_page_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wiki_page_permissions_pageId_userId_permission_key" ON "wiki_page_permissions"("pageId", "userId", "permission");

-- AddForeignKey
ALTER TABLE "wiki_page_permissions" ADD CONSTRAINT "wiki_page_permissions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_page_permissions" ADD CONSTRAINT "wiki_page_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
