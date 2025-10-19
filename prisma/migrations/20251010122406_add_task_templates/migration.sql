-- CreateEnum
CREATE TYPE "TaskTemplateCategory" AS ENUM ('SOFTWARE_DEVELOPMENT', 'MARKETING_CAMPAIGN', 'EVENT_PLANNING', 'PRODUCT_LAUNCH', 'GENERAL');

-- CreateTable
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TaskTemplateCategory" NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_template_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedDuration" INTEGER,
    "assigneeRole" TEXT,
    "tags" TEXT[],
    "dependencies" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "task_template_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_template_items" ADD CONSTRAINT "task_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "task_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
