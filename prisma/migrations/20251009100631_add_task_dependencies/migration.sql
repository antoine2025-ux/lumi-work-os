-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "blocks" TEXT[],
ADD COLUMN     "dependsOn" TEXT[];
