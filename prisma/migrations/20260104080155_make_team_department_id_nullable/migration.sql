-- DropIndex
DROP INDEX "public"."org_teams_workspaceId_departmentId_name_key";

-- AlterTable
ALTER TABLE "org_teams" ALTER COLUMN "departmentId" DROP NOT NULL;
