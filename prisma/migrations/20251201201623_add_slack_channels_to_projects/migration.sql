-- AlterTable
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "slackChannels" TEXT[] DEFAULT ARRAY[]::TEXT[];

