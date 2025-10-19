-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "dailySummaryEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "project_daily_summaries" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_project_daily_summary_project_date" ON "project_daily_summaries"("projectId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "project_daily_summaries_projectId_date_key" ON "project_daily_summaries"("projectId", "date");

-- AddForeignKey
ALTER TABLE "project_daily_summaries" ADD CONSTRAINT "project_daily_summaries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
